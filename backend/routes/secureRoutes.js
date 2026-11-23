const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { secureRouteLimiter } = require('../middleware/rateLimiters');
const {
  decryptAndValidateRoute,
  generateRouteToken,
  revokeRouteToken
} = require('../controllers/secureRouteController');

// All secure route operations require authentication and rate-limiting
router.use(secureRouteLimiter);
router.use(protect);

// Decrypt and validate token for navigation
router.post('/decrypt', decryptAndValidateRoute);

// Generate encrypted token for sensitive page or share link
router.post('/generate', generateRouteToken);

// Revoke an active token
router.post('/revoke', revokeRouteToken);

module.exports = router;
