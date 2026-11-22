const router = require('express').Router();
const { getNotifications, markAsRead, markSingleRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.patch('/read', protect, markAsRead);
router.patch('/read-all', protect, markAsRead);
router.patch('/:id/read', protect, markSingleRead);

module.exports = router;
