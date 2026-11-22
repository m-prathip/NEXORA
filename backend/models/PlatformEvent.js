const mongoose = require('mongoose');

const platformEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: [
      'page_view',
      'profile_view',
      'connection_request',
      'connection_accept',
      'post_create',
      'post_like',
      'opportunity_view',
      'opportunity_click',
      'collab_apply',
      'community_join',
      'report_submit'
    ],
    required: true,
    index: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for rapid aggregation in Analytics dashboards
platformEventSchema.index({ eventType: 1, createdAt: -1 });
platformEventSchema.index({ actor: 1, createdAt: -1 });
platformEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PlatformEvent', platformEventSchema);
