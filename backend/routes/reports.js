const router = require('express').Router();
const { 
  submitReport, 
  getReports, 
  resolveReport, 
  assignReport 
} = require('../controllers/reportController');
const { protect, requireModerator } = require('../middleware/auth');

// Public authenticated user can submit reports
router.post('/', protect, submitReport);

// Moderator and Admin queue
router.get('/', protect, requireModerator, getReports);
router.patch('/:id/resolve', protect, requireModerator, resolveReport);
router.patch('/:id/assign', protect, requireModerator, assignReport);

module.exports = router;
