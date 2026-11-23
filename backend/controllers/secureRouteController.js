const mongoose = require('mongoose');
const {
  encryptRoute,
  decryptRoute,
  validateRouteToken,
  hashToken,
  generateTokenId
} = require('../utils/urlCrypto');
const RouteToken = require('../models/RouteToken');
const AuditLog = require('../models/AuditLog');
const securityLogger = require('../utils/securityLogger');
const Projects = require('../models/Projects');

// Role Hierarchy Level Constants
const ROLE_HIERARCHY = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4
};

// Registered Sensitive Route Specifications
const ROUTE_REGISTRY = {
  // ── Platform Administration
  'admin_overview': {
    targetPath: '/admin',
    minRole: 'MODERATOR',
    title: 'Platform Command Center Overview',
    module: 'platformAdmin'
  },
  'admin_users': {
    targetPath: '/admin/users',
    minRole: 'MODERATOR',
    title: 'User Management & Access Control',
    module: 'platformAdmin'
  },
  'admin_posts': {
    targetPath: '/admin/posts',
    minRole: 'MODERATOR',
    title: 'Post Moderation',
    module: 'platformAdmin'
  },
  'admin_communities': {
    targetPath: '/admin/communities',
    minRole: 'MODERATOR',
    title: 'Community Moderation',
    module: 'platformAdmin'
  },
  'admin_reports': {
    targetPath: '/admin/reports',
    minRole: 'MODERATOR',
    title: 'Trust & Safety Reports',
    module: 'platformAdmin'
  },
  'admin_opportunities': {
    targetPath: '/admin/opportunities',
    minRole: 'MODERATOR',
    title: 'Opportunities Moderation',
    module: 'platformAdmin'
  },
  'admin_analytics': {
    targetPath: '/admin/analytics',
    minRole: 'MODERATOR',
    title: 'Platform Analytics',
    module: 'platformAdmin'
  },
  'admin_audit_logs': {
    targetPath: '/admin/audit-logs',
    minRole: 'ADMIN',
    title: 'Platform Audit Logs',
    module: 'platformAdmin'
  },
  'admin_settings': {
    targetPath: '/admin/settings',
    minRole: 'ADMIN',
    title: 'Platform System Settings',
    module: 'platformAdmin'
  },

  // ── User Settings & Private CMS
  'user_settings': {
    targetPath: '/settings',
    minRole: 'USER',
    title: 'Account & Privacy Settings',
    module: 'settings',
    requiresOwnership: true
  },
  'user_dashboard': {
    targetPath: '/:dashboardId/profile',
    minRole: 'USER',
    title: 'User Portfolio CMS',
    module: 'dashboardCMS',
    requiresOwnership: true
  },

  // ── Private Projects & Collaborations
  'project_hub': {
    targetPath: '/collaborations',
    minRole: 'USER',
    title: 'Project Collaborations Hub',
    module: 'collaborations'
  },
  'private_project': {
    targetPath: '/projects',
    minRole: 'USER',
    title: 'Private Project Workspace',
    module: 'projects',
    requiresResourceAccess: true
  },
  'vault_documents': {
    targetPath: '/vault/documents',
    minRole: 'USER',
    title: 'Confidential Documents Vault',
    module: 'vault',
    requiresResourceAccess: true
  }
};

/**
 * Apply secure headers (no-store, no-referrer)
 */
const setSecureHeaders = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Referrer-Policy', 'no-referrer');
};

/**
 * Helper to record security audit logs asynchronously
 */
const recordAudit = async ({ actor, actorRole, action, targetResource, targetId, metadata, reason, ip, userAgent }) => {
  try {
    if (actor && actorRole) {
      await AuditLog.create({
        actor,
        actorRole,
        action,
        targetResource: targetResource || 'SecureRoute',
        targetId: targetId && mongoose.Types.ObjectId.isValid(targetId) ? targetId : undefined,
        metadata: metadata || {},
        reason: reason || action,
        ip,
        userAgent
      });
    }
  } catch (err) {
    // Fail silently in audit creation so client requests don't drop on audit storage errors
    console.error('AuditLog creation warning:', err.message);
  }
};

/**
 * Decrypt and validate an encrypted route token
 * POST /api/secure-routes/decrypt
 */
const decryptAndValidateRoute = async (req, res) => {
  setSecureHeaders(res);

  const { encryptedToken } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];

  if (!encryptedToken || typeof encryptedToken !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Encrypted route token is required'
    });
  }

  // 1. Cryptographic validation & decryption
  let payload;
  try {
    payload = decryptRoute(encryptedToken);
  } catch (err) {
    securityLogger.suspiciousActivity({
      type: 'INVALID_ENCRYPTED_ROUTE_TOKEN',
      ip,
      path: req.originalUrl,
      userAgent,
      details: err.message
    });

    await recordAudit({
      actor: req.user?._id,
      actorRole: req.user?.role || 'ANONYMOUS',
      action: 'ROUTE_TOKEN_DECRYPT_FAILURE',
      targetResource: 'EncryptedRoute',
      reason: err.message,
      metadata: { error: err.message },
      ip,
      userAgent
    });

    return res.status(400).json({
      success: false,
      code: 'INVALID_OR_TAMPERED_TOKEN',
      message: 'Invalid or tampered route token'
    });
  }

  // 2. Validate Expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return res.status(410).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      message: 'This secure link has expired'
    });
  }

  // 3. Lookup Route Specification in Registry
  const routeSpec = ROUTE_REGISTRY[payload.rid];
  if (!routeSpec) {
    return res.status(404).json({
      success: false,
      code: 'UNKNOWN_ROUTE',
      message: 'Requested secure route definition was not found'
    });
  }

  // 4. Check Database Revocation & Replay Status
  const tokenHash = hashToken(encryptedToken);
  const storedToken = await RouteToken.findOne({ tokenHash });

  if (storedToken) {
    // Check Revocation
    if (storedToken.isRevoked) {
      await recordAudit({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'REVOKED_TOKEN_ACCESS_ATTEMPT',
        targetResource: routeSpec.module,
        reason: 'Attempted to access route using revoked token',
        metadata: { routeId: payload.rid, jti: payload.jti },
        ip,
        userAgent
      });

      return res.status(403).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'This secure link has been revoked and is no longer valid'
      });
    }

    // Check Single-Use Replay Protection
    if (storedToken.isSingleUse) {
      if (storedToken.isConsumed) {
        await recordAudit({
          actor: req.user._id,
          actorRole: req.user.role,
          action: 'REPLAY_TOKEN_ATTEMPT',
          targetResource: routeSpec.module,
          reason: 'Single-use token reuse attempt blocked',
          metadata: { routeId: payload.rid, jti: payload.jti },
          ip,
          userAgent
        });

        return res.status(410).json({
          success: false,
          code: 'TOKEN_ALREADY_USED',
          message: 'This single-use link has already been used and cannot be replayed'
        });
      }

      // Atomically mark single-use token as consumed
      storedToken.isConsumed = true;
      storedToken.consumedAt = new Date();
      storedToken.consumedByIp = ip;
      await storedToken.save();
    }
  }

  // 5. Server-Side Role-Based Access Control (RBAC)
  const userRole = (req.user.role || 'USER').toUpperCase();
  const userLevel = ROLE_HIERARCHY[userRole] || 1;
  const minRequiredLevel = ROLE_HIERARCHY[routeSpec.minRole] || 1;

  if (userLevel < minRequiredLevel) {
    await recordAudit({
      actor: req.user._id,
      actorRole: userRole,
      action: 'UNAUTHORIZED_ROUTE_ACCESS_BLOCKED',
      targetResource: routeSpec.module,
      reason: `User role ${userRole} is insufficient for ${routeSpec.minRole}`,
      metadata: { routeId: payload.rid, requiredRole: routeSpec.minRole },
      ip,
      userAgent
    });

    return res.status(403).json({
      success: false,
      code: 'INSUFFICIENT_PRIVILEGES',
      message: 'Access denied: You do not have permission to view this route'
    });
  }

  // 6. Server-Side Resource Ownership / Isolation Check
  if (routeSpec.requiresOwnership) {
    if (payload.uid && String(payload.uid) !== String(req.user.id) && userLevel < ROLE_HIERARCHY.ADMIN) {
      await recordAudit({
        actor: req.user._id,
        actorRole: userRole,
        action: 'IDOR_PREVENTED',
        targetResource: routeSpec.module,
        reason: 'User attempted to access another user private dashboard/settings',
        metadata: { tokenUid: payload.uid, reqUid: req.user.id },
        ip,
        userAgent
      });

      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_RESOURCE',
        message: 'Access denied: You do not own this resource'
      });
    }
  }

  // If resource ID is bound to a project, verify project access
  if (routeSpec.requiresResourceAccess && payload.res) {
    try {
      if (mongoose.Types.ObjectId.isValid(payload.res)) {
        const project = await Projects.findById(payload.res).select('user title');
        if (project && project.user && String(project.user) !== String(req.user.id) && userLevel < ROLE_HIERARCHY.ADMIN) {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN_RESOURCE',
            message: 'Access denied: You do not have access to this private project'
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // 7. Successful resolution: Log audit event and return authorized destination
  await recordAudit({
    actor: req.user._id,
    actorRole: userRole,
    action: 'SECURE_ROUTE_ACCESSED',
    targetResource: routeSpec.module,
    reason: `Accessed ${routeSpec.title}`,
    metadata: { routeId: payload.rid, purpose: payload.pur },
    ip,
    userAgent
  });

  // Construct concrete destination targetPath if template
  let finalPath = routeSpec.targetPath;
  if (finalPath.includes(':dashboardId')) {
    const dashboardId = `${req.user.username}-${req.user.dashboardHash}`;
    finalPath = finalPath.replace(':dashboardId', dashboardId);
  }

  return res.status(200).json({
    success: true,
    routeId: payload.rid,
    resourceId: payload.res || null,
    purpose: payload.pur || 'NAV',
    targetPath: finalPath,
    title: routeSpec.title,
    module: routeSpec.module,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
};

/**
 * Generate an encrypted route token
 * POST /api/secure-routes/generate
 */
const generateRouteToken = async (req, res) => {
  setSecureHeaders(res);

  const {
    routeId,
    resourceId,
    purpose = 'NAV',
    ttlSeconds = 3600,
    isSingleUse = false
  } = req.body;

  if (!routeId || !ROUTE_REGISTRY[routeId]) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ROUTE_ID',
      message: `Invalid routeId. Supported: ${Object.keys(ROUTE_REGISTRY).join(', ')}`
    });
  }

  const routeSpec = ROUTE_REGISTRY[routeId];
  const userRole = (req.user.role || 'USER').toUpperCase();
  const userLevel = ROLE_HIERARCHY[userRole] || 1;
  const minRequiredLevel = ROLE_HIERARCHY[routeSpec.minRole] || 1;

  // Authorization check: User cannot generate token for routes they themselves cannot access
  if (userLevel < minRequiredLevel) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'You cannot generate a secure link for a route above your privilege level'
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.min(Math.max(Number(ttlSeconds) || 3600, 60), 86400 * 7); // Min 1 min, max 7 days
  const exp = now + ttl;
  const jti = generateTokenId();

  const payload = {
    rid: routeId,
    res: resourceId ? String(resourceId) : undefined,
    pur: String(purpose),
    iat: now,
    exp,
    jti,
    uid: req.user.id
  };

  const token = encryptRoute(payload, { ttlSeconds: ttl });
  const tokenHash = hashToken(token);

  // Store in MongoDB for replay prevention and revocation tracking
  const expiresAt = new Date(exp * 1000);
  await RouteToken.create({
    tokenHash,
    jti,
    userId: req.user._id,
    routeId,
    resourceId: resourceId || null,
    purpose,
    isSingleUse: Boolean(isSingleUse),
    expiresAt
  });

  return res.status(201).json({
    success: true,
    token,
    securePath: `/secure/${token}`,
    expiresAt: expiresAt.toISOString(),
    isSingleUse: Boolean(isSingleUse),
    purpose
  });
};

/**
 * Revoke an active route token
 * POST /api/secure-routes/revoke
 */
const revokeRouteToken = async (req, res) => {
  setSecureHeaders(res);

  const { token, jti, reason } = req.body;

  let query = {};
  if (token) {
    query.tokenHash = hashToken(token);
  } else if (jti) {
    query.jti = String(jti);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Either token or jti must be provided'
    });
  }

  const storedToken = await RouteToken.findOne(query);
  if (!storedToken) {
    return res.status(404).json({
      success: false,
      message: 'Token record not found'
    });
  }

  const userRole = (req.user.role || 'USER').toUpperCase();
  const isAdmin = (ROLE_HIERARCHY[userRole] || 1) >= ROLE_HIERARCHY.ADMIN;

  // Only creator or administrator can revoke
  if (String(storedToken.userId) !== String(req.user.id) && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only revoke your own tokens'
    });
  }

  storedToken.isRevoked = true;
  storedToken.revokedAt = new Date();
  storedToken.revokedBy = req.user._id;
  storedToken.revocationReason = reason || 'Revoked by user';
  await storedToken.save();

  await recordAudit({
    actor: req.user._id,
    actorRole: userRole,
    action: 'ROUTE_TOKEN_REVOKED',
    targetResource: 'EncryptedRoute',
    reason: storedToken.revocationReason,
    metadata: { routeId: storedToken.routeId, jti: storedToken.jti },
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent']
  });

  return res.status(200).json({
    success: true,
    message: 'Secure route link has been successfully revoked'
  });
};

module.exports = {
  decryptAndValidateRoute,
  generateRouteToken,
  revokeRouteToken,
  ROUTE_REGISTRY
};
