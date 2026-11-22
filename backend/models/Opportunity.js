const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Opportunity title is required'],
    trim: true,
    maxlength: [160, 'Title cannot exceed 160 characters']
  },
  company: {
    type: String,
    required: [true, 'Company / Organizer is required'],
    trim: true
  },
  poster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['internship', 'fresher_job', 'hackathon', 'competition', 'workshop', 'freelance'],
    default: 'internship',
    index: true
  },
  locationType: {
    type: String,
    enum: ['remote', 'hybrid', 'on_site'],
    default: 'remote'
  },
  location: {
    type: String,
    default: 'Remote'
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  skills: [{
    type: String,
    trim: true
  }],
  salary: {
    type: String,
    default: 'Competitive'
  },
  sourceUrl: {
    type: String,
    required: [true, 'Source URL is required for external verification'],
    trim: true
  },
  deadline: {
    type: Date,
    index: true
  },
  eventDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'closed', 'rejected'],
    default: 'pending',
    index: true
  },
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  applications: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['applied', 'interviewing', 'offered', 'rejected'],
      default: 'applied'
    },
    appliedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true }
  }],
  applicantsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

opportunitySchema.index({ type: 1, status: 1, createdAt: -1 });
opportunitySchema.index({ savedBy: 1 });
opportunitySchema.index({ 'applications.user': 1 });
opportunitySchema.index({ deadline: 1 });

module.exports = mongoose.model('Opportunity', opportunitySchema);
