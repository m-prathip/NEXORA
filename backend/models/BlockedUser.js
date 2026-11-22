const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  blockedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [300, 'Reason cannot exceed 300 characters']
  }
}, {
  timestamps: true
});

// Ensure a user cannot block the same user multiple times
blockedUserSchema.index({ user: 1, blockedUser: 1 }, { unique: true });
blockedUserSchema.index({ blockedUser: 1, user: 1 });

module.exports = mongoose.model('BlockedUser', blockedUserSchema);
