const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Words that can't be used as a username because they'd clash with
// publisher routes or are otherwise misleading as a personal handle.
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'api', 'app', 'auth', 'login', 'logout',
  'signup', 'signin', 'register', 'settings', 'dashboard', 'support',
  'help', 'about', 'contact', 'portfolio', 'portfolios', 'public',
  'static', 'assets', 'root', 'null', 'undefined', 'me', 'user', 'users',
  'u', 'www', 'mail', 'ftp', 'share', 'verify', 'reset', 'forgot',
  'feed', 'network', 'discover', 'communities', 'projects', 'opportunities',
  'events', 'messages', 'notifications', 'nexora', 'collaborations'
];

// 3-30 characters, lowercase letters/numbers/hyphens, can't start or end
// with a hyphen. Shows up in every user's portfolio URL: /u/<username>
const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// Strong password policy: min 8 chars, at least one lowercase, one
// uppercase, one digit and one special character.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number and a special character';

// A stored (hashed) refresh token. We never store the raw refresh token —
// only its SHA-256 hash — so a DB leak can't be used to mint sessions.
const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  device: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [USERNAME_REGEX, 'Username must be 3-30 characters: lowercase letters, numbers, and hyphens only']
  },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  dashboardHash: { type: String, unique: true },
  // select:false → password is never returned unless explicitly asked for
  // with .select('+password'). Prevents accidental hash leakage.
  password: { type: String, required: true, minlength: 8, select: false },

  // Account is inactive until the email is verified via OTP or token link.
  isVerified: { type: Boolean, default: false },

  role: { 
    type: String, 
    enum: ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN', 'user', 'admin'], 
    default: 'USER',
    index: true
  },

  // Account status and suspension tracking
  status: {
    type: String,
    enum: ['active', 'suspended', 'restricted'],
    default: 'active',
    index: true
  },
  suspension: {
    isSuspended: { type: Boolean, default: false, index: true },
    reason: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminNotes: { type: String, default: '' },
    history: [{
      reason: { type: String },
      durationDays: { type: Number },
      suspendedAt: { type: Date },
      suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      restoredAt: { type: Date },
      restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: { type: String }
    }]
  },

  // NEXORA Builder Fields
  name: { type: String, trim: true, default: '' },
  headline: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  bannerImage: { type: String, default: '' },
  bio: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  college: { type: String, trim: true, default: '' },
  department: { type: String, trim: true, default: '' },
  degree: { type: String, trim: true, default: '' },
  graduationYear: { type: String, trim: true, default: '' },
  skills: [{ type: String, trim: true }],
  interests: [{ type: String, trim: true }],
  isOnboarded: { type: Boolean, default: false },
  primaryRole: { 
    type: String, 
    enum: ['Student', 'Software Engineer', 'Frontend Developer', 'Backend Developer', 
          'Full-Stack Developer', 'AI/ML Engineer', 'Data Scientist', 'UI/UX Designer', 
          'Researcher', 'Freelancer', 'Recruiter', 'Engineering Leader', 'Other'],
    default: 'Software Engineer'
  },
  experienceLevel: {
    type: String,
    enum: ['Student', 'Entry-Level / Fresher', 'Mid-Level', 'Senior', 'Lead / Staff'],
    default: 'Entry-Level / Fresher'
  },
  reputationPoints: { type: Number, default: 100, index: true },
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  connectionsCount: { type: Number, default: 0 },
  isPrivate: { type: Boolean, default: false },
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'network', 'private'], default: 'public' },
    showOnlineStatus: { type: Boolean, default: true },
    allowDirectMessages: { type: String, enum: ['everyone', 'connections'], default: 'everyone' },
    searchEngineIndexing: { type: Boolean, default: true }
  },
  openToCollaborate: { type: Boolean, default: true },
  openToWork: { type: Boolean, default: true },
  githubUsername: { type: String, trim: true, default: '' },
  linkedinUrl: { type: String, trim: true, default: '' },
  websiteUrl: { type: String, trim: true, default: '' },

  // Active sessions (rotating refresh tokens). Revoking = pulling an entry.
  refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

  // Used to invalidate access tokens issued before a password change.
  passwordChangedAt: { type: Date },
  lastLoginAt: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (this.isNew && !this.dashboardHash) {
    const crypto = require('crypto');
    this.dashboardHash = crypto.randomBytes(4).toString('hex'); // 8 characters
  }
  
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  const isBcrypt = this.password && this.password.startsWith('$2');
  if (isBcrypt) {
    return bcrypt.compare(entered, this.password);
  }

  // Legacy plain-text or unsupported hash fallback (for migration)
  // Constant-time comparison to prevent timing attacks
  const crypto = require('crypto');
  const enteredBuf = Buffer.from(entered);
  const storedBuf = Buffer.from(this.password);
  
  if (enteredBuf.length === storedBuf.length) {
    return crypto.timingSafeEqual(enteredBuf, storedBuf);
  } else {
    // Perform a dummy comparison to mitigate timing variations based on length
    crypto.timingSafeEqual(enteredBuf, enteredBuf);
    return false;
  }
};

// True if the token was issued before the password was last changed.
userSchema.methods.passwordChangedAfter = function (tokenIssuedAtSec) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) - 1 > tokenIssuedAtSec;
};

const User = mongoose.model('User', userSchema);

User.RESERVED_USERNAMES = RESERVED_USERNAMES;
User.USERNAME_REGEX = USERNAME_REGEX;
User.PASSWORD_REGEX = PASSWORD_REGEX;
User.PASSWORD_MESSAGE = PASSWORD_MESSAGE;

module.exports = User;
