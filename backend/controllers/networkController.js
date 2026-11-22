const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Skill = require('../models/Skills');
const Connection = require('../models/Connection');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const BlockedUser = require('../models/BlockedUser');

// Helper to calculate mutual connection IDs between two users
async function findMutualConnectionIds(userId1, userId2) {
  const [conns1, conns2] = await Promise.all([
    Connection.find({
      $or: [{ requester: userId1 }, { recipient: userId1 }],
      status: 'accepted'
    }).select('requester recipient').lean(),
    Connection.find({
      $or: [{ requester: userId2 }, { recipient: userId2 }],
      status: 'accepted'
    }).select('requester recipient').lean()
  ]);

  const partners1 = new Set();
  conns1.forEach(c => {
    const id = c.requester.toString() === userId1.toString() ? c.recipient.toString() : c.requester.toString();
    partners1.add(id);
  });

  const mutualIds = [];
  conns2.forEach(c => {
    const id = c.requester.toString() === userId2.toString() ? c.recipient.toString() : c.requester.toString();
    if (partners1.has(id) && id !== userId1.toString() && id !== userId2.toString()) {
      mutualIds.push(new mongoose.Types.ObjectId(id));
    }
  });

  return mutualIds;
}

// @desc   Send a connection request to a builder
// @route  POST /api/network/connect/:userId
const sendConnectionRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const recipientId = req.params.userId;

    if (requesterId.toString() === recipientId.toString()) {
      return res.status(400).json({ message: 'You cannot connect with yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Bidirectional block check
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { user: requesterId, blockedUser: recipientId },
        { user: recipientId, blockedUser: requesterId }
      ]
    });
    if (isBlocked) {
      return res.status(403).json({ message: 'Unable to connect with this user' });
    }

    // Spam prevention: Max 50 connection requests per calendar day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await Connection.countDocuments({
      requester: requesterId,
      createdAt: { $gte: startOfDay }
    });
    if (sentToday >= 50) {
      return res.status(429).json({
        message: 'Daily connection request limit reached (50/day). Please try again tomorrow to maintain network quality.'
      });
    }

    // Check existing connection in either direction
    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'Already connected with this builder' });
      }
      if (existing.status === 'pending') {
        // If the other party already sent a request to current user, auto-accept it!
        if (existing.recipient.toString() === requesterId.toString()) {
          existing.status = 'accepted';
          await existing.save();

          await User.findByIdAndUpdate(requesterId, { $inc: { connectionsCount: 1 } });
          await User.findByIdAndUpdate(recipientId, { $inc: { connectionsCount: 1 } });

          await Notification.create({
            recipient: recipientId,
            sender: requesterId,
            type: 'connection_accepted',
            title: 'Connection Accepted',
            message: `${req.user.username} accepted your connection request.`,
            link: `/profile/${req.user.username}`
          }).catch(() => {});

          return res.json({ message: 'Connection accepted!', status: 'accepted', connection: existing });
        }
        return res.status(400).json({ message: 'Connection request is already pending' });
      }

      // If rejected or cancelled, allow re-requesting
      existing.requester = requesterId;
      existing.recipient = recipientId;
      existing.status = 'pending';
      existing.message = req.body.message || '';
      await existing.save();

      return res.json({ message: 'Connection request sent', status: 'pending', connection: existing });
    }

    const newConnection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      message: req.body.message || '',
      status: 'pending'
    });

    // Send in-app notification
    await Notification.create({
      recipient: recipientId,
      sender: requesterId,
      type: 'connection_request',
      title: 'New Connection Request',
      message: `${req.user.username} sent you a connection request.`,
      link: '/network'
    }).catch(() => {});

    res.status(201).json({ message: 'Connection request sent', status: 'pending', connection: newConnection });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Accept or reject a connection request
// @route  PATCH /api/network/requests/:requestId
const respondToConnectionRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const requestId = req.params.requestId;

    const connection = await Connection.findById(requestId);
    if (!connection) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only the recipient can accept/reject the request
    if (connection.recipient.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    if (action === 'accept') {
      connection.status = 'accepted';
      await connection.save();

      await User.findByIdAndUpdate(connection.requester, { $inc: { connectionsCount: 1 } });
      await User.findByIdAndUpdate(connection.recipient, { $inc: { connectionsCount: 1 } });

      await Notification.create({
        recipient: connection.requester,
        sender: req.user.id,
        type: 'connection_accepted',
        title: 'Connection Accepted',
        message: `${req.user.username} accepted your connection request.`,
        link: `/profile/${req.user.username}`
      }).catch(() => {});

      return res.json({ message: 'Connection accepted', connection });
    } else if (action === 'reject') {
      connection.status = 'rejected';
      await connection.save();
      return res.json({ message: 'Connection request rejected' });
    } else {
      return res.status(400).json({ message: "Invalid action. Must be 'accept' or 'reject'" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get pending incoming and outgoing requests
// @route  GET /api/network/requests
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const [incoming, outgoing] = await Promise.all([
      Connection.find({ recipient: userId, status: 'pending' })
        .populate('requester', 'username name primaryRole headline avatar reputationPoints college department')
        .sort('-createdAt')
        .lean(),
      Connection.find({ requester: userId, status: 'pending' })
        .populate('recipient', 'username name primaryRole headline avatar reputationPoints college department')
        .sort('-createdAt')
        .lean()
    ]);

    // Attach profile details
    const requesterIds = incoming.map(i => i.requester?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: requesterIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const formattedIncoming = incoming.map(item => ({
      ...item,
      requester: {
        ...item.requester,
        name: profileMap[item.requester?._id?.toString()]?.name || item.requester?.name || item.requester?.username,
        headline: profileMap[item.requester?._id?.toString()]?.headline || item.requester?.headline || item.requester?.primaryRole || 'Software Engineer',
        college: profileMap[item.requester?._id?.toString()]?.college || item.requester?.college || '',
        department: profileMap[item.requester?._id?.toString()]?.department || item.requester?.department || '',
        profileImage: profileMap[item.requester?._id?.toString()]?.profileImage || item.requester?.avatar || ''
      }
    }));

    res.json({ incoming: formattedIncoming, outgoing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get accepted connections list
// @route  GET /api/network/connections
const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const connections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted'
    })
      .populate('requester', 'username name primaryRole headline avatar reputationPoints college department')
      .populate('recipient', 'username name primaryRole headline avatar reputationPoints college department')
      .sort('-updatedAt')
      .lean();

    const otherUserIds = connections.map(c =>
      c.requester._id.toString() === userId.toString() ? c.recipient._id : c.requester._id
    );

    const profiles = await Profile.find({ user: { $in: otherUserIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const result = connections.map(c => {
      const other = c.requester._id.toString() === userId.toString() ? c.recipient : c.requester;
      const prof = profileMap[other._id.toString()];
      return {
        connectionId: c._id,
        connectedSince: c.updatedAt,
        user: {
          ...other,
          name: prof?.name || other.name || other.username,
          headline: prof?.headline || other.headline || other.primaryRole || 'Software Engineer',
          college: prof?.college || other.college || '',
          department: prof?.department || other.department || '',
          profileImage: prof?.profileImage || other.avatar || '',
          domains: prof?.domains || []
        }
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Follow or unfollow a builder
// @route  POST /api/network/follow/:userId
const toggleFollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const targetUserId = req.params.userId;

    if (followerId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const existing = await Follow.findOne({ follower: followerId, following: targetUserId });

    if (existing) {
      await Follow.findByIdAndDelete(existing._id);
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
      const target = await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } }, { new: true });
      return res.json({ following: false, followersCount: target?.followersCount || 0 });
    }

    await Follow.create({ follower: followerId, following: targetUserId });
    await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
    const target = await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } }, { new: true });

    await Notification.create({
      recipient: targetUserId,
      sender: followerId,
      type: 'new_follower',
      title: 'New Follower',
      message: `${req.user.username} started following your builder updates.`,
      link: `/profile/${req.user.username}`
    }).catch(() => {});

    res.json({ following: true, followersCount: target?.followersCount || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Display mutual connections between logged-in user and a target builder
// @route  GET /api/network/mutual/:userId
const getMutualConnections = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const mutualIds = await findMutualConnectionIds(currentUserId, targetUserId);
    
    if (mutualIds.length === 0) {
      return res.json({ count: 0, mutualConnections: [] });
    }

    const [users, profiles] = await Promise.all([
      User.find({ _id: { $in: mutualIds } })
        .select('username name primaryRole headline avatar reputationPoints college department')
        .lean(),
      Profile.find({ user: { $in: mutualIds } })
        .select('user name profileImage')
        .lean()
    ]);

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const formatted = users.map(u => ({
      id: u._id,
      username: u.username,
      name: profileMap[u._id.toString()]?.name || u.name || u.username,
      headline: u.headline || u.primaryRole || 'Software Engineer',
      avatar: profileMap[u._id.toString()]?.profileImage || u.avatar || '',
      reputationPoints: u.reputationPoints || 100
    }));

    res.json({
      count: formatted.length,
      mutualConnections: formatted
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get suggested builders based on complementary skills & active roles
// @route  GET /api/network/suggested
const getSuggestedBuilders = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Find users already connected or pending
    const existingConnections = await Connection.find({
      $or: [{ requester: currentUserId }, { recipient: currentUserId }]
    }).select('requester recipient');

    const excludedIds = new Set([currentUserId.toString()]);
    existingConnections.forEach(c => {
      excludedIds.add(c.requester.toString());
      excludedIds.add(c.recipient.toString());
    });

    const candidates = await User.find({
      _id: { $nin: Array.from(excludedIds).map(id => new mongoose.Types.ObjectId(id)) },
      isVerified: true,
      isPrivate: { $ne: true }
    })
      .select('username name primaryRole headline avatar reputationPoints connectionsCount college department skills interests')
      .limit(10)
      .lean();

    const candidateIds = candidates.map(c => c._id);
    const [profiles, skills] = await Promise.all([
      Profile.find({ user: { $in: candidateIds } }).lean(),
      Skill.find({ user: { $in: candidateIds } }).lean()
    ]);

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const skillMap = {};
    skills.forEach(s => {
      const uid = s.user.toString();
      if (!skillMap[uid]) skillMap[uid] = [];
      if (skillMap[uid].length < 5) skillMap[uid].push(s.name);
    });

    // Calculate real mutual connections for candidates
    const suggestions = await Promise.all(candidates.map(async (c) => {
      const prof = profileMap[c._id.toString()];
      const mutualIds = await findMutualConnectionIds(currentUserId, c._id);
      return {
        id: c._id,
        username: c.username,
        name: prof?.name || c.name || c.username,
        headline: prof?.headline || c.headline || c.primaryRole || 'Software Engineer',
        profileImage: prof?.profileImage || c.avatar || '',
        college: prof?.college || c.college || '',
        department: prof?.department || c.department || '',
        reputation: c.reputationPoints || 100,
        skills: (c.skills && c.skills.length > 0) ? c.skills : (skillMap[c._id.toString()] || prof?.domains || ['Software Development']),
        mutualCount: mutualIds.length
      };
    }));

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Search builders by name, username, skill, or role
// @route  GET /api/network/search
const searchBuilders = async (req, res) => {
  try {
    const { q = '', role = '', skill = '', limit = 20 } = req.query;
    const cleanQ = q.trim();

    let userFilter = { isVerified: true, isPrivate: { $ne: true } };
    if (cleanQ) {
      userFilter.$or = [
        { username: { $regex: cleanQ, $options: 'i' } },
        { name: { $regex: cleanQ, $options: 'i' } },
        { primaryRole: { $regex: cleanQ, $options: 'i' } },
        { headline: { $regex: cleanQ, $options: 'i' } },
        { college: { $regex: cleanQ, $options: 'i' } }
      ];
    }
    if (role && role !== 'All') {
      userFilter.primaryRole = { $regex: role, $options: 'i' };
    }
    if (skill) {
      userFilter.skills = { $regex: skill, $options: 'i' };
    }

    const users = await User.find(userFilter)
      .select('username name primaryRole headline avatar reputationPoints connectionsCount college department skills')
      .limit(Number(limit))
      .lean();

    const userIds = users.map(u => u._id);
    const [profiles, skillsList] = await Promise.all([
      Profile.find({ user: { $in: userIds } }).lean(),
      Skill.find({ user: { $in: userIds } }).lean()
    ]);

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const skillMap = {};
    skillsList.forEach(s => {
      const uid = s.user.toString();
      if (!skillMap[uid]) skillMap[uid] = [];
      skillMap[uid].push(s.name);
    });

    const results = users.map(u => {
      const prof = profileMap[u._id.toString()];
      return {
        id: u._id,
        username: u.username,
        name: prof?.name || u.name || u.username,
        headline: prof?.headline || u.headline || u.primaryRole || 'Software Engineer',
        profileImage: prof?.profileImage || u.avatar || '',
        college: prof?.college || u.college || '',
        department: prof?.department || u.department || '',
        reputation: u.reputationPoints || 100,
        skills: (u.skills && u.skills.length > 0) ? u.skills : (skillMap[u._id.toString()] || prof?.domains || []),
        status: prof?.openToWork ? 'Open to Work' : 'Builder'
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Discover users filtered by skills, college, and interests
// @route  GET /api/network/discover
const discoverBuilders = async (req, res) => {
  try {
    const { skill, college, interest, role, q, page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const filter = { isVerified: true, isPrivate: { $ne: true } };

    if (q && q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { username: { $regex: q.trim(), $options: 'i' } },
        { headline: { $regex: q.trim(), $options: 'i' } },
        { college: { $regex: q.trim(), $options: 'i' } }
      ];
    }
    if (skill && skill.trim()) {
      filter.skills = { $regex: skill.trim(), $options: 'i' };
    }
    if (college && college.trim()) {
      filter.college = { $regex: college.trim(), $options: 'i' };
    }
    if (interest && interest.trim()) {
      filter.interests = { $regex: interest.trim(), $options: 'i' };
    }
    if (role && role !== 'All') {
      filter.primaryRole = { $regex: role.trim(), $options: 'i' };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort('-reputationPoints')
        .skip(skip)
        .limit(limitNum)
        .select('username name primaryRole headline avatar reputationPoints connectionsCount college department skills interests')
        .lean(),
      User.countDocuments(filter)
    ]);

    const currentUserId = req.user.id;
    const results = await Promise.all(users.map(async (u) => {
      const mutualIds = await findMutualConnectionIds(currentUserId, u._id);
      return {
        id: u._id,
        username: u.username,
        name: u.name || u.username,
        headline: u.headline || u.primaryRole || 'Software Engineer',
        primaryRole: u.primaryRole || 'Software Engineer',
        profileImage: u.avatar || '',
        college: u.college || '',
        department: u.department || '',
        skills: u.skills || [],
        interests: u.interests || [],
        reputation: u.reputationPoints || 100,
        mutualCount: mutualIds.length
      };
    }));

    res.json({
      builders: results,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalBuilders: total,
      hasMore: skip + users.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  sendConnectionRequest,
  respondToConnectionRequest,
  getPendingRequests,
  getConnections,
  toggleFollowUser,
  getMutualConnections,
  getSuggestedBuilders,
  searchBuilders,
  discoverBuilders
};
