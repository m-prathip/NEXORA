const mongoose = require('mongoose');

const emailVerificationTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  resendCount: {
    type: Number,
    default: 0
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// TTL index to automatically purge expired tokens after 48 hours
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 48 * 3600 });
emailVerificationTokenSchema.index({ user: 1, usedAt: 1 });

module.exports = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);

