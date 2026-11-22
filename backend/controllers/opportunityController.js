const Opportunity = require('../models/Opportunity');
const User = require('../models/User');

// @desc   Get opportunities with filtering, pagination, and saved status
// @route  GET /api/opportunities
const getOpportunities = async (req, res) => {
  try {
    const { type, locationType, q, savedOnly, page = 1, limit = 12 } = req.query;
    const filter = { status: 'active' };

    if (type && type !== 'All') {
      filter.type = type;
    }
    if (locationType && locationType !== 'All') {
      filter.locationType = locationType;
    }
    if (q && q.trim()) {
      const qRegex = { $regex: q.trim(), $options: 'i' };
      filter.$or = [
        { title: qRegex },
        { company: qRegex },
        { skills: qRegex },
        { description: qRegex }
      ];
    }

    const userId = req.user?.id;
    if (savedOnly === 'true' && userId) {
      filter.savedBy = userId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [total, opportunities] = await Promise.all([
      Opportunity.countDocuments(filter),
      Opportunity.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('poster', 'username primaryRole avatar')
        .lean()
    ]);

    const result = opportunities.map(o => {
      const myApp = userId ? (o.applications || []).find(a => a.user?.toString() === userId.toString()) : null;
      return {
        ...o,
        isSaved: userId ? (o.savedBy || []).some(id => id.toString() === userId.toString()) : false,
        myTracking: myApp ? {
          status: myApp.status,
          appliedAt: myApp.appliedAt,
          notes: myApp.notes
        } : null,
        // Shield raw applications array from public response
        applications: undefined
      };
    });

    res.json({
      opportunities: result,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: skip + opportunities.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create new opportunity with verified source URL & dates
// @route  POST /api/opportunities
const createOpportunity = async (req, res) => {
  try {
    const { 
      title, 
      company, 
      type = 'internship', 
      locationType = 'remote', 
      location = 'Remote', 
      description, 
      skills = [], 
      salary = 'Competitive', 
      sourceUrl, 
      deadline,
      eventDate
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Opportunity title is required' });
    }
    if (!company || !company.trim()) {
      return res.status(400).json({ message: 'Company or organizer is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!sourceUrl || !sourceUrl.trim()) {
      return res.status(400).json({ message: 'Verified source URL is required for all opportunities' });
    }

    const validTypes = ['internship', 'fresher_job', 'hackathon', 'competition', 'workshop', 'freelance'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid opportunity type' });
    }

    const opp = await Opportunity.create({
      title: title.trim(),
      company: company.trim(),
      poster: req.user.id,
      type,
      locationType,
      location: location.trim(),
      description: description.trim(),
      skills: Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(Boolean),
      salary: salary.trim(),
      sourceUrl: sourceUrl.trim(),
      deadline: deadline ? new Date(deadline) : undefined,
      eventDate: eventDate ? new Date(eventDate) : undefined
    });

    await User.findByIdAndUpdate(req.user.id, { $inc: { reputationPoints: 10 } });

    res.status(201).json(opp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Toggle bookmark / save opportunity
// @route  POST /api/opportunities/:oppId/save
const toggleSaveOpportunity = async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.oppId);
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    const userId = req.user.id;
    const isSaved = opp.savedBy.some(id => id.toString() === userId.toString());

    if (isSaved) {
      opp.savedBy = opp.savedBy.filter(id => id.toString() !== userId.toString());
      await opp.save();
      return res.json({ saved: false });
    } else {
      opp.savedBy.push(userId);
      await opp.save();
      return res.json({ saved: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Track application status (applied, interviewing, offered, rejected)
// @route  POST /api/opportunities/:oppId/track
const trackApplication = async (req, res) => {
  try {
    const { status = 'applied', notes } = req.body;
    const oppId = req.params.oppId;
    const userId = req.user.id;

    const validStatuses = ['applied', 'interviewing', 'offered', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid application status' });
    }

    const opp = await Opportunity.findById(oppId);
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    let app = opp.applications.find(a => a.user.toString() === userId.toString());

    if (app) {
      app.status = status;
      if (notes !== undefined) app.notes = notes;
    } else {
      opp.applications.push({
        user: userId,
        status,
        notes: notes || '',
        appliedAt: new Date()
      });
      opp.applicantsCount = (opp.applicantsCount || 0) + 1;
    }

    await opp.save();
    res.json({ message: `Application status updated to ${status}`, tracking: { status, notes } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get opportunities tracked by authenticated user
// @route  GET /api/opportunities/my/tracked
const getMyTrackedOpportunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const opportunities = await Opportunity.find({ 'applications.user': userId })
      .select('title company type location locationType salary sourceUrl deadline status applications')
      .sort('-updatedAt')
      .lean();

    const trackedList = opportunities.map(o => {
      const myApp = o.applications.find(a => a.user.toString() === userId.toString());
      return {
        opportunityId: o._id,
        title: o.title,
        company: o.company,
        type: o.type,
        location: o.location,
        salary: o.salary,
        sourceUrl: o.sourceUrl,
        deadline: o.deadline,
        opportunityStatus: o.status,
        myTracking: {
          status: myApp.status,
          appliedAt: myApp.appliedAt,
          notes: myApp.notes
        }
      };
    });

    res.json(trackedList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getOpportunities,
  createOpportunity,
  toggleSaveOpportunity,
  trackApplication,
  getMyTrackedOpportunities
};
