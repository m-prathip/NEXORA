const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1500, 'Description cannot exceed 1500 characters']
  },
  category: {
    type: String,
    enum: ['AI & Machine Learning', 'Web & Frontend', 'Backend & Cloud', 'Open Source', 'Design & UI/UX', 'Mobile & GameDev', 'Career & Freelance'],
    default: 'Open Source',
    index: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  avatar: {
    type: String,
    default: ''
  },
  banner: {
    type: String,
    default: ''
  },
  rules: [{
    type: String,
    trim: true,
    maxlength: 300
  }],
  membersCount: {
    type: Number,
    default: 1
  },
  postsCount: {
    type: Number,
    default: 0
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'restricted'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

communitySchema.index({ slug: 1 }, { unique: true });
communitySchema.index({ category: 1, membersCount: -1 });
communitySchema.index({ creator: 1 });

module.exports = mongoose.model('Community', communitySchema);
