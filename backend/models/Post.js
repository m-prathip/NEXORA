const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    trim: true,
    maxlength: [5000, 'Post content cannot exceed 5000 characters']
  },
  postType: {
    type: String,
    enum: ['text', 'project_announcement', 'build_in_public', 'article', 'milestone', 'help_wanted'],
    default: 'text',
    index: true
  },
  media: [{
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'document'], default: 'image' },
    caption: { type: String, trim: true }
  }],
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  codeSnippet: {
    code: { type: String },
    language: { type: String, default: 'javascript' },
    title: { type: String }
  },
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  reactionsCount: {
    like: { type: Number, default: 0 },
    celebrate: { type: Number, default: 0 },
    insightful: { type: Number, default: 0 },
    love: { type: Number, default: 0 }
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  repostsCount: {
    type: Number,
    default: 0
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  },
  visibility: {
    type: String,
    enum: ['public', 'connections', 'community'],
    default: 'public'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isModerated: {
    type: Boolean,
    default: false,
    index: true
  },
  moderationReason: {
    type: String,
    default: ''
  },
  moderatedAt: {
    type: Date
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ postType: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
