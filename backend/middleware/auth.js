const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Role hierarchy levels: higher number = greater privilege
const ROLE_HIERARCHY = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4
};

// Verifies short-lived access token, checks account suspension, email verification,
// and token invalidation on password change.
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const token = header.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    const user = await User.findById(decoded.id)
      .select('email username role isVerified passwordChangedAt dashboardHash status suspension');

    if (!user) return res.status(401).json({ message: 'Account no longer exists' });

    // Check account suspension status
    if (user.status === 'suspended' || user.suspension?.isSuspended) {
      // Check if temporary suspension has expired
      if (user.suspension?.expiresAt && new Date() > new Date(user.suspension.expiresAt)) {
        user.status = 'active';
        user.suspension.isSuspended = false;
        await user.save();
      } else {
        return res.status(403).json({ 
          message: 'Your account has been suspended', 
          isSuspended: true,
          reason: user.suspension?.reason || 'Violation of NEXORA community safety guidelines',
          expiresAt: user.suspension?.expiresAt || null
        });
      }
    }

    if (!user.isVerified) return res.status(403).json({ message: 'Email not verified', requiresVerification: true });

    if (user.passwordChangedAfter(decoded.iat)) {
      return res.status(401).json({ message: 'Session expired, please sign in again' });
    }

    const normalizedRole = (user.role || 'USER').toUpperCase();

    req.user = { 
      id: user._id.toString(), 
      _id: user._id,
      email: user.email, 
      username: user.username, 
      role: normalizedRole, 
      dashboardHash: user.dashboardHash,
      status: user.status || 'active'
    };
    next();
  } catch (err) {
    res.status(500).json({ message: 'Auth check failed' });
  }
};

// Hierarchical Role Authorization Middleware
// Supports explicit roles or higher rank in hierarchy
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'Forbidden: Authentication required' });
  }

  const userRole = (req.user.role || 'USER').toUpperCase();
  const normalizedRequired = roles.map(r => r.toUpperCase());

  // Direct match
  if (normalizedRequired.includes(userRole)) {
    return next();
  }

  // Hierarchical check: if minimum required role level is met
  const userLevel = ROLE_HIERARCHY[userRole] || 1;
  const minRequiredLevel = Math.min(...normalizedRequired.map(r => ROLE_HIERARCHY[r] || 99));

  if (userLevel >= minRequiredLevel && minRequiredLevel > 1) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Forbidden: Insufficient administrative privileges',
    requiredRole: roles.join(' or '),
    currentRole: userRole
  });
};

const requireModerator = requireRole('MODERATOR');
const requireAdmin = requireRole('ADMIN');
const requireSuperAdmin = requireRole('SUPER_ADMIN');

// Optional auth: attaches req.user if valid token provided, but doesn't block unauthenticated guests
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = header.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.id).select('email username role isVerified status suspension');
    if (user && user.isVerified && user.status !== 'suspended' && !user.suspension?.isSuspended) {
      req.user = { 
        id: user._id.toString(), 
        _id: user._id,
        email: user.email, 
        username: user.username, 
        role: (user.role || 'USER').toUpperCase() 
      };
    } else {
      req.user = null;
    }
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { 
  protect, 
  requireRole, 
  requireModerator, 
  requireAdmin, 
  requireSuperAdmin, 
  optionalAuth,
  ROLE_HIERARCHY
};
