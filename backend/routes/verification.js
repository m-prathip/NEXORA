const express = require('express');
const router = express.Router();
const { 
  verifyTokenLink, 
  resendVerification, 
  getVerificationStatus 
} = require('../controllers/verificationController');
const { forgotLimiter } = require('../middleware/rateLimiters');

// Verify email via link (GET or POST)
router.get('/verify', verifyTokenLink);
router.post('/verify', verifyTokenLink);

// Resend verification link (rate-limited via forgotLimiter + controller cooldown)
router.post('/resend', forgotLimiter, resendVerification);

// Check current verification status
router.get('/status', getVerificationStatus);

module.exports = router;
