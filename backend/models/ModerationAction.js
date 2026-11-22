const mongoose = require('mongoose');

const moderationActionSchema = new mongoose.Schema({
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'suspend_user',
      'restore_user',
      'warn_user',
      'remove_post',
      'restore_post',
      'remove_comment',
      'restore_comment',
      'suspend_community',
      'restore_community',
      'approve_opportunity',
      'reject_opportunity',
      'resolve_report',
      'dismiss_report'
    ],
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['User', 'Post', 'Comment', 'Community', 'Opportunity', 'Report'],
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
    trim: true,
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  durationDays: {
    type: Number,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

moderationActionSchema.index({ targetType: 1, targetId: 1 });
moderationActionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModerationAction', moderationActionSchema);
