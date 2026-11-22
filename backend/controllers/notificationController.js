const Notification = require('../models/Notification');

// @desc   Get user's notifications (paginated with unread count)
// @route  GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [total, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments({ recipient: req.user.id }),
      Notification.countDocuments({ recipient: req.user.id, read: false }),
      Notification.find({ recipient: req.user.id })
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('sender', 'username name primaryRole headline avatar')
        .lean()
    ]);

    res.json({
      notifications,
      unreadCount,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: skip + notifications.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Mark specific notification or all notifications as read
// @route  PATCH /api/notifications/read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (notificationId) {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user.id },
        { read: true }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { recipient: req.user.id, read: false },
        { read: true }
      );
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.json({ message: 'Notifications marked as read', unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Mark single notification as read by ID parameter
// @route  PATCH /api/notifications/:id/read
const markSingleRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.json({ message: 'Notification marked as read', notification, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markSingleRead
};
