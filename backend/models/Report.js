const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['Community', 'Post', 'Comment', 'CollaborationRequest', 'User', 'Opportunity'],
    required: true,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: [
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
    ],
    required: [true, 'Report reason is required']
  },
  details: {
    type: String,
    trim: true,
    maxlength: [1000, 'Details cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  assignedModerator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Resolution notes cannot exceed 2000 characters']
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'content_removed', 'user_suspended', 'dismissed', 'other'],
    default: 'none'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Prevent duplicate reports on same target by same reporter
reportSchema.index({ targetId: 1, reporter: 1 }, { unique: true });
reportSchema.index({ targetType: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
