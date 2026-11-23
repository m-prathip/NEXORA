const crypto = require('crypto');

/**
 * AES-256-GCM URL Encryption & Decryption Utility
 * 
 * Cryptographic Standard: NIST SP 800-38D
 * Algorithm: AES-256-GCM (Authenticated Encryption with Associated Data)
 * Key Length: 32 bytes (256 bits)
 * IV Length: 12 bytes (96 bits) - Unique per encryption operation
 * Auth Tag: 16 bytes (128 bits) - Integrity and authenticity verification
 * Encoding: RFC 4648 §5 base64url (URL-safe without escaping)
 */

const DEFAULT_KEY_ID = 'v1';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

// Helper: base64url encoding / decoding (RFC 4648 §5)
const base64UrlEncode = (buffer) => {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const base64UrlDecode = (str) => {
  if (typeof str !== 'string') throw new TypeError('Input must be a string');
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
};

// Parse a key from Hex, Base64, or utf-8 string ensuring strict 32 bytes
const parseKey = (rawKey, fallbackSeed = 'nexora_secure_route_seed_fallback') => {
  if (!rawKey) {
    // Generate deterministic 32-byte key from fallback seed in dev/test if env is absent
    return crypto.createHash('sha256').update(fallbackSeed).digest();
  }

  if (Buffer.isBuffer(rawKey)) {
    if (rawKey.length === 32) return rawKey;
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  const trimmed = String(rawKey).trim();
  // Check if hex (64 hex characters = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // Check if base64 (44 characters with padding or 43 without)
  try {
    const b64 = Buffer.from(trimmed, 'base64');
    if (b64.length === 32) return b64;
  } catch {
    // continue
  }

  // Otherwise hash to produce a uniform 256-bit key
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
};

// Build Key Ring supporting Key Rotation
const getKeyRing = () => {
  const primaryKey = parseKey(
    process.env.ROUTE_ENCRYPTION_KEY,
    'nexora_primary_route_encryption_key_v1'
  );

  const fallbackKey = parseKey(
    process.env.ROUTE_ENCRYPTION_KEY_FALLBACK,
    'nexora_fallback_route_encryption_key_v2'
  );

  return {
    v1: primaryKey,
    v2: fallbackKey
  };
};

/**
 * SHA-256 hash helper for database storage and token lookup
 * Prevents storing raw token strings or plain payloads in MongoDB
 */
const hashToken = (tokenString) => {
  if (!tokenString || typeof tokenString !== 'string') {
    throw new Error('Token string is required for hashing');
  }
  return crypto.createHash('sha256').update(tokenString, 'utf8').digest('hex');
};

/**
 * Generate a cryptographically secure UUIDv4 for token jti
 */
const generateTokenId = () => crypto.randomUUID();

/**
 * Encrypt a route payload into a secure URL token
 * 
 * @param {Object} payload Minimal routing info ({ rid, res, pur, uid, etc. })
 * @param {Object} options Configuration options ({ ttlSeconds, keyId, keyRing })
 * @returns {string} Encrypted URL-safe token: <kid>.<iv>.<tag>.<ciphertext>
 */
const encryptRoute = (payload = {}, options = {}) => {
  if (!payload.rid || typeof payload.rid !== 'string') {
    throw new Error('payload.rid (Route Identifier) is required');
  }

  const keyId = options.keyId || process.env.ACTIVE_KEY_ID || DEFAULT_KEY_ID;
  const keyRing = options.keyRing || getKeyRing();
  const key = keyRing[keyId];

  if (!key) {
    throw new Error(`Encryption key with ID "${keyId}" not found in key ring`);
  }

  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(options.ttlSeconds) || DEFAULT_TTL_SECONDS;

  // Minimal sanitized payload
  const sanitizedPayload = {
    rid: String(payload.rid),
    res: payload.res ? String(payload.res) : undefined,
    pur: payload.pur ? String(payload.pur) : 'NAV',
    iat: payload.iat || now,
    exp: payload.exp || (now + ttl),
    jti: payload.jti || generateTokenId(),
    uid: payload.uid ? String(payload.uid) : undefined
  };

  const plaintext = JSON.stringify(sanitizedPayload);

  // Generate unique 12-byte IV for every encryption operation
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create AES-256-GCM cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Additional Authenticated Data (AAD): bind keyId to prevent cross-version ciphertext substitution
  cipher.setAAD(Buffer.from(keyId, 'utf8'));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Failed to generate valid GCM authentication tag');
  }

  // Format: <kid>.<base64url(iv)>.<base64url(tag)>.<base64url(ciphertext)>
  return `${keyId}.${base64UrlEncode(iv)}.${base64UrlEncode(authTag)}.${base64UrlEncode(ciphertext)}`;
};

/**
 * Decrypt a route token and verify integrity and authentication tag
 * 
 * @param {string} tokenString Formatted token <kid>.<iv>.<tag>.<ciphertext>
 * @param {Object} options Custom options ({ keyRing })
 * @returns {Object} Decrypted payload
 */
const decryptRoute = (tokenString, options = {}) => {
  if (!tokenString || typeof tokenString !== 'string') {
    throw new Error('Invalid token: token must be a non-empty string');
  }

  const parts = tokenString.split('.');
  if (parts.length !== 4) {
    throw new Error('Invalid token structure: expected 4 segments (<kid>.<iv>.<tag>.<ciphertext>)');
  }

  const [keyId, ivB64, tagB64, cipherB64] = parts;

  const keyRing = options.keyRing || getKeyRing();
  const key = keyRing[keyId];

  if (!key) {
    throw new Error(`Invalid token: unknown or expired key version "${keyId}"`);
  }

  let iv, authTag, ciphertext;
  try {
    iv = base64UrlDecode(ivB64);
    authTag = base64UrlDecode(tagB64);
    ciphertext = base64UrlDecode(cipherB64);
  } catch (err) {
    throw new Error('Invalid token: corrupted Base64URL encoding');
  }

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid token: invalid IV length');
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid token: invalid authentication tag length');
  }

  // Decipher with AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

  // Set auth tag before calling final()
  decipher.setAuthTag(authTag);

  // Set AAD matching the encryption step
  decipher.setAAD(Buffer.from(keyId, 'utf8'));

  let decryptedPlaintext;
  try {
    decryptedPlaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final() // Verifies auth tag; throws if tag or ciphertext was modified
    ]).toString('utf8');
  } catch (err) {
    throw new Error('Authentication tag verification failed: token has been tampered with or corrupted');
  }

  let payload;
  try {
    payload = JSON.parse(decryptedPlaintext);
  } catch (err) {
    throw new Error('Invalid token: payload is not valid JSON');
  }

  return payload;
};

/**
 * Validate a route token including cryptographic integrity, expiration, and purpose
 * 
 * @param {string} tokenString
 * @param {Object} options { expectedPurpose, expectedUser, enforceExpiry }
 * @returns {Object} { isValid: boolean, payload?: Object, error?: string, code?: string }
 */
const validateRouteToken = (tokenString, options = {}) => {
  const { expectedPurpose, expectedUser, enforceExpiry = true, keyRing } = options;

  let payload;
  try {
    payload = decryptRoute(tokenString, { keyRing });
  } catch (err) {
    return {
      isValid: false,
      error: err.message,
      code: 'INVALID_TOKEN'
    };
  }

  const now = Math.floor(Date.now() / 1000);

  // Expiration verification
  if (enforceExpiry && payload.exp && payload.exp < now) {
    return {
      isValid: false,
      payload,
      error: 'Token has expired',
      code: 'TOKEN_EXPIRED'
    };
  }

  // Purpose verification
  if (expectedPurpose && payload.pur !== expectedPurpose) {
    return {
      isValid: false,
      payload,
      error: `Invalid token purpose: expected "${expectedPurpose}", got "${payload.pur}"`,
      code: 'INVALID_PURPOSE'
    };
  }

  // User binding verification (if token was locked to a specific user)
  if (expectedUser && payload.uid && String(payload.uid) !== String(expectedUser)) {
    return {
      isValid: false,
      payload,
      error: 'Token user mismatch: token was issued to a different user',
      code: 'USER_MISMATCH'
    };
  }

  return {
    isValid: true,
    payload
  };
};

module.exports = {
  encryptRoute,
  decryptRoute,
  validateRouteToken,
  hashToken,
  generateTokenId,
  parseKey,
  getKeyRing,
  base64UrlEncode,
  base64UrlDecode
};
