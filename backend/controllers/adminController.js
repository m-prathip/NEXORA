const User = require('../models/User');
const Profile = require('../models/Profile');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const Opportunity = require('../models/Opportunity');
const Collaboration = require('../models/Collaboration');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const ModerationAction = require('../models/ModerationAction');
const PlatformEvent = require('../models/PlatformEvent');
const PlatformSetting = require('../models/PlatformSetting');
const { recordAuditLog } = require('../utils/auditLogger');
const { ROLE_HIERARCHY } = require('../middleware/auth');

// ── 1. Platform Overview Stats ──────────────────────────────────────────────
const getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      totalPosts,
      moderatedPosts,
      totalCommunities,
      pendingReports,
      pendingOpportunities,
      activeOpportunities,
      totalCollaborations,
      totalAuditLogs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ 'suspension.isSuspended': true }),
      Post.countDocuments({ isModerated: { $ne: true } }),
      Post.countDocuments({ isModerated: true }),
      Community.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Opportunity.countDocuments({ status: 'pending' }),
      Opportunity.countDocuments({ status: 'active' }),
      Collaboration.countDocuments().catch(() => 0),
      AuditLog.countDocuments()
    ]);

    // Active in past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyActiveUsers = await User.countDocuments({
      updatedAt: { $gte: sevenDaysAgo },
      'suspension.isSuspended': { $ne: true }
    });

    res.json({
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        suspended: suspendedUsers,
        verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
        weeklyActive: weeklyActiveUsers
      },
      content: {
        totalPosts,
        moderatedPosts,
        totalCommunities,
        totalCollaborations
      },
      moderation: {
        pendingReports,
        pendingOpportunities,
        activeOpportunities,
        totalAuditLogs
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 2. User Management ──────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { q, role, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (role && role !== 'all') {
      filter.role = role.toUpperCase();
    }
    if (status && status !== 'all') {
      if (status === 'suspended') {
        filter['suspension.isSuspended'] = true;
      } else if (status === 'active') {
        filter['suspension.isSuspended'] = { $ne: true };
      }
    }
    if (q && q.trim()) {
      const regex = { $regex: q.trim(), $options: 'i' };
      filter.$or = [{ username: regex }, { email: regex }, { name: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username email name role status isVerified suspension college department reputationPoints createdAt')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      users: users.map(u => ({
        ...u,
        role: (u.role || 'USER').toUpperCase(),
        isSuspended: !!u.suspension?.isSuspended
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const [user, profile, reportsAgainst, auditLogs] = await Promise.all([
      User.findById(id).select('-password -refreshTokens').lean(),
      Profile.findOne({ user: id }).lean(),
      Report.find({ targetType: 'User', targetId: id }).populate('reporter', 'username email').lean(),
      AuditLog.find({ targetResource: 'User', targetId: id }).sort('-createdAt').limit(20).lean()
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        ...user,
        role: (user.role || 'USER').toUpperCase()
      },
      profile,
      reportsAgainst,
      auditLogs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Suspend user account
const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, durationDays, adminNotes } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'A suspension reason is mandatory' });
    }

    if (id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Administrators cannot suspend their own account' });
    }

    const targetUser = await User.findById(id).select('+refreshTokens');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role hierarchy protection: cannot suspend higher or equal ranked admin unless super admin
    const actorRank = ROLE_HIERARCHY[(req.user.role || 'USER').toUpperCase()] || 1;
    const targetRank = ROLE_HIERARCHY[(targetUser.role || 'USER').toUpperCase()] || 1;
    if (targetRank >= actorRank && actorRank < ROLE_HIERARCHY.SUPER_ADMIN) {
      return res.status(403).json({ message: 'You do not have permission to suspend this user' });
    }

    const durationNum = durationDays ? parseInt(durationDays, 10) : null;
    const expiresAt = durationNum && durationNum > 0 ? new Date(Date.now() + durationNum * 86400000) : null;

    targetUser.status = 'suspended';
    targetUser.suspension = {
      isSuspended: true,
      reason: reason.trim(),
      adminNotes: adminNotes ? adminNotes.trim() : '',
      suspendedAt: new Date(),
      suspendedBy: req.user.id,
      expiresAt,
      history: targetUser.suspension?.history || []
    };

    targetUser.suspension.history.push({
      action: 'suspend',
      reason: reason.trim(),
      adminNotes: adminNotes ? adminNotes.trim() : '',
      date: new Date(),
      by: req.user.id,
      expiresAt
    });

    // Terminate all active refresh sessions immediately
    targetUser.refreshTokens = [];
    await targetUser.save();

    // Log moderation action
    await ModerationAction.create({
      moderator: req.user.id,
      action: 'suspend_user',
      targetType: 'User',
      targetId: targetUser._id,
      reason: reason.trim(),
      notes: adminNotes || '',
      durationDays: durationNum,
      expiresAt
    }).catch(() => {});

    // Write immutable audit log
    await recordAuditLog(req, {
      action: 'USER_SUSPENDED',
      targetResource: 'User',
      targetId: targetUser._id,
      metadata: { username: targetUser.username, durationDays: durationNum, expiresAt },
      reason: reason.trim()
    });

    res.json({
      message: `User @${targetUser.username} has been suspended`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        status: targetUser.status,
        suspension: targetUser.suspension
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Restore suspended user account
const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!targetUser.suspension?.isSuspended && targetUser.status !== 'suspended') {
      return res.status(400).json({ message: 'User is not currently suspended' });
    }

    targetUser.status = 'active';
    targetUser.suspension.isSuspended = false;
    targetUser.suspension.expiresAt = null;
    targetUser.suspension.history = targetUser.suspension.history || [];

    targetUser.suspension.history.push({
      action: 'restore',
      reason: 'Administrative restoration',
      adminNotes: adminNotes ? adminNotes.trim() : '',
      date: new Date(),
      by: req.user.id
    });

    await targetUser.save();

    await ModerationAction.create({
      moderator: req.user.id,
      action: 'restore_user',
      targetType: 'User',
      targetId: targetUser._id,
      reason: 'Account restored',
      notes: adminNotes || ''
    }).catch(() => {});

    await recordAuditLog(req, {
      action: 'USER_RESTORED',
      targetResource: 'User',
      targetId: targetUser._id,
      metadata: { username: targetUser.username },
      reason: adminNotes || 'Administrative restoration'
    });

    res.json({
      message: `User @${targetUser.username} has been restored to active status`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        status: targetUser.status
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update user role (SUPER_ADMIN only)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    if (id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Super Administrators cannot change their own role' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousRole = (targetUser.role || 'USER').toUpperCase();
    targetUser.role = role;
    await targetUser.save();

    await recordAuditLog(req, {
      action: 'ROLE_UPDATED',
      targetResource: 'User',
      targetId: targetUser._id,
      metadata: { previousRole, newRole: role, username: targetUser.username },
      reason: `Promoted/demoted by @${req.user.username}`
    });

    res.json({
      message: `User @${targetUser.username} role updated to ${role}`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 3. Post Moderation ──────────────────────────────────────────────────────
const getPosts = async (req, res) => {
  try {
    const { filter = 'all', page = 1, limit = 20, q } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (filter === 'moderated') {
      query.isModerated = true;
    } else if (filter === 'active') {
      query.isModerated = { $ne: true };
    }

    if (q && q.trim()) {
      query.content = { $regex: q.trim(), $options: 'i' };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'username email name avatar')
        .populate('moderatedBy', 'username')
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const moderatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // 'hide', 'restore', 'delete'

    const post = await Post.findById(id).populate('author', 'username');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (action === 'hide') {
      post.isModerated = true;
      post.moderationReason = reason ? String(reason).trim() : 'Flagged by moderation';
      post.moderatedBy = req.user.id;
      post.moderatedAt = new Date();
      await post.save();

      await ModerationAction.create({
        moderator: req.user.id,
        action: 'remove_post',
        targetType: 'Post',
        targetId: post._id,
        reason: post.moderationReason
      }).catch(() => {});

      await recordAuditLog(req, {
        action: 'POST_HIDDEN',
        targetResource: 'Post',
        targetId: post._id,
        metadata: { author: post.author?.username },
        reason: post.moderationReason
      });

      return res.json({ message: 'Post hidden from public feed', post });
    }

    if (action === 'restore') {
      post.isModerated = false;
      post.moderationReason = '';
      post.moderatedBy = null;
      post.moderatedAt = null;
      await post.save();

      await ModerationAction.create({
        moderator: req.user.id,
        action: 'restore_post',
        targetType: 'Post',
        targetId: post._id,
        reason: reason || 'Post restored to public feed'
      }).catch(() => {});

      await recordAuditLog(req, {
        action: 'POST_RESTORED',
        targetResource: 'Post',
        targetId: post._id,
        metadata: { author: post.author?.username },
        reason: reason || 'Post restored to public feed'
      });

      return res.json({ message: 'Post restored to public feed', post });
    }

    if (action === 'delete') {
      await Post.findByIdAndDelete(post._id);
      await Comment.deleteMany({ post: post._id });

      await recordAuditLog(req, {
        action: 'POST_DELETED',
        targetResource: 'Post',
        targetId: post._id,
        metadata: { author: post.author?.username },
        reason: reason || 'Permanently removed by administrator'
      });

      return res.json({ message: 'Post and comments permanently deleted' });
    }

    res.status(400).json({ message: 'Invalid action. Must be hide, restore, or delete' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 4. Community Management ─────────────────────────────────────────────────
const getCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 20, q, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (q && q.trim()) {
      const regex = { $regex: q.trim(), $options: 'i' };
      query.$or = [{ name: regex }, { description: regex }, { slug: regex }];
    }

    const [communities, total] = await Promise.all([
      Community.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('creator', 'username email name')
        .lean(),
      Community.countDocuments(query)
    ]);

    res.json({
      communities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const moderateCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // 'suspend', 'activate'

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (action === 'suspend') {
      community.status = 'suspended';
      await community.save();

      await ModerationAction.create({
        moderator: req.user.id,
        action: 'suspend_community',
        targetType: 'Community',
        targetId: community._id,
        reason: reason || 'Suspended by admin'
      }).catch(() => {});

      await recordAuditLog(req, {
        action: 'COMMUNITY_SUSPENDED',
        targetResource: 'Community',
        targetId: community._id,
        metadata: { name: community.name },
        reason: reason || 'Suspended by admin'
      });

      return res.json({ message: `Community "${community.name}" suspended`, community });
    }

    if (action === 'activate') {
      community.status = 'active';
      await community.save();

      await ModerationAction.create({
        moderator: req.user.id,
        action: 'restore_community',
        targetType: 'Community',
        targetId: community._id,
        reason: reason || 'Restored by admin'
      }).catch(() => {});

      await recordAuditLog(req, {
        action: 'COMMUNITY_ACTIVATED',
        targetResource: 'Community',
        targetId: community._id,
        metadata: { name: community.name },
        reason: reason || 'Restored by admin'
      });

      return res.json({ message: `Community "${community.name}" activated`, community });
    }

    res.status(400).json({ message: 'Invalid action. Must be suspend or activate' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 5. Opportunity Approval Workflow ────────────────────────────────────────
const getOpportunities = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, q } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (q && q.trim()) {
      const regex = { $regex: q.trim(), $options: 'i' };
      query.$or = [{ title: regex }, { company: regex }, { description: regex }];
    }

    const [opportunities, total] = await Promise.all([
      Opportunity.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('poster', 'username email name')
        .lean(),
      Opportunity.countDocuments(query)
    ]);

    res.json({
      opportunities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const moderateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // 'approve', 'reject'

    const opp = await Opportunity.findById(id).populate('poster', 'username email');
    if (!opp) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    if (action === 'approve') {
      opp.status = 'active';
      await opp.save();

      await ModerationAction.create({
        moderator: req.user.id,
        action: 'approve_opportunity',
        targetType: 'Opportunity',
        targetId: opp._id,
        reason: 'Listing approved for public discovery'
      }).catch(() => {});

      await recordAuditLog(req, {
        action: 'OPPORTUNITY_APPROVED',
        targetResource: 'Opportunity',
        targetId: opp._id,
        metadata: { title: opp.title, company: opp.company, poster: opp.poster?.username },
        reason: 'Approved for public listing'
      });

      return res.json({ message: `Opportunity "${opp.title}" approved and active`, opportunity: opp });
    }

    if (action === 'reject') {
      opp.status = 'rejected';
      await opp.save();

      await ModerationAction.create({
        moderator: req.user.id,
        action: 'reject_opportunity',
        targetType: 'Opportunity',
        targetId: opp._id,
        reason: reason || 'Listing does not meet publication guidelines'
      }).catch(() => {});

      await recordAuditLog(req, {
        action: 'OPPORTUNITY_REJECTED',
        targetResource: 'Opportunity',
        targetId: opp._id,
        metadata: { title: opp.title, company: opp.company, poster: opp.poster?.username },
        reason: reason || 'Rejected during moderation review'
      });

      return res.json({ message: `Opportunity "${opp.title}" rejected`, opportunity: opp });
    }

    res.status(400).json({ message: 'Invalid action. Must be approve or reject' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 6. Platform Analytics & Aggregations ────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '90d') days = 90;
    else if (range === '1y') days = 365;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. WAU (Weekly Active Users)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [weeklyActiveUsers, totalUsers] = await Promise.all([
      User.countDocuments({ updatedAt: { $gte: sevenDaysAgo }, 'suspension.isSuspended': { $ne: true } }),
      User.countDocuments({ 'suspension.isSuspended': { $ne: true } })
    ]);

    // 2. Profile Completion Rate (headline, avatar, college, skills, about)
    const completionStats = await User.aggregate([
      { $match: { 'suspension.isSuspended': { $ne: true } } },
      {
        $project: {
          hasHeadline: { $cond: [{ $ifNull: ['$headline', false] }, 1, 0] },
          hasAvatar: { $cond: [{ $ifNull: ['$avatar', false] }, 1, 0] },
          hasCollege: { $cond: [{ $ifNull: ['$college', false] }, 1, 0] },
          hasSkills: { $cond: [{ $gt: [{ $size: { $ifNull: ['$skills', []] } }, 0] }, 1, 0] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withHeadline: { $sum: '$hasHeadline' },
          withAvatar: { $sum: '$hasAvatar' },
          withCollege: { $sum: '$hasCollege' },
          withSkills: { $sum: '$hasSkills' }
        }
      }
    ]);

    const comp = completionStats[0] || { total: 0, withHeadline: 0, withAvatar: 0, withCollege: 0, withSkills: 0 };
    const avgCompletion = comp.total > 0
      ? Math.round(((comp.withHeadline + comp.withAvatar + comp.withCollege + comp.withSkills) / (comp.total * 4)) * 100)
      : 0;

    // 3. Connections per Active User
    const connectionStats = await User.aggregate([
      { $match: { 'suspension.isSuspended': { $ne: true } } },
      {
        $group: {
          _id: null,
          avgConnections: { $avg: '$connectionsCount' },
          totalConnections: { $sum: '$connectionsCount' }
        }
      }
    ]);

    // 4. Collaboration Conversion Rate
    let collabConversion = 0;
    try {
      const collabStats = await Collaboration.aggregate([
        { $unwind: '$applications' },
        {
          $group: {
            _id: null,
            totalApps: { $sum: 1 },
            acceptedApps: { $sum: { $cond: [{ $eq: ['$applications.status', 'accepted'] }, 1, 0] } }
          }
        }
      ]);
      if (collabStats.length > 0 && collabStats[0].totalApps > 0) {
        collabConversion = Math.round((collabStats[0].acceptedApps / collabStats[0].totalApps) * 100);
      }
    } catch (e) {
      collabConversion = 0;
    }

    // 5. Post Volume Trends
    const postTrends = await Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 6. User Signup Trends
    const userTrends = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 7. Opportunity Clicks & Views from PlatformEvents
    const eventStats = await PlatformEvent.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const eventsMap = {};
    eventStats.forEach(e => { eventsMap[e._id] = e.count; });

    res.json({
      metrics: {
        weeklyActiveUsers,
        totalUsers,
        wauRatio: totalUsers > 0 ? Math.round((weeklyActiveUsers / totalUsers) * 100) : 0,
        profileCompletionRate: avgCompletion,
        avgConnectionsPerUser: Math.round((connectionStats[0]?.avgConnections || 0) * 10) / 10,
        collaborationConversionRate: collabConversion,
        opportunityViews: eventsMap['opportunity_view'] || 0,
        opportunityClicks: eventsMap['opportunity_click'] || 0
      },
      charts: {
        postTrends: postTrends.map(p => ({ date: p._id, posts: p.count })),
        userTrends: userTrends.map(u => ({ date: u._id, users: u.count })),
        events: eventsMap
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CSV Export for Reporting
const exportAnalyticsData = async (req, res) => {
  try {
    const { type = 'users' } = req.query;

    if (type === 'users') {
      const users = await User.find()
        .select('username email name role status isVerified connectionsCount createdAt')
        .sort('-createdAt')
        .lean();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=nexora_users.csv');

      const headers = 'ID,Username,Email,Name,Role,Status,Verified,Connections,JoinedDate\n';
      const rows = users.map(u => 
        `"${u._id}","${u.username}","${u.email}","${u.name || ''}","${u.role}","${u.status}","${u.isVerified}","${u.connectionsCount || 0}","${u.createdAt.toISOString()}"`
      ).join('\n');

      return res.send(headers + rows);
    }

    if (type === 'reports') {
      const reports = await Report.find()
        .populate('reporter', 'username')
        .populate('resolvedBy', 'username')
        .sort('-createdAt')
        .lean();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=nexora_reports.csv');

      const headers = 'ID,TargetType,TargetID,Reason,Status,Reporter,ResolvedBy,ActionTaken,CreatedAt\n';
      const rows = reports.map(r =>
        `"${r._id}","${r.targetType}","${r.targetId}","${r.reason}","${r.status}","${r.reporter?.username || ''}","${r.resolvedBy?.username || ''}","${r.actionTaken || 'none'}","${r.createdAt.toISOString()}"`
      ).join('\n');

      return res.send(headers + rows);
    }

    if (type === 'audit-logs') {
      const logs = await AuditLog.find()
        .populate('actor', 'username')
        .sort('-createdAt')
        .limit(1000)
        .lean();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=nexora_audit_logs.csv');

      const headers = 'ID,Timestamp,Actor,Role,Action,TargetResource,TargetID,IP,Reason\n';
      const rows = logs.map(l =>
        `"${l._id}","${l.createdAt.toISOString()}","${l.actor?.username || 'System'}","${l.actorRole}","${l.action}","${l.targetResource}","${l.targetId || ''}","${l.ip || ''}","${(l.reason || '').replace(/"/g, '""')}"`
      ).join('\n');

      return res.send(headers + rows);
    }

    res.status(400).json({ message: 'Invalid export type. Supported: users, reports, audit-logs' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 7. Audit Log Viewer ─────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
  try {
    const { action, targetResource, page = 1, limit = 25, q } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (action && action !== 'all') query.action = action;
    if (targetResource && targetResource !== 'all') query.targetResource = targetResource;
    if (q && q.trim()) {
      const regex = { $regex: q.trim(), $options: 'i' };
      query.$or = [{ reason: regex }, { ip: regex }, { action: regex }];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('actor', 'username email name')
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── 8. Platform Settings ────────────────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSetting.find().lean();
    const defaults = {
      requireEmailVerification: true,
      maxDailyConnectionRequests: 50,
      enableAIProfileAssistance: true,
      allowDirectMessagesWithoutConnection: false,
      autoFlagReportsThreshold: 3
    };

    const config = { ...defaults };
    settings.forEach(s => { config[s.key] = s.value; });

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
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
      reason: 'Admin adjusted system parameters'
    });

    res.json({ message: 'Platform parameters updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
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
};
