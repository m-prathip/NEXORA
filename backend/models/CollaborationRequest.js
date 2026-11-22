const mongoose = require('mongoose');

const collaborationRequestSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [160, 'Title cannot exceed 160 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    enum: ['AI & ML', 'Full-Stack Web', 'Mobile App', 'Open Source Tool', 'Developer Infra', 'Web3 & Security', 'Design & UI/UX'],
    default: 'Full-Stack Web',
    index: true
  },
  technologies: [{
    type: String,
    trim: true
  }],
  rolesNeeded: [{
    role: { type: String, required: true, trim: true },
    skills: [{ type: String, trim: true }],
    spots: { type: Number, default: 1, min: 1 },
    spotsFilled: { type: Number, default: 0, min: 0 }
  }],
  images: [{
    url: { type: String, required: true },
    caption: { type: String, trim: true }
  }],
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'closed'],
    default: 'open',
    index: true
  },
  teamMembers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'Contributor' },
    joinedAt: { type: Date, default: Date.now }
  }],
  applications: [{
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roleAppliedFor: { type: String, required: true },
    pitch: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    appliedAt: { type: Date, default: Date.now }
  }],
  githubUrl: {
    type: String,
    trim: true
  },
  liveUrl: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

collaborationRequestSchema.index({ status: 1, createdAt: -1 });
collaborationRequestSchema.index({ 'rolesNeeded.skills': 1 });
collaborationRequestSchema.index({ technologies: 1 });
collaborationRequestSchema.index({ creator: 1, createdAt: -1 });
collaborationRequestSchema.index({ 'applications.applicant': 1 });

module.exports = mongoose.model('CollaborationRequest', collaborationRequestSchema);
