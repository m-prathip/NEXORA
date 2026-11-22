const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['hackathon', 'workshop', 'meetup', 'tech_talk', 'ama'],
    default: 'hackathon',
    index: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  location: {
    type: String,
    default: 'Online'
  },
  isVirtual: {
    type: Boolean,
    default: true
  },
  link: {
    type: String,
    trim: true
  },
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['going', 'interested'], default: 'going' },
    rsvpAt: { type: Date, default: Date.now }
  }],
  attendeesCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

eventSchema.index({ startDate: 1, type: 1 });

module.exports = mongoose.model('Event', eventSchema);
