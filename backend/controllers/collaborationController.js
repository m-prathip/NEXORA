const CollaborationRequest = require('../models/CollaborationRequest');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');
const Report = require('../models/Report');

// @desc   Get all collaboration projects with search, filter, and pagination
// @route  GET /api/collaborations
const getCollabs = async (req, res) => {
  try {
    const { status = 'open', skill, role, category, q, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (skill && skill.trim()) {
      filter.$or = [
        { 'rolesNeeded.skills': { $regex: skill.trim(), $options: 'i' } },
        { technologies: { $regex: skill.trim(), $options: 'i' } }
      ];
    }
    if (role && role.trim()) {
      filter['rolesNeeded.role'] = { $regex: role.trim(), $options: 'i' };
    }
    if (q && q.trim()) {
      const qRegex = { $regex: q.trim(), $options: 'i' };
      filter.$or = [
        { title: qRegex },
        { description: qRegex },
        { technologies: qRegex },
        { tags: qRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, collabs] = await Promise.all([
      CollaborationRequest.countDocuments(filter),
      CollaborationRequest.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('creator', 'username name primaryRole headline avatar reputationPoints college')
        .populate('teamMembers.user', 'username name primaryRole headline avatar college')
        .lean()
    ]);

    // Populate profile names & images for creators and team members
    const allUserIds = new Set();
    collabs.forEach(c => {
      if (c.creator?._id) allUserIds.add(c.creator._id.toString());
      if (c.teamMembers) {
        c.teamMembers.forEach(tm => {
          if (tm.user?._id) allUserIds.add(tm.user._id.toString());
        });
      }
    });

    const profiles = await Profile.find({ user: { $in: Array.from(allUserIds) } })
      .select('user name profileImage college department')
      .lean();
    
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const formatted = collabs.map(c => {
      const myApp = req.user 
        ? c.applications?.find(a => a.applicant?.toString() === req.user.id.toString())
        : null;

      return {
        ...c,
        creator: {
          ...c.creator,
          name: profileMap[c.creator?._id?.toString()]?.name || c.creator?.name || c.creator?.username,
          profileImage: profileMap[c.creator?._id?.toString()]?.profileImage || c.creator?.avatar || '',
          college: profileMap[c.creator?._id?.toString()]?.college || c.creator?.college || ''
        },
        teamMembers: (c.teamMembers || []).map(tm => ({
          ...tm,
          user: tm.user ? {
            ...tm.user,
            name: profileMap[tm.user._id?.toString()]?.name || tm.user.name || tm.user.username,
            avatar: profileMap[tm.user._id?.toString()]?.profileImage || tm.user.avatar || '',
            college: profileMap[tm.user._id?.toString()]?.college || tm.user.college || ''
          } : null
        })),
        applicationsCount: c.applications ? c.applications.length : 0,
        myApplication: myApp ? {
          roleAppliedFor: myApp.roleAppliedFor,
          status: myApp.status,
          appliedAt: myApp.appliedAt
        } : null,
        // Shield full applicant list from non-creators
        applications: (req.user && c.creator?._id?.toString() === req.user.id.toString())
          ? c.applications
          : undefined
      };
    });

    res.json({
      projects: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: skip + collabs.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get single collaboration project details
// @route  GET /api/collaborations/:collabId
const getCollabById = async (req, res) => {
  try {
    const collab = await CollaborationRequest.findById(req.params.collabId)
      .populate('creator', 'username name primaryRole headline avatar reputationPoints college department')
      .populate('teamMembers.user', 'username name primaryRole headline avatar college')
      .populate('applications.applicant', 'username name primaryRole headline avatar college skills')
      .lean();

    if (!collab) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isCreator = req.user && collab.creator?._id?.toString() === req.user.id.toString();

    // Profile augmentation
    const creatorProf = await Profile.findOne({ user: collab.creator?._id }).select('name profileImage college department').lean();

    const formatted = {
      ...collab,
      creator: {
        ...collab.creator,
        name: creatorProf?.name || collab.creator?.name || collab.creator?.username,
        profileImage: creatorProf?.profileImage || collab.creator?.avatar || '',
        college: creatorProf?.college || collab.creator?.college || ''
      },
      isCreator,
      // If not creator, shield other people's applications
      applications: isCreator ? collab.applications : undefined,
      myApplication: req.user ? collab.applications?.find(a => a.applicant?._id?.toString() === req.user.id.toString()) : null
    };

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create / Publish a project idea & collaboration request
// @route  POST /api/collaborations
const createCollab = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category = 'Full-Stack Web', 
      rolesNeeded = [], 
      technologies = [], 
      githubUrl, 
      liveUrl, 
      tags = [] 
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Project title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Project description is required' });
    }

    // Parse rolesNeeded if passed as JSON string
    let parsedRoles = rolesNeeded;
    if (typeof rolesNeeded === 'string') {
      try { parsedRoles = JSON.parse(rolesNeeded); } catch (e) { parsedRoles = []; }
    }

    // Parse technologies if passed as JSON string or comma-separated
    let parsedTech = technologies;
    if (typeof technologies === 'string') {
      try { 
        parsedTech = JSON.parse(technologies); 
      } catch (e) { 
        parsedTech = technologies.split(',').map(s => s.trim()).filter(Boolean); 
      }
    }

    // Handle project images from file upload or payload
    let images = [];
    if (req.files?.images) {
      req.files.images.forEach(f => {
        images.push({
          url: f.path.startsWith('http') ? f.path : '/uploads/' + f.filename,
          caption: f.originalname || ''
        });
      });
    } else if (req.body.images) {
      if (typeof req.body.images === 'string') {
        try { images = JSON.parse(req.body.images); } catch (e) { images = []; }
      } else if (Array.isArray(req.body.images)) {
        images = req.body.images;
      }
    }

    const collab = await CollaborationRequest.create({
      creator: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      technologies: Array.isArray(parsedTech) ? parsedTech : [],
      rolesNeeded: Array.isArray(parsedRoles) ? parsedRoles.map(r => ({
        role: r.role || 'Contributor',
        skills: Array.isArray(r.skills) ? r.skills : (r.skills ? r.skills.split(',').map(s => s.trim()) : []),
        spots: Math.max(1, parseInt(r.spots, 10) || 1),
        spotsFilled: 0
      })) : [],
      images,
      githubUrl: githubUrl ? githubUrl.trim() : '',
      liveUrl: liveUrl ? liveUrl.trim() : '',
      tags: Array.isArray(tags) ? tags.map(t => t.toLowerCase().trim()) : [],
      teamMembers: [{
        user: req.user.id,
        role: 'Lead / Creator',
        joinedAt: new Date()
      }]
    });

    // Reward reputation (+15 points for publishing project)
    await User.findByIdAndUpdate(req.user.id, { $inc: { reputationPoints: 15 } });

    res.status(201).json(collab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update collaboration project (Creator only)
// @route  PUT /api/collaborations/:collabId
const updateCollab = async (req, res) => {
  try {
    const { collabId } = req.params;
    const collab = await CollaborationRequest.findById(collabId);

    if (!collab) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Strict ownership verification: only creator can edit
    if (collab.creator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Only the project creator can edit this project' });
    }

    const { title, description, category, rolesNeeded, technologies, status, githubUrl, liveUrl, tags } = req.body;

    if (title && title.trim()) collab.title = title.trim();
    if (description && description.trim()) collab.description = description.trim();
    if (category) collab.category = category;
    if (status) collab.status = status;
    if (githubUrl !== undefined) collab.githubUrl = githubUrl.trim();
    if (liveUrl !== undefined) collab.liveUrl = liveUrl.trim();
    if (technologies && Array.isArray(technologies)) collab.technologies = technologies;
    if (tags && Array.isArray(tags)) collab.tags = tags;

    if (rolesNeeded && Array.isArray(rolesNeeded)) {
      collab.rolesNeeded = rolesNeeded.map(r => ({
        role: r.role,
        skills: Array.isArray(r.skills) ? r.skills : [],
        spots: Math.max(1, parseInt(r.spots, 10) || 1),
        spotsFilled: r.spotsFilled || 0
      }));
    }

    // Append newly uploaded images if any
    if (req.files?.images) {
      req.files.images.forEach(f => {
        collab.images.push({
          url: f.path.startsWith('http') ? f.path : '/uploads/' + f.filename,
          caption: f.originalname || ''
        });
      });
    }

    await collab.save();
    res.json({ message: 'Project updated successfully', collab });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Delete collaboration project (Creator only)
// @route  DELETE /api/collaborations/:collabId
const deleteCollab = async (req, res) => {
  try {
    const { collabId } = req.params;
    const collab = await CollaborationRequest.findById(collabId);

    if (!collab) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (collab.creator.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the project creator can delete this project' });
    }

    await CollaborationRequest.findByIdAndDelete(collabId);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Apply to join a project with duplicate application prevention
// @route  POST /api/collaborations/:collabId/apply
const applyToCollab = async (req, res) => {
  try {
    const { roleAppliedFor, pitch } = req.body;
    const collabId = req.params.collabId;
    const applicantId = req.user.id;

    if (!roleAppliedFor || !roleAppliedFor.trim()) {
      return res.status(400).json({ message: 'Role applied for is required' });
    }

    const collab = await CollaborationRequest.findById(collabId);
    if (!collab) {
      return res.status(404).json({ message: 'Collaboration project not found' });
    }

    // Invariant 1: Creator cannot apply to their own project
    if (collab.creator.toString() === applicantId.toString()) {
      return res.status(400).json({ message: 'You are the creator of this project' });
    }

    // Invariant 2: Cannot apply if already accepted team member
    const isTeamMember = collab.teamMembers.some(tm => tm.user.toString() === applicantId.toString());
    if (isTeamMember) {
      return res.status(400).json({ message: 'You are already a team member of this project' });
    }

    // Invariant 3: Prevent duplicate applications
    const alreadyApplied = collab.applications.some(a => a.applicant.toString() === applicantId.toString());
    if (alreadyApplied) {
      return res.status(400).json({ message: 'You have already applied to this project' });
    }

    // Verify role exists in rolesNeeded
    const targetRole = collab.rolesNeeded.find(r => r.role.toLowerCase() === roleAppliedFor.trim().toLowerCase());
    if (!targetRole) {
      return res.status(400).json({ message: `Role "${roleAppliedFor}" is not currently needed on this project` });
    }

    collab.applications.push({
      applicant: applicantId,
      roleAppliedFor: targetRole.role,
      pitch: pitch ? pitch.trim() : '',
      status: 'pending',
      appliedAt: new Date()
    });

    await collab.save();

    // Notify project creator
    await Notification.create({
      recipient: collab.creator,
      sender: applicantId,
      type: 'collaboration_invite',
      title: 'New Teammate Application',
      message: `${req.user.username} applied for the "${targetRole.role}" role on "${collab.title}".`,
      link: `/collaborations`
    }).catch(() => {});

    res.status(201).json({ message: 'Application submitted successfully', status: 'pending' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Respond to a collaboration application (Accept / Reject)
// @route  PATCH /api/collaborations/:collabId/applications/:appId
const respondToApplication = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    const { collabId, appId } = req.params;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "accept" or "reject"' });
    }

    const collab = await CollaborationRequest.findById(collabId);
    if (!collab) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Strict check: only project creator can accept/reject applicants
    if (collab.creator.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Only the project creator can respond to applications' });
    }

    const application = collab.applications.id(appId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: `Application has already been ${application.status}` });
    }

    application.status = action === 'accept' ? 'accepted' : 'rejected';

    if (action === 'accept') {
      // Add applicant to team members
      collab.teamMembers.push({
        user: application.applicant,
        role: application.roleAppliedFor,
        joinedAt: new Date()
      });

      // Increment spots filled for role
      const roleTarget = collab.rolesNeeded.find(r => r.role === application.roleAppliedFor);
      if (roleTarget) {
        roleTarget.spotsFilled = (roleTarget.spotsFilled || 0) + 1;
      }

      // If all spots filled across all roles, update project status to 'in_progress'
      const allFilled = collab.rolesNeeded.every(r => (r.spotsFilled || 0) >= (r.spots || 1));
      if (allFilled && collab.status === 'open') {
        collab.status = 'in_progress';
      }

      // Notify applicant
      await Notification.create({
        recipient: application.applicant,
        sender: req.user.id,
        type: 'collaboration_accepted',
        title: 'Team Application Accepted! 🎉',
        message: `Your application to join "${collab.title}" as ${application.roleAppliedFor} was accepted!`,
        link: `/collaborations`
      }).catch(() => {});
    }

    await collab.save();
    res.json({ message: `Application ${action}ed successfully`, status: application.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get applications submitted by logged-in user
// @route  GET /api/collaborations/my/applications
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    const collabs = await CollaborationRequest.find({
      'applications.applicant': userId
    })
      .select('title category status creator applications technologies rolesNeeded')
      .populate('creator', 'username name primaryRole avatar')
      .sort('-createdAt')
      .lean();

    const formatted = collabs.map(c => {
      const myApp = c.applications.find(a => a.applicant.toString() === userId.toString());
      return {
        projectId: c._id,
        projectTitle: c.title,
        category: c.category,
        projectStatus: c.status,
        creator: c.creator,
        technologies: c.technologies,
        myApplication: {
          id: myApp._id,
          roleAppliedFor: myApp.roleAppliedFor,
          pitch: myApp.pitch,
          status: myApp.status,
          appliedAt: myApp.appliedAt
        }
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Find teammates by complementary skills
// @route  GET /api/collaborations/teammates/match
const matchTeammates = async (req, res) => {
  try {
    let userSkills = [];
    if (req.user) {
      const profile = await Profile.findOne({ user: req.user.id }).select('skills').lean();
      if (profile && profile.skills) userSkills = profile.skills;
    }

    const { skills } = req.query;
    if (skills) {
      const requested = skills.split(',').map(s => s.trim().toLowerCase());
      userSkills = Array.from(new Set([...userSkills.map(s => s.toLowerCase()), ...requested]));
    }

    if (userSkills.length === 0) {
      // Return top open projects looking for teammates
      const openProjects = await CollaborationRequest.find({ status: 'open' })
        .sort('-createdAt')
        .limit(6)
        .populate('creator', 'username name primaryRole avatar')
        .lean();
      return res.json({ matches: openProjects, criteria: 'latest' });
    }

    // Find projects where rolesNeeded.skills overlap with user's skills
    const regexSkills = userSkills.map(s => new RegExp(s, 'i'));
    const matchedProjects = await CollaborationRequest.find({
      status: 'open',
      $or: [
        { 'rolesNeeded.skills': { $in: regexSkills } },
        { technologies: { $in: regexSkills } }
      ]
    })
      .sort('-createdAt')
      .limit(10)
      .populate('creator', 'username name primaryRole avatar')
      .lean();

    res.json({
      matches: matchedProjects,
      matchedSkills: userSkills,
      count: matchedProjects.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Report inappropriate project
// @route  POST /api/collaborations/:collabId/report
const reportCollab = async (req, res) => {
  try {
    const { collabId } = req.params;
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Report reason is required' });
    }

    const collab = await CollaborationRequest.findById(collabId);
    if (!collab) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const existingReport = await Report.findOne({
      targetType: 'CollaborationRequest',
      targetId: collabId,
      reporter: req.user.id
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this project' });
    }

    const report = await Report.create({
      reporter: req.user.id,
      targetType: 'CollaborationRequest',
      targetId: collabId,
      reason,
      details: details ? details.trim() : ''
    });

    res.status(201).json({ message: 'Report submitted successfully. Our team will review it.', reportId: report._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCollabs,
  getCollabById,
  createCollab,
  updateCollab,
  deleteCollab,
  applyToCollab,
  respondToApplication,
  getMyApplications,
  matchTeammates,
  reportCollab
};
