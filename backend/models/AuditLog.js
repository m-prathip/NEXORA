const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Actor ID is required'],
    index: true
  },
  actorRole: {
    type: String,
    required: [true, 'Actor role is required'],
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action name is required'],
    index: true
  },
  targetResource: {
    type: String,
    required: [true, 'Target resource is required'],
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
  reason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
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
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for rapid filtering in Admin Audit Logs UI
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetResource: 1, targetId: 1 });

// Immutability enforcement: Block updates and deletions
const immutabilityError = function (next) {
  next(new Error('Audit logs are immutable and cannot be modified or deleted.'));
};

auditLogSchema.pre('updateOne', immutabilityError);
auditLogSchema.pre('updateMany', immutabilityError);
auditLogSchema.pre('findOneAndUpdate', immutabilityError);
auditLogSchema.pre('replaceOne', immutabilityError);
auditLogSchema.pre('deleteOne', immutabilityError);
auditLogSchema.pre('deleteMany', immutabilityError);
auditLogSchema.pre('findOneAndDelete', immutabilityError);

module.exports = mongoose.model('AuditLog', auditLogSchema);
