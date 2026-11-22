const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: {
    type: String,
    enum: [
      'connection_request', 'connection_accepted', 'new_follower',
      'post_like', 'post_comment', 'comment_reply', 'post_mention',
      'collab_invitation', 'collab_application', 'collab_status',
      'opportunity_match', 'message_new', 'community_invite', 'system'
    ],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
