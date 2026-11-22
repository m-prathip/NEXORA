const Profile = require('../models/Profile');
const User = require('../models/User');
const Skill = require('../models/Skills');
const Project = require('../models/Projects');
const Experience = require('../models/Experience');
const Education = require('../models/Education');
const Achievement = require('../models/Achievements');
const Certificate = require('../models/Certificate');
const Activity = require('../models/Activities');
const WhyHire = require('../models/WhyHire');
const Connection = require('../models/Connection');
const BlockedUser = require('../models/BlockedUser');

// Helper to safely parse strings or objects
const parseField = (body, field) => {
  if (typeof body[field] === 'string') {
    try { return JSON.parse(body[field]); } catch (e) { return body[field]; }
  }
  return body[field];
};

// @desc   Get the logged-in user's own profile (for editing in the dashboard)
// @route  GET /api/profile/me
const getMyProfile = async (req, res) => {
  try {
    const [profile, userDoc] = await Promise.all([
      Profile.findOne({ user: req.user.id }).lean(),
      User.findById(req.user.id).select('-password -refreshTokens').lean()
    ]);
    if (!profile && !userDoc) return res.status(404).json({ message: 'Profile not found' });
    
    res.json({
      ...(profile || {}),
      user: userDoc,
      username: userDoc?.username,
      name: profile?.name || userDoc?.name || userDoc?.username,
      isOnboarded: userDoc?.isOnboarded || false
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc   Create or update the logged-in user's profile
// @route  PUT /api/profile/me
const updateMyProfile = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.user; // ownership always comes from the authenticated session
    delete data._id;

    if (typeof data.backgroundConfig === 'string') {
      try { data.backgroundConfig = JSON.parse(data.backgroundConfig); }
      catch (e) { delete data.backgroundConfig; }
    }

    if (req.files?.profileImage) {
      data.profileImage = req.files.profileImage[0].path.startsWith('http')
        ? req.files.profileImage[0].path
        : '/uploads/' + req.files.profileImage[0].filename;
    }
    if (req.files?.coverImage) {
      data.coverImage = req.files.coverImage[0].path.startsWith('http')
        ? req.files.coverImage[0].path
        : '/uploads/' + req.files.coverImage[0].filename;
    }
    if (req.files?.resume) {
      data.resumeUrl = req.files.resume[0].path.startsWith('http')
        ? req.files.resume[0].path
        : '/uploads/' + req.files.resume[0].filename;
    }

    // Parse complex JSON/array fields
    ['skills', 'interests', 'privacy', 'experienceSummary', 'projectsSummary', 'certificationsSummary', 'achievementsSummary'].forEach(field => {
      if (data[field] !== undefined) {
        data[field] = parseField(data, field);
      }
    });

    if (typeof data.skills === 'string') {
      data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof data.interests === 'string') {
      data.interests = data.interests.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Keep title in sync with headline
    if (data.headline && !data.title) data.title = data.headline;
    if (data.title && !data.headline) data.headline = data.title;

    let profile = await Profile.findOne({ user: req.user.id });
    if (profile) {
      profile = await Profile.findByIdAndUpdate(profile._id, data, { new: true, runValidators: true });
    } else {
      profile = await Profile.create({ ...data, user: req.user.id, isSetup: true });
    }

    // Sync key profile fields to User document
    const userUpdates = {};
    if (data.name) userUpdates.name = data.name;
    if (data.headline) userUpdates.headline = data.headline;
    if (data.primaryRole) userUpdates.primaryRole = data.primaryRole;
    if (data.experienceLevel) userUpdates.experienceLevel = data.experienceLevel;
    if (data.about) userUpdates.bio = data.about;
    if (data.location) userUpdates.location = data.location;
    if (data.college) userUpdates.college = data.college;
    if (data.department) userUpdates.department = data.department;
    if (data.degree) userUpdates.degree = data.degree;
    if (data.graduationYear) userUpdates.graduationYear = data.graduationYear;
    if (data.skills) userUpdates.skills = data.skills;
    if (data.interests) userUpdates.interests = data.interests;
    if (data.profileImage) userUpdates.avatar = data.profileImage;
    if (data.coverImage) userUpdates.bannerImage = data.coverImage;
    if (data.openToWork !== undefined) userUpdates.openToWork = data.openToWork === 'true' || data.openToWork === true;
    if (data.openToCollaborate !== undefined) userUpdates.openToCollaborate = data.openToCollaborate === 'true' || data.openToCollaborate === true;
    
    if (data.social?.github) {
      userUpdates.githubUsername = data.social.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
    }
    if (data.social?.linkedin) userUpdates.linkedinUrl = data.social.linkedin;
    if (data.social?.portfolio) userUpdates.websiteUrl = data.social.portfolio;

    if (data.privacy) {
      userUpdates.privacy = {
        profileVisibility: data.privacy.profileVisibility || 'public',
        showOnlineStatus: data.privacy.showOnlineStatus !== false,
        allowDirectMessages: data.privacy.allowDirectMessages || 'everyone',
        searchEngineIndexing: data.privacy.searchEngineIndexing !== false
      };
      userUpdates.isPrivate = data.privacy.profileVisibility === 'private';
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user.id, userUpdates);
    }

    res.json(profile);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc   Complete professional onboarding setup wizard
// @route  POST /api/profile/onboard
const setupOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const body = { ...req.body };
    delete body.user;
    delete body._id;

    const name = body.name?.trim() || req.user.username;
    const headline = body.headline?.trim() || 'Software Engineer';
    const primaryRole = body.primaryRole || 'Software Engineer';
    const experienceLevel = body.experienceLevel || 'Entry-Level / Fresher';
    const about = body.about?.trim() || '';
    const college = body.college?.trim() || '';
    const department = body.department?.trim() || '';
    const degree = body.degree?.trim() || 'B.Tech / B.E.';
    const graduationYear = body.graduationYear?.trim() || '';
    const cgpa = body.cgpa?.trim() || '';
    const location = body.location?.trim() || '';
    
    // Skills & Interests
    let skills = parseField(body, 'skills') || [];
    if (typeof skills === 'string') skills = skills.split(',').map(s => s.trim()).filter(Boolean);
    let interests = parseField(body, 'interests') || [];
    if (typeof interests === 'string') interests = interests.split(',').map(s => s.trim()).filter(Boolean);

    // Social links
    const github = body.github?.trim() || body.social?.github || '';
    const linkedin = body.linkedin?.trim() || body.social?.linkedin || '';
    const website = body.website?.trim() || body.websiteUrl?.trim() || '';

    // Privacy controls
    let privacy = parseField(body, 'privacy') || {
      profileVisibility: 'public',
      showOnlineStatus: true,
      allowDirectMessages: 'everyone',
      searchEngineIndexing: true,
      showEducation: true,
      showExperience: true
    };

    // Images
    let profileImage = body.profileImage || '';
    let coverImage = body.coverImage || '';
    if (req.files?.profileImage) {
      profileImage = req.files.profileImage[0].path.startsWith('http')
        ? req.files.profileImage[0].path
        : '/uploads/' + req.files.profileImage[0].filename;
    }
    if (req.files?.coverImage) {
      coverImage = req.files.coverImage[0].path.startsWith('http')
        ? req.files.coverImage[0].path
        : '/uploads/' + req.files.coverImage[0].filename;
    }

    // Summaries
    const experienceSummary = parseField(body, 'experienceSummary') || [];
    const projectsSummary = parseField(body, 'projectsSummary') || [];
    const certificationsSummary = parseField(body, 'certificationsSummary') || [];
    const achievementsSummary = parseField(body, 'achievementsSummary') || [];

    // Find or create profile
    let profile = await Profile.findOne({ user: userId });
    const profilePayload = {
      user: userId,
      name,
      title: headline,
      headline,
      primaryRole,
      experienceLevel,
      about,
      email: req.user.email,
      location,
      college,
      department,
      degree,
      graduationYear,
      cgpa,
      skills,
      interests,
      domains: interests.length > 0 ? interests : ['Software Engineering', 'Open Source'],
      social: {
        github,
        linkedin,
        portfolio: website
      },
      privacy,
      experienceSummary,
      projectsSummary,
      certificationsSummary,
      achievementsSummary,
      openToWork: body.openToWork !== undefined ? (body.openToWork === 'true' || body.openToWork === true) : true,
      openToCollaborate: body.openToCollaborate !== undefined ? (body.openToCollaborate === 'true' || body.openToCollaborate === true) : true,
      isSetup: true
    };

    if (profileImage) profilePayload.profileImage = profileImage;
    if (coverImage) profilePayload.coverImage = coverImage;

    if (profile) {
      profile = await Profile.findByIdAndUpdate(profile._id, profilePayload, { new: true, runValidators: true });
    } else {
      profile = await Profile.create(profilePayload);
    }

    // Sync to User model
    const userUpdates = {
      name,
      headline,
      primaryRole,
      experienceLevel,
      bio: about,
      location,
      college,
      department,
      degree,
      graduationYear,
      skills,
      interests,
      githubUsername: github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, ''),
      linkedinUrl: linkedin,
      websiteUrl: website,
      openToWork: profilePayload.openToWork,
      openToCollaborate: profilePayload.openToCollaborate,
      privacy: {
        profileVisibility: privacy.profileVisibility || 'public',
        showOnlineStatus: privacy.showOnlineStatus !== false,
        allowDirectMessages: privacy.allowDirectMessages || 'everyone',
        searchEngineIndexing: privacy.searchEngineIndexing !== false
      },
      isPrivate: privacy.profileVisibility === 'private',
      isOnboarded: true
    };
    if (profileImage) userUpdates.avatar = profileImage;
    if (coverImage) userUpdates.bannerImage = coverImage;

    const updatedUser = await User.findByIdAndUpdate(userId, userUpdates, { new: true });

    // Synchronize relational models for immediate 3D portfolio and CMS integration
    // 1. Education
    if (college) {
      await Education.deleteMany({ user: userId });
      await Education.create({
        user: userId,
        college,
        department: department || 'Computer Science / Engineering',
        degree: degree || 'Bachelor of Science / Engineering',
        graduationYear: graduationYear || String(new Date().getFullYear()),
        cgpa: cgpa || ''
      });
    }

    // 2. Skills
    if (Array.isArray(skills) && skills.length > 0) {
      await Skill.deleteMany({ user: userId });
      const skillDocs = skills.map((s, idx) => ({
        user: userId,
        name: typeof s === 'string' ? s : (s.name || ''),
        level: typeof s === 'object' && s.level ? Number(s.level) : 85,
        category: typeof s === 'object' && s.category ? s.category : 'Core',
        order: idx
      })).filter(doc => doc.name);
      if (skillDocs.length > 0) await Skill.insertMany(skillDocs);
    }

    // 3. Projects
    if (Array.isArray(projectsSummary) && projectsSummary.length > 0) {
      await Project.deleteMany({ user: userId });
      const projDocs = projectsSummary.map((p, idx) => ({
        user: userId,
        title: p.title || 'Builder Project',
        description: p.description || '',
        techStack: Array.isArray(p.techStack) ? p.techStack : (p.techStack ? p.techStack.split(',').map(t => t.trim()) : []),
        githubLink: p.githubLink || '',
        liveLink: p.liveLink || '',
        order: idx
      }));
      await Project.insertMany(projDocs);
    }

    // 4. Experience
    if (Array.isArray(experienceSummary) && experienceSummary.length > 0) {
      await Experience.deleteMany({ user: userId });
      const expDocs = experienceSummary.map((exp, idx) => ({
        user: userId,
        company: exp.company || '',
        role: exp.role || '',
        duration: exp.duration || '',
        description: exp.description || '',
        order: idx
      }));
      await Experience.insertMany(expDocs);
    }

    // 5. Certifications
    if (Array.isArray(certificationsSummary) && certificationsSummary.length > 0) {
      await Certificate.deleteMany({ user: userId });
      const certDocs = certificationsSummary.map((c, idx) => ({
        user: userId,
        name: c.name || '',
        issuer: c.issuer || '',
        issueDate: c.issueDate || '',
        credentialUrl: c.credentialUrl || '',
        order: idx
      }));
      await Certificate.insertMany(certDocs);
    }

    // 6. Achievements
    if (Array.isArray(achievementsSummary) && achievementsSummary.length > 0) {
      await Achievement.deleteMany({ user: userId });
      const achDocs = achievementsSummary.map((a, idx) => ({
        user: userId,
        title: a.title || '',
        description: a.description || '',
        date: a.date || '',
        order: idx
      }));
      await Achievement.insertMany(achDocs);
    }

    res.status(200).json({
      message: 'Onboarding setup completed successfully',
      profile,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        isOnboarded: updatedUser.isOnboarded,
        headline: updatedUser.headline,
        avatar: updatedUser.avatar,
        bannerImage: updatedUser.bannerImage,
        reputationPoints: updatedUser.reputationPoints,
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error('Onboarding Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update privacy preferences
// @route  PUT /api/profile/privacy
const updatePrivacy = async (req, res) => {
  try {
    const { profileVisibility, showOnlineStatus, allowDirectMessages, searchEngineIndexing, showEducation, showExperience } = req.body;
    
    const privacyUpdate = {};
    if (profileVisibility) privacyUpdate['privacy.profileVisibility'] = profileVisibility;
    if (showOnlineStatus !== undefined) privacyUpdate['privacy.showOnlineStatus'] = showOnlineStatus;
    if (allowDirectMessages) privacyUpdate['privacy.allowDirectMessages'] = allowDirectMessages;
    if (searchEngineIndexing !== undefined) privacyUpdate['privacy.searchEngineIndexing'] = searchEngineIndexing;
    if (showEducation !== undefined) privacyUpdate['privacy.showEducation'] = showEducation;
    if (showExperience !== undefined) privacyUpdate['privacy.showExperience'] = showExperience;

    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      { $set: privacyUpdate },
      { new: true }
    );

    const userPrivacyUpdates = {};
    if (profileVisibility) {
      userPrivacyUpdates['privacy.profileVisibility'] = profileVisibility;
      userPrivacyUpdates.isPrivate = profileVisibility === 'private';
    }
    if (showOnlineStatus !== undefined) userPrivacyUpdates['privacy.showOnlineStatus'] = showOnlineStatus;
    if (allowDirectMessages) userPrivacyUpdates['privacy.allowDirectMessages'] = allowDirectMessages;
    if (searchEngineIndexing !== undefined) userPrivacyUpdates['privacy.searchEngineIndexing'] = searchEngineIndexing;

    await User.findByIdAndUpdate(req.user.id, { $set: userPrivacyUpdates });

    res.json({ message: 'Privacy preferences updated', privacy: profile?.privacy });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc   Get a user's public profile by username
// @route  GET /api/profile/public/:username
const getPublicProfile = async (req, res) => {
  try {
    const targetUserId = req.portfolioUser._id;
    const isOwner = req.user && req.user.id.toString() === targetUserId.toString();

    // Bidirectional block check
    if (req.user && !isOwner) {
      const isBlocked = await BlockedUser.findOne({
        $or: [
          { user: req.user.id, blockedUser: targetUserId },
          { user: targetUserId, blockedUser: req.user.id }
        ]
      });
      if (isBlocked) {
        return res.status(403).json({ message: 'Profile is not accessible' });
      }
    }

    const [profile, userDoc] = await Promise.all([
      Profile.findOne({ user: targetUserId }).lean(),
      User.findById(targetUserId).select('username name primaryRole experienceLevel headline avatar bannerImage reputationPoints connectionsCount followersCount followingCount openToWork openToCollaborate isPrivate privacy college department graduationYear skills interests').lean()
    ]);

    // Check privacy settings if not the profile owner
    const visibility = profile?.privacy?.profileVisibility || userDoc?.privacy?.profileVisibility || (userDoc?.isPrivate ? 'private' : 'public');
    
    if (!isOwner && visibility === 'private') {
      return res.status(200).json({
        username: req.portfolioUser.username,
        isPrivate: true,
        message: 'This builder profile is private'
      });
    }

    if (!isOwner && visibility === 'network') {
      let isConnected = false;
      if (req.user) {
        const conn = await Connection.findOne({
          $or: [
            { requester: req.user.id, recipient: targetUserId, status: 'accepted' },
            { requester: targetUserId, recipient: req.user.id, status: 'accepted' }
          ]
        });
        if (conn) isConnected = true;
      }

      if (!isConnected) {
        return res.status(200).json({
          username: req.portfolioUser.username,
          name: profile?.name || userDoc?.name || userDoc?.username,
          headline: profile?.headline || userDoc?.headline,
          primaryRole: profile?.primaryRole || userDoc?.primaryRole,
          avatar: profile?.profileImage || userDoc?.avatar,
          bannerImage: profile?.coverImage || userDoc?.bannerImage,
          reputationPoints: userDoc?.reputationPoints || 100,
          isNetworkOnly: true,
          message: 'Connect with this builder to view their complete portfolio and history'
        });
      }
    }

    if (!profile) {
      return res.json({
        username: req.portfolioUser.username,
        isSetup: false,
        ...(userDoc || {})
      });
    }
    
    // Fetch all related sections in parallel
    const excludeFields = '-createdAt -updatedAt -__v';
    const [skills, projects, experience, education, achievements, certificates, activities, whyHire] = await Promise.all([
      Skill.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean(),
      Project.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean(),
      Experience.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean(),
      Education.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean(),
      Achievement.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean(),
      Certificate.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean(),
      Activity.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean(),
      WhyHire.find({ user: targetUserId }).select(excludeFields).sort({ order: 1, createdAt: -1 }).lean()
    ]);

    res.json({ 
      ...profile,
      ...(userDoc || {}),
      username: req.portfolioUser.username, 
      isSetup: true,
      collections: {
        skills, projects, experience, education, achievements, certificates, activities, whyHire
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  setupOnboarding,
  updatePrivacy,
  getPublicProfile
};
