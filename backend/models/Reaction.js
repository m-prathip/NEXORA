const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['Post', 'Comment'],
    default: 'Post'
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['like', 'celebrate', 'insightful', 'love'],
    required: true
  }
}, {
  timestamps: true
});

reactionSchema.index({ user: 1, targetId: 1 }, { unique: true });
reactionSchema.index({ targetId: 1, type: 1 });

module.exports = mongoose.model('Reaction', reactionSchema);
