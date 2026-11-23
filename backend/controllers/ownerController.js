const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Community = require('../models/Community');
const Report = require('../models/Report');
const Opportunity = require('../models/Opportunity');
const AuditLog = require('../models/AuditLog');
const PlatformSetting = require('../models/PlatformSetting');
const ModerationAction = require('../models/ModerationAction');
const { recordAuditLog } = require('../utils/auditLogger');

/**
 * Apply strict anti-caching headers for all Super Admin responses
 */
const setOwnerSecureHeaders = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Referrer-Policy', 'no-referrer');
};

/**
 * 1. Complete Platform Overview Telemetry (All 15 Domains)
 * GET /api/owner/overview
 */
const getOwnerOverview = async (req, res) => {
  setOwnerSecureHeaders(res);
  try {
    const [
      totalUsers,
      verifiedUsers,
      activeUsers,
      suspendedUsers,
      moderatorsCount,
      adminsCount,
      superAdminsCount,
      totalPosts,
      reportedPosts,
      totalCommunities,
      totalReports,
      pendingReports,
      totalOpportunities,
      totalAuditLogs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ status: 'active', 'suspension.isSuspended': false }),
      User.countDocuments({ $or: [{ status: 'suspended' }, { 'suspension.isSuspended': true }] }),
      User.countDocuments({ role: 'MODERATOR' }),
      User.countDocuments({ role: 'ADMIN' }),
      User.countDocuments({ role: 'SUPER_ADMIN' }),
      Post.countDocuments(),
      Post.countDocuments({ isReported: true }),
      Community.countDocuments(),
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Opportunity.countDocuments(),
      AuditLog.countDocuments()
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          active: activeUsers,
          suspended: suspendedUsers
        },
        staff: {
          moderators: moderatorsCount,
          admins: adminsCount,
          superAdmins: superAdminsCount
        },
        content: {
          posts: totalPosts,
          reportedPosts
        },
        communities: {
          total: totalCommunities
        },
        reports: {
          total: totalReports,
          pending: pendingReports
        },
        opportunities: {
          total: totalOpportunities
        },
        auditLogs: {
          total: totalAuditLogs
        }
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. System and Database Health
 * GET /api/owner/system-health
 */
const getSystemHealth = async (req, res) => {
  setOwnerSecureHeaders(res);
  try {
    const memory = process.memoryUsage();
    const dbState = mongoose.connection.readyState;
    const dbStateNames = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];

    // Collect collection document counts
    const collections = await Promise.all([
      User.countDocuments().then(c => ({ name: 'Users', count: c })),
      Post.countDocuments().then(c => ({ name: 'Posts', count: c })),
      Community.countDocuments().then(c => ({ name: 'Communities', count: c })),
      Report.countDocuments().then(c => ({ name: 'Reports', count: c })),
      Opportunity.countDocuments().then(c => ({ name: 'Opportunities', count: c })),
      AuditLog.countDocuments().then(c => ({ name: 'AuditLogs', count: c })),
      ModerationAction.countDocuments().then(c => ({ name: 'ModerationActions', count: c }))
    ]);

    const uptime = Math.floor(process.uptime());
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    res.json({
      success: true,
      status: 'operational',
      database: {
        state: dbStateNames[dbState] || 'Unknown',
        connected: dbState === 1,
        host: mongoose.connection.host || 'local-in-memory',
        name: mongoose.connection.name || 'nexora',
        collections
      },
      process: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptimeSeconds: uptime,
        uptimeFormatted: `${days}d ${hours}h ${minutes}m`,
        memoryMb: {
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          rss: Math.round(memory.rss / 1024 / 1024),
          external: Math.round(memory.external / 1024 / 1024)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Security Monitoring & Threat Telemetry
 * GET /api/owner/security-monitoring
 */
const getSecurityMonitoring = async (req, res) => {
  setOwnerSecureHeaders(res);
  try {
    const securityEvents = await AuditLog.find({
      action: {
        $in: [
          'UNAUTHORIZED_ROUTE_ACCESS_BLOCKED',
          'IDOR_PREVENTED',
          'ROUTE_TOKEN_DECRYPT_FAILURE',
          'REVOKED_TOKEN_ACCESS_ATTEMPT',
          'REPLAY_TOKEN_ATTEMPT',
          'ADMIN_PRIVILEGES_REVOKED',
          'ROLE_UPDATED'
        ]
      }
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('actor', 'username email role')
      .lean();

    const [activeSuspensions, lockedAccounts] = await Promise.all([
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ 'suspension.isSuspended': true })
    ]);

    res.json({
      success: true,
      activeSuspensions,
      lockedAccounts,
      recentAlerts: securityEvents
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. List All Administrators and Moderators
 * GET /api/owner/administrators
 */
const getOwnerAdministrators = async (req, res) => {
  setOwnerSecureHeaders(res);
  try {
    const staff = await User.find({
      role: { $in: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] }
    })
      .select('username email role name status avatar isVerified createdAt suspension lastLogin')
      .sort({ role: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, administrators: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Emergency Revocation of Administrator/Moderator Access
 * PATCH /api/owner/administrators/:id/revoke
 * Requires Re-Authentication
 */
const revokeAdministrator = async (req, res) => {
  setOwnerSecureHeaders(res);
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const targetUser = await User.findById(id).select('+refreshTokens');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    if (String(targetUser._id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Owner cannot revoke their own Super Admin privileges' });
    }

    const previousRole = targetUser.role;

    // Demote to USER
    targetUser.role = 'USER';
    // Clear all refresh tokens immediately across all devices
    targetUser.refreshTokens = [];
    // Update passwordChangedAt to invalidate active access tokens
    targetUser.passwordChangedAt = new Date();
    await targetUser.save();

    await recordAuditLog(req, {
      action: 'ADMIN_PRIVILEGES_REVOKED',
      targetResource: 'User',
      targetId: targetUser._id,
      metadata: { previousRole, newRole: 'USER', username: targetUser.username },
      reason: reason ? reason.trim() : 'Emergency administrator privilege revocation by Owner'
    });

    res.json({
      success: true,
      message: `Privileges for @${targetUser.username} revoked. Account demoted to USER and all active sessions terminated.`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Assign / Update User Role (Promote / Demote)
 * PATCH /api/owner/roles/:id
 * Requires Re-Authentication
 */
const assignRole = async (req, res) => {
  setOwnerSecureHeaders(res);
  const { id } = req.params;
  const { role, reason } = req.body;

  const validRoles = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Invalid role. Allowed: ${validRoles.join(', ')}` });
  }

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (String(targetUser._id) === String(req.user.id) && role !== 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'Super Administrators cannot demote themselves' });
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await recordAuditLog(req, {
      action: 'ROLE_UPDATED',
      targetResource: 'User',
      targetId: targetUser._id,
      metadata: { previousRole, newRole: role, username: targetUser.username },
      reason: reason ? reason.trim() : `Role updated to ${role} by Platform Owner`
    });

    res.json({
      success: true,
      message: `User @${targetUser.username} successfully assigned role ${role}`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. Global Platform Settings Management
 * GET & PUT /api/owner/platform-settings
 */
const getPlatformSettings = async (req, res) => {
  setOwnerSecureHeaders(res);
  try {
    const settings = await PlatformSetting.find().lean();
    const defaults = {
      maintenanceMode: false,
      allowPublicRegistration: true,
      requireEmailVerification: true,
      maxDailyConnectionRequests: 50,
      enableAIProfileAssistance: true,
      autoFlagReportsThreshold: 3
    };

    const config = { ...defaults };
    settings.forEach(s => { config[s.key] = s.value; });

    res.json({ success: true, settings: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updatePlatformSettings = async (req, res) => {
  setOwnerSecureHeaders(res);
  try {
    const updates = { ...req.body };
    delete updates.adminPassword; // Strip confirmation password

    for (const [key, value] of Object.entries(updates)) {
      await PlatformSetting.findOneAndUpdate(
        { key },
        { $set: { value, updatedBy: req.user.id } },
        { upsert: true }
      );
    }

    await recordAuditLog(req, {
      action: 'PLATFORM_SETTINGS_UPDATED',
      targetResource: 'PlatformSetting',
      metadata: updates,
      reason: 'Platform Owner modified global configuration'
    });

    res.json({ success: true, message: 'Global platform settings updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getOwnerOverview,
  getSystemHealth,
  getSecurityMonitoring,
  getOwnerAdministrators,
  revokeAdministrator,
  assignRole,
  getPlatformSettings,
  updatePlatformSettings
};
