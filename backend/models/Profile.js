const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  title: { type: String, required: true },
  about: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  location: { type: String },
  profileImage: { type: String },
  resumeUrl: { type: String },
  social: {
    linkedin: { type: String },
    github: { type: String },
    portfolio: { type: String },
    twitter: { type: String },
    instagram: { type: String }
  },
  domains: [{ type: String }],
  isSetup: { type: Boolean, default: false },
  mode: { type: String, enum: ['light', 'dark'], default: 'dark' },
  theme: { type: String, default: 'ocean' },
  background: { type: String, default: 'particles' },
  backgroundConfig: { type: Object, default: {} },
  // NEXORA Builder Fields
  coverImage: { type: String, default: '' },
  headline: { type: String, trim: true, default: '' },
  primaryRole: { type: String, default: 'Software Engineer' },
  experienceLevel: { type: String, default: 'Entry-Level / Fresher' },
  college: { type: String, trim: true, default: '' },
  department: { type: String, trim: true, default: '' },
  degree: { type: String, trim: true, default: '' },
  graduationYear: { type: String, trim: true, default: '' },
  cgpa: { type: String, trim: true, default: '' },
  skills: [{ type: String, trim: true }],
  interests: [{ type: String, trim: true }],
  experienceSummary: [{
    company: { type: String, default: '' },
    role: { type: String, default: '' },
    duration: { type: String, default: '' },
    description: { type: String, default: '' }
  }],
  projectsSummary: [{
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    techStack: [{ type: String }],
    githubLink: { type: String, default: '' },
    liveLink: { type: String, default: '' }
  }],
  certificationsSummary: [{
    name: { type: String, default: '' },
    issuer: { type: String, default: '' },
    issueDate: { type: String, default: '' },
    credentialUrl: { type: String, default: '' }
  }],
  achievementsSummary: [{
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    date: { type: String, default: '' }
  }],
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'network', 'private'], default: 'public' },
    showOnlineStatus: { type: Boolean, default: true },
    allowDirectMessages: { type: String, enum: ['everyone', 'connections'], default: 'everyone' },
    searchEngineIndexing: { type: Boolean, default: true },
    showEducation: { type: Boolean, default: true },
    showExperience: { type: Boolean, default: true }
  },
  openToCollaborate: { type: Boolean, default: true },
  openToWork: { type: Boolean, default: true },
  badges: [{
    badgeId: { type: String },
    label: { type: String },
    icon: { type: String },
    awardedAt: { type: Date, default: Date.now }
  }],
  aiSummary: { type: String, default: '' },
  careerRoadmap: { type: Object, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
