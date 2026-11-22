const Report = require('../models/Report');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const Opportunity = require('../models/Opportunity');
const PlatformEvent = require('../models/PlatformEvent');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc   Submit a report for inappropriate content or user misconduct
// @route  POST /api/reports
const submitReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: 'Target type, target ID, and reason are required' });
    }

    const validTargetTypes = ['Community', 'Post', 'Comment', 'CollaborationRequest', 'User', 'Opportunity'];
    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({ message: `Invalid target type. Must be one of: ${validTargetTypes.join(', ')}` });
    }

    // Disallow reporting oneself
    if (targetType === 'User' && targetId.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot report your own account' });
    }

    // Normalize reason (e.g., 'fake-profile' -> 'fake_profile')
    const normalizedReason = String(reason).trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');

    const validReasons = [
      'fake_profile',
      'spam',
      'harassment',
      'impersonation',
      'inappropriate_behaviour',
      'inappropriate_content',
      'fraud_scam',
      'fraudulent_opportunity',
      'abusive_comment',
      'copyright',
      'misleading',
      'hate_speech',
      'other'
    ];

    const finalReason = validReasons.includes(normalizedReason) ? normalizedReason : 'other';

    const existing = await Report.findOne({
      reporter: req.user.id,
      targetId
    });

    if (existing) {
      return res.status(400).json({ message: 'You have already reported this item. Our moderation team is reviewing it.' });
    }

    const report = await Report.create({
      reporter: req.user.id,
      targetType,
      targetId,
      reason: finalReason,
      details: details ? String(details).trim() : ''
    });

    // Record platform analytics event
    await PlatformEvent.create({
      eventType: 'report_submit',
      actor: req.user.id,
      targetId: report._id,
      metadata: { targetType, reason: finalReason }
    }).catch(() => {});

    res.status(201).json({
      message: 'Report submitted successfully. Thank you for keeping NEXORA safe.',
      reportId: report._id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get reports queue (Moderators & Admins)
// @route  GET /api/reports
const getReports = async (req, res) => {
  try {
    const { status, targetType, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (targetType && targetType !== 'all') filter.targetType = targetType;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('reporter', 'username email name avatar')
        .populate('assignedModerator', 'username email name')
        .populate('resolvedBy', 'username email name')
        .lean(),
      Report.countDocuments(filter)
    ]);

    // Populate target entity snapshot for review
    const enrichedReports = await Promise.all(
      reports.map(async (r) => {
        let targetSnapshot = null;
        try {
          if (r.targetType === 'User') {
            targetSnapshot = await User.findById(r.targetId).select('username email name status role avatar createdAt').lean();
          } else if (r.targetType === 'Post') {
            targetSnapshot = await Post.findById(r.targetId).select('content author postType images createdAt isModerated').populate('author', 'username name').lean();
          } else if (r.targetType === 'Comment') {
            targetSnapshot = await Comment.findById(r.targetId).select('content user post createdAt').populate('user', 'username name').lean();
          } else if (r.targetType === 'Community') {
            targetSnapshot = await Community.findById(r.targetId).select('name description membersCount creator status').lean();
          } else if (r.targetType === 'Opportunity') {
            targetSnapshot = await Opportunity.findById(r.targetId).select('title company type status sourceUrl').lean();
          }
        } catch (e) {
          targetSnapshot = null;
        }

        return {
          ...r,
          targetSnapshot
        };
      })
    );

    res.json({
      reports: enrichedReports,
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

// @desc   Resolve or dismiss a report
// @route  PATCH /api/reports/:id/resolve
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes, actionTaken } = req.body;

    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be resolved or dismissed' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;
    report.resolutionNotes = resolutionNotes ? String(resolutionNotes).trim() : '';
    report.actionTaken = actionTaken || 'none';
    report.resolvedBy = req.user.id;
    report.resolvedAt = new Date();

    await report.save();

    await recordAuditLog(req, {
      action: status === 'resolved' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      targetResource: 'Report',
      targetId: report._id,
      metadata: { targetType: report.targetType, targetId: report.targetId, actionTaken: report.actionTaken },
      reason: resolutionNotes
    });

    res.json({ message: `Report marked as ${status}`, report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Assign report to moderator
// @route  PATCH /api/reports/:id/assign
const assignReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorId } = req.body;

    const targetMod = moderatorId || req.user.id;
    const modUser = await User.findById(targetMod);
    if (!modUser) {
      return res.status(404).json({ message: 'Moderator not found' });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { assignedModerator: targetMod, status: 'investigating' },
      { new: true }
    );

    if (!report) return res.status(404).json({ message: 'Report not found' });

    await recordAuditLog(req, {
      action: 'REPORT_ASSIGNED',
      targetResource: 'Report',
      targetId: report._id,
      metadata: { assignedTo: modUser.username },
      reason: 'Moderator assigned ticket'
    });

    res.json({ message: 'Report assigned successfully', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  submitReport,
  getReports,
  resolveReport,
  assignReport
};
