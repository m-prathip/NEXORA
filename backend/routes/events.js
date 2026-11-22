const router = require('express').Router();
const { getEvents, createEvent, rsvpEvent } = require('../controllers/eventController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getEvents);
router.post('/', protect, createEvent);
router.post('/:eventId/rsvp', protect, rsvpEvent);

module.exports = router;
