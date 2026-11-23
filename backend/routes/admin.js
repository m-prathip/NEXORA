const express = require('express');
const router = express.Router();
const { 
  protect, 
  requireModerator, 
  requireAdmin, 
  requireSuperAdmin,
  requireReauth 
} = require('../middleware/auth');

const {
  getPlatformStats,
  getUsers,
  getUserDetails,
  suspendUser,
  restoreUser,
  updateUserRole,
  getAdministrators,
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

const {
  getReports,
  resolveReport,
  assignReport
} = require('../controllers/reportController');

// All admin routes require authenticated session
router.use(protect);

// ── Overview & Stats (Admin & Super Admin)
router.get('/stats', requireAdmin, getPlatformStats);

// ── Dedicated Moderation Metrics (Moderators, Admins & Super Admins)
router.get('/moderator/stats', requireModerator, async (req, res) => {
  try {
    const Report = require('../models/Report');
    const Post = require('../models/Post');
    const [pendingReports, flaggedPosts] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Post.countDocuments({ isReported: true, isDeleted: false })
    ]);
    res.json({
      pendingReports,
      flaggedPosts,
      role: req.user.role
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── User Management (Admin & Super Admin only)
router.get('/users', requireAdmin, getUsers);
router.get('/users/:id', requireAdmin, getUserDetails);
router.patch('/users/:id/suspend', requireAdmin, suspendUser);
router.patch('/users/:id/restore', requireAdmin, restoreUser);

// ── Administrator & Role Management (Super Admin only - with re-auth)
router.get('/administrators', requireAdmin, getAdministrators);
router.patch('/users/:id/role', requireSuperAdmin, requireReauth, updateUserRole);

// ── Reports & Complaints Moderation (Moderators, Admins & Super Admins)
router.get('/reports', requireModerator, getReports);
router.patch('/reports/:id/resolve', requireModerator, resolveReport);
router.patch('/reports/:id/assign', requireModerator, assignReport);

// ── Content & Community Moderation (Moderators, Admins & Super Admins)
router.get('/posts', requireModerator, getPosts);
router.patch('/posts/:id/moderate', requireModerator, moderatePost);
router.get('/communities', requireModerator, getCommunities);
router.patch('/communities/:id/moderate', requireModerator, moderateCommunity);

// ── Opportunities Moderation (Admin & Super Admin)
router.get('/opportunities', requireAdmin, getOpportunities);
router.patch('/opportunities/:id/moderate', requireAdmin, moderateOpportunity);

// ── Platform Analytics & Export (Admin & Super Admin)
router.get('/analytics', requireAdmin, getAnalytics);
router.get('/analytics/export', requireAdmin, requireReauth, exportAnalyticsData);

// ── Immutable Audit Logs (Admin & Super Admin)
router.get('/audit-logs', requireAdmin, getAuditLogs);

// ── Platform Security & System Settings (Super Admin only - with re-auth for updates)
router.get('/settings', requireSuperAdmin, getSettings);
router.put('/settings', requireSuperAdmin, requireReauth, updateSettings);

module.exports = router;
