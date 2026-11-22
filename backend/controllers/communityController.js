const Community = require('../models/Community');
const CommunityMember = require('../models/CommunityMember');
const Post = require('../models/Post');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Report = require('../models/Report');

// @desc   Get all communities with search, category filtering & pagination
// @route  GET /api/communities
const getCommunities = async (req, res) => {
  try {
    const { category, q, page = 1, limit = 12 } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (q && q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [total, communities] = await Promise.all([
      Community.countDocuments(filter),
      Community.find(filter)
        .sort('-membersCount')
        .skip(skip)
        .limit(limitNum)
        .populate('creator', 'username name primaryRole headline avatar')
        .lean()
    ]);

    // Check membership for authenticated user
    let userMemberships = new Set();
    let userRoleMap = {};
    if (req.user) {
      const commIds = communities.map(c => c._id);
      const members = await CommunityMember.find({
        user: req.user.id,
        community: { $in: commIds }
      }).select('community role').lean();
      
      members.forEach(m => {
        userMemberships.add(m.community.toString());
        userRoleMap[m.community.toString()] = m.role;
      });
    }

    const result = communities.map(c => ({
      ...c,
      isMember: userMemberships.has(c._id.toString()),
      memberRole: userRoleMap[c._id.toString()] || null
    }));

    res.json({
      communities: result,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: skip + communities.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get single community by slug
// @route  GET /api/communities/:slug
const getCommunityBySlug = async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const community = await Community.findOne({ slug })
      .populate('creator', 'username name primaryRole headline avatar reputationPoints')
      .populate('admins', 'username name primaryRole headline avatar')
      .populate('moderators', 'username name primaryRole headline avatar')
      .lean();

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    let isMember = false;
    let memberRole = null;
    if (req.user) {
      const membership = await CommunityMember.findOne({
        community: community._id,
        user: req.user.id
      }).lean();
      if (membership) {
        isMember = true;
        memberRole = membership.role;
      }
    }

    res.json({ ...community, isMember, memberRole });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create a new community
// @route  POST /api/communities
const createCommunity = async (req, res) => {
  try {
    const { name, description, category, rules = [], avatar, banner } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Community name is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Community description is required' });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const existing = await Community.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (existing) {
      return res.status(400).json({ message: 'A community with this name already exists' });
    }

    const community = await Community.create({
      name: name.trim(),
      slug,
      description: description.trim(),
      category: category || 'Open Source',
      creator: req.user.id,
      admins: [req.user.id],
      moderators: [],
      rules: Array.isArray(rules) ? rules.filter(Boolean) : [],
      avatar: avatar || '',
      banner: banner || '',
      membersCount: 1
    });

    await CommunityMember.create({
      community: community._id,
      user: req.user.id,
      role: 'admin'
    });

    // Reward reputation (+20 points for founding a community)
    await User.findByIdAndUpdate(req.user.id, { $inc: { reputationPoints: 20 } });

    res.status(201).json({ ...community.toObject(), isMember: true, memberRole: 'admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update community details (name, description, category, rules, avatar, banner)
// @route  PUT /api/communities/:communityId
const updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { name, description, category, rules, avatar, banner } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization: only creator or an admin can edit community details
    const isCreator = community.creator.toString() === req.user.id.toString();
    const isAdmin = community.admins.some(a => a.toString() === req.user.id.toString());
    const isSiteAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin && !isSiteAdmin) {
      return res.status(403).json({ message: 'Only community administrators can edit community settings' });
    }

    if (name && name.trim()) {
      community.name = name.trim();
      community.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (description !== undefined) community.description = description.trim();
    if (category) community.category = category;
    if (rules && Array.isArray(rules)) community.rules = rules.filter(Boolean);
    if (avatar !== undefined) community.avatar = avatar;
    if (banner !== undefined) community.banner = banner;

    await community.save();

    res.json({ message: 'Community updated successfully', community });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Join or leave a community
// @route  POST /api/communities/:communityId/join
const toggleJoinCommunity = async (req, res) => {
  try {
    const communityId = req.params.communityId;
    const userId = req.user.id;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const existingMember = await CommunityMember.findOne({
      community: communityId,
      user: userId
    });

    if (existingMember) {
      // Cannot leave if creator
      if (community.creator.toString() === userId.toString()) {
        return res.status(400).json({ message: 'Community creators cannot leave their own community' });
      }

      await CommunityMember.findByIdAndDelete(existingMember._id);
      
      // Remove from admins/moderators arrays if present
      await Community.findByIdAndUpdate(communityId, {
        $pull: { admins: userId, moderators: userId },
        $inc: { membersCount: -1 }
      });

      const updated = await Community.findById(communityId);
      return res.json({ joined: false, membersCount: Math.max(0, updated.membersCount) });
    }

    // Join community as member
    await CommunityMember.create({
      community: communityId,
      user: userId,
      role: 'member'
    });

    const updated = await Community.findByIdAndUpdate(
      communityId,
      { $inc: { membersCount: 1 } },
      { new: true }
    );

    res.json({ joined: true, membersCount: updated.membersCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get member list of a community with roles
// @route  GET /api/communities/:communityId/members
const getCommunityMembers = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, members] = await Promise.all([
      CommunityMember.countDocuments({ community: communityId }),
      CommunityMember.find({ community: communityId })
        .sort({ role: 1, createdAt: -1 }) // admins & mods first
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'username name primaryRole headline avatar reputationPoints college department')
        .lean()
    ]);

    const userIds = members.map(m => m.user?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: userIds } })
      .select('user name profileImage headline college department')
      .lean();
    
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const formatted = members.map(m => {
      const u = m.user || {};
      const prof = profileMap[u._id?.toString()];
      return {
        _id: m._id,
        role: m.role,
        joinedAt: m.createdAt,
        user: {
          id: u._id,
          username: u.username,
          name: prof?.name || u.name || u.username,
          headline: prof?.headline || u.headline || u.primaryRole || 'Software Engineer',
          avatar: prof?.profileImage || u.avatar || '',
          college: prof?.college || u.college || '',
          reputationPoints: u.reputationPoints || 100
        }
      };
    });

    res.json({
      members: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: skip + members.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update member role or remove member (Admin/Moderator permission control)
// @route  PATCH /api/communities/:communityId/members/:memberId
const updateMemberRole = async (req, res) => {
  try {
    const { communityId, memberId } = req.params;
    const { role, action } = req.body; // role: 'admin' | 'moderator' | 'member', or action: 'remove'

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Requester must be creator or admin
    const isCreator = community.creator.toString() === req.user.id.toString();
    const isAdmin = community.admins.some(a => a.toString() === req.user.id.toString());
    const isSiteAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin && !isSiteAdmin) {
      return res.status(403).json({ message: 'Only community administrators can manage member permissions' });
    }

    const member = await CommunityMember.findById(memberId);
    if (!member || member.community.toString() !== communityId.toString()) {
      return res.status(404).json({ message: 'Member not found in this community' });
    }

    // Invariant: cannot demote or remove the community creator
    if (member.user.toString() === community.creator.toString()) {
      return res.status(400).json({ message: 'The community creator cannot be modified or removed' });
    }

    if (action === 'remove') {
      await CommunityMember.findByIdAndDelete(memberId);
      await Community.findByIdAndUpdate(communityId, {
        $pull: { admins: member.user, moderators: member.user },
        $inc: { membersCount: -1 }
      });
      return res.json({ message: 'Member removed from community' });
    }

    if (!['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    member.role = role;
    await member.save();

    // Synchronize admins and moderators arrays
    if (role === 'admin') {
      await Community.findByIdAndUpdate(communityId, {
        $addToSet: { admins: member.user },
        $pull: { moderators: member.user }
      });
    } else if (role === 'moderator') {
      await Community.findByIdAndUpdate(communityId, {
        $addToSet: { moderators: member.user },
        $pull: { admins: member.user }
      });
    } else {
      await Community.findByIdAndUpdate(communityId, {
        $pull: { admins: member.user, moderators: member.user }
      });
    }

    res.json({ message: `Member role updated to ${role}`, member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get community posts
// @route  GET /api/communities/:communityId/posts
const getCommunityPosts = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, posts] = await Promise.all([
      Post.countDocuments({ community: communityId }),
      Post.find({ community: communityId })
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'username name primaryRole headline avatar reputationPoints college')
        .lean()
    ]);

    const authorIds = posts.map(p => p.author?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: authorIds } }).select('user name profileImage').lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const formatted = posts.map(p => ({
      ...p,
      author: {
        id: p.author?._id,
        username: p.author?.username,
        name: profileMap[p.author?._id?.toString()]?.name || p.author?.name || p.author?.username,
        headline: p.author?.headline || p.author?.primaryRole || 'Software Engineer',
        profileImage: profileMap[p.author?._id?.toString()]?.profileImage || p.author?.avatar || '',
        reputationPoints: p.author?.reputationPoints || 100
      }
    }));

    res.json({
      posts: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: skip + posts.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Report inappropriate community or content
// @route  POST /api/communities/:communityId/report
const reportCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Report reason is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const existingReport = await Report.findOne({
      targetType: 'Community',
      targetId: communityId,
      reporter: req.user.id
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this community' });
    }

    const report = await Report.create({
      reporter: req.user.id,
      targetType: 'Community',
      targetId: communityId,
      reason,
      details: details ? details.trim() : ''
    });

    res.status(201).json({ message: 'Report submitted successfully. Our safety team will review it.', reportId: report._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCommunities,
  getCommunityBySlug,
  createCommunity,
  updateCommunity,
  toggleJoinCommunity,
  getCommunityMembers,
  updateMemberRole,
  getCommunityPosts,
  reportCommunity
};
