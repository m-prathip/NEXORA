const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/networkController');

// Connection Requests & Management
router.post('/connect/:userId', protect, ctrl.sendConnectionRequest);
router.patch('/requests/:requestId', protect, ctrl.respondToConnectionRequest);
router.get('/requests', protect, ctrl.getPendingRequests);
router.get('/connections', protect, ctrl.getConnections);

// Mutual Connections & Follows
router.get('/mutual/:userId', protect, ctrl.getMutualConnections);
router.post('/follow/:userId', protect, ctrl.toggleFollowUser);

// Suggested Builders, Global Search & Multi-Criteria Discovery
router.get('/suggested', protect, ctrl.getSuggestedBuilders);
router.get('/search', protect, ctrl.searchBuilders);
router.get('/discover', protect, ctrl.discoverBuilders);

module.exports = router;
