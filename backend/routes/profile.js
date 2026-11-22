const router = require('express').Router();
const { 
  getMyProfile, 
  updateMyProfile, 
  setupOnboarding, 
  updatePrivacy, 
  getPublicProfile 
} = require('../controllers/profileController');
const { protect, optionalAuth } = require('../middleware/auth');
const resolveUser = require('../middleware/resolveUser');
const upload = require('../middleware/upload');

// Authenticated builder profile endpoints
router.get('/me', protect, getMyProfile);

router.put('/me', protect, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), updateMyProfile);

router.post('/onboard', protect, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), setupOnboarding);

router.put('/privacy', protect, updatePrivacy);

// Public profile resolution with privacy protection
router.get('/public/:username', optionalAuth, resolveUser, getPublicProfile);

module.exports = router;
