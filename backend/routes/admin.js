const express = require('express');
const router = express.Router();
const { 
  protect, 
  requireModerator, 
  requireAdmin, 
  requireSuperAdmin 
} = require('../middleware/auth');

const {
  getPlatformStats,
  getUsers,
  getUserDetails,
  suspendUser,
  restoreUser,
  updateUserRole,
  getPosts,
  moderatePost,
  getCommunities,
  moderateCommunity,
  getOpportunities,
  moderateOpportunity,
  getAnalytics,
  exportAnalyticsData,
  getAuditLogs,
  getSettings,
  updateSettings
} = require('../controllers/adminController');

// All admin routes require authenticated session
router.use(protect);

// ── Overview & Stats (Moderator+)
router.get('/stats', requireModerator, getPlatformStats);

// ── User Management
router.get('/users', requireModerator, getUsers);
router.get('/users/:id', requireModerator, getUserDetails);
router.patch('/users/:id/suspend', requireModerator, suspendUser);
router.patch('/users/:id/restore', requireModerator, restoreUser);
router.patch('/users/:id/role', requireSuperAdmin, updateUserRole);

// ── Content & Community Moderation
router.get('/posts', requireModerator, getPosts);
router.patch('/posts/:id/moderate', requireModerator, moderatePost);
router.get('/communities', requireModerator, getCommunities);
router.patch('/communities/:id/moderate', requireModerator, moderateCommunity);

// ── Opportunities Moderation
router.get('/opportunities', requireModerator, getOpportunities);
router.patch('/opportunities/:id/moderate', requireModerator, moderateOpportunity);

// ── Platform Analytics & Export
router.get('/analytics', requireModerator, getAnalytics);
router.get('/analytics/export', requireAdmin, exportAnalyticsData);

// ── Immutable Audit Logs
router.get('/audit-logs', requireAdmin, getAuditLogs);

// ── Platform Settings
router.get('/settings', requireAdmin, getSettings);
router.put('/settings', requireAdmin, updateSettings);

module.exports = router;
