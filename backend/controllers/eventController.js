const Event = require('../models/Event');

// @desc   Get all upcoming events
// @route  GET /api/events
const getEvents = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type && type !== 'All') {
      filter.type = type;
    }

    const events = await Event.find(filter)
      .sort('startDate')
      .populate('organizer', 'username primaryRole')
      .lean();

    const userId = req.user?.id;
    const formatted = events.map(e => {
      const myRsvp = userId ? (e.attendees || []).find(a => a.user?.toString() === userId.toString()) : null;
      return {
        ...e,
        myRsvpStatus: myRsvp ? myRsvp.status : null
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create an event
// @route  POST /api/events
const createEvent = async (req, res) => {
  try {
    const { title, type, description, startDate, endDate, location, isVirtual, link, tags = [] } = req.body;

    if (!title || !description || !startDate) {
      return res.status(400).json({ message: 'Title, description, and startDate are required' });
    }

    const event = await Event.create({
      title: title.trim(),
      organizer: req.user.id,
      type: type || 'hackathon',
      description: description.trim(),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      location: location || 'Online',
      isVirtual: isVirtual !== undefined ? isVirtual : true,
      link: link || '',
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean),
      attendees: [{ user: req.user.id, status: 'going' }],
      attendeesCount: 1
    });

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   RSVP to event
// @route  POST /api/events/:eventId/rsvp
const rsvpEvent = async (req, res) => {
  try {
    const { status = 'going' } = req.body;
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const userId = req.user.id;
    const existingIndex = event.attendees.findIndex(a => a.user.toString() === userId.toString());

    if (existingIndex > -1) {
      if (status === 'not_going') {
        event.attendees.splice(existingIndex, 1);
        event.attendeesCount = Math.max(0, event.attendeesCount - 1);
      } else {
        event.attendees[existingIndex].status = status;
      }
    } else {
      if (status !== 'not_going') {
        event.attendees.push({ user: userId, status });
        event.attendeesCount += 1;
      }
    }

    await event.save();
    res.json({ message: 'RSVP updated', myRsvpStatus: status, attendeesCount: event.attendeesCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getEvents,
  createEvent,
  rsvpEvent
};
