const router = require('express').Router();
const { 
  getOpportunities, 
  createOpportunity, 
  toggleSaveOpportunity, 
  trackApplication,
  getMyTrackedOpportunities 
} = require('../controllers/opportunityController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getOpportunities);
router.post('/', protect, createOpportunity);
router.get('/my/tracked', protect, getMyTrackedOpportunities);
router.post('/:oppId/save', protect, toggleSaveOpportunity);
router.post('/:oppId/track', protect, trackApplication);
router.post('/:oppId/apply', protect, trackApplication); // alias

module.exports = router;
