const BlockedUser = require('../models/BlockedUser');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');

/**
 * Helper: Retrieve all user IDs who have blocked or are blocked by target userId
 * Enables bidirectional blocking enforcement across feed, network, messages, and profiles.
 */
async function getBlockedUserIds(userId) {
  if (!userId) return [];
  const blocks = await BlockedUser.find({
    $or: [{ user: userId }, { blockedUser: userId }]
  }).select('user blockedUser').lean();

  const idSet = new Set();
  const uIdStr = userId.toString();
  blocks.forEach(b => {
    if (b.user && b.user.toString() !== uIdStr) idSet.add(b.user.toString());
    if (b.blockedUser && b.blockedUser.toString() !== uIdStr) idSet.add(b.blockedUser.toString());
  });

  return Array.from(idSet);
}

// @desc   Block a user
// @route  POST /api/blocks/:userId
const blockUser = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const targetUserId = req.params.userId;

    if (requesterId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User to block not found' });
    }

    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 300) : '';

    // Upsert block record
    await BlockedUser.findOneAndUpdate(
      { user: requesterId, blockedUser: targetUserId },
      { $set: { reason } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sever all active or pending connection requests between them
    await Connection.deleteMany({
      $or: [
        { requester: requesterId, recipient: targetUserId },
        { requester: targetUserId, recipient: requesterId }
      ]
    });

    // Sever any follower/following relationships
    await Follow.deleteMany({
      $or: [
        { follower: requesterId, following: targetUserId },
        { follower: targetUserId, following: requesterId }
      ]
    });

    res.json({ message: `Successfully blocked @${targetUser.username}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Unblock a user
// @route  DELETE /api/blocks/:userId
const unblockUser = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const targetUserId = req.params.userId;

    const deleted = await BlockedUser.findOneAndDelete({
      user: requesterId,
      blockedUser: targetUserId
    });

    if (!deleted) {
      return res.status(404).json({ message: 'User is not currently blocked' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get list of users blocked by logged-in user
// @route  GET /api/blocks
const getBlockedUsers = async (req, res) => {
  try {
    const requesterId = req.user.id;

    const blockedList = await BlockedUser.find({ user: requesterId })
      .sort('-createdAt')
      .populate('blockedUser', 'username name avatar headline primaryRole college')
      .lean();

    const formatted = blockedList
      .filter(b => b.blockedUser)
      .map(b => ({
        id: b._id,
        user: b.blockedUser,
        reason: b.reason,
        blockedAt: b.createdAt
      }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockedUserIds
};
