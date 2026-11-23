const mongoose = require('mongoose');

const routeTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  jti: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  routeId: {
    type: String,
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    default: null
  },
  purpose: {
    type: String,
    enum: ['NAV', 'SHARE', 'SINGLE_USE', 'ADMIN_DEEP_LINK'],
    default: 'NAV',
    index: true
  },
  isSingleUse: {
    type: Boolean,
    default: false,
    index: true
  },
  isConsumed: {
    type: Boolean,
    default: false,
    index: true
  },
  consumedAt: {
    type: Date,
    default: null
  },
  consumedByIp: {
    type: String,
    default: null
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  revocationReason: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// TTL index to automatically purge expired tokens from MongoDB collection
// Note: Declared on schema.index only to avoid Mongoose duplicate index warning
routeTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RouteToken', routeTokenSchema);
