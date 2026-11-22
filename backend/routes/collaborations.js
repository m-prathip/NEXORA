const router = require('express').Router();
const { 
  getCollabs, 
  getCollabById,
  createCollab, 
  updateCollab,
  deleteCollab,
  applyToCollab, 
  respondToApplication,
  getMyApplications,
  matchTeammates,
  reportCollab
} = require('../controllers/collaborationController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', optionalAuth, getCollabs);
router.post('/', protect, upload.fields([{ name: 'images', maxCount: 4 }]), createCollab);
router.get('/my/applications', protect, getMyApplications);
router.get('/teammates/match', optionalAuth, matchTeammates);

router.get('/:collabId', optionalAuth, getCollabById);
router.put('/:collabId', protect, upload.fields([{ name: 'images', maxCount: 4 }]), updateCollab);
router.delete('/:collabId', protect, deleteCollab);

router.post('/:collabId/apply', protect, applyToCollab);
router.patch('/:collabId/applications/:appId', protect, respondToApplication);
router.post('/:collabId/report', protect, reportCollab);

module.exports = router;
