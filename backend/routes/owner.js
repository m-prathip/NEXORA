const express = require('express');
const router = express.Router();
const { 
  protect, 
  requireSuperAdmin, 
  requireReauth 
} = require('../middleware/auth');
const { ownerLimiter } = require('../middleware/rateLimiters');

const {
  getOwnerOverview,
  getSystemHealth,
  getSecurityMonitoring,
  getOwnerAdministrators,
  revokeAdministrator,
  assignRole,
  getPlatformSettings,
  updatePlatformSettings
} = require('../controllers/ownerController');

// All Owner endpoints strictly enforce rate-limiting, valid JWT, and SUPER_ADMIN role
router.use(ownerLimiter);
router.use(protect);
router.use(requireSuperAdmin);

// ── 1. Telemetry & Overview
router.get('/overview', getOwnerOverview);
router.get('/system-health', getSystemHealth);
router.get('/security-monitoring', getSecurityMonitoring);

// ── 2. Administrator & Moderator Governance
router.get('/administrators', getOwnerAdministrators);
router.patch('/administrators/:id/revoke', requireReauth, revokeAdministrator);
router.patch('/roles/:id', requireReauth, assignRole);

// ── 3. Global Platform Settings
router.get('/platform-settings', getPlatformSettings);
router.put('/platform-settings', requireReauth, updatePlatformSettings);

module.exports = router;
