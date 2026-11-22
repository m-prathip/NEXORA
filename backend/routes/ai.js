const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { 
  improveProfile,
  suggestHeadlinesAndSummary,
  generateProjectDescription,
  polishPost,
  suggestSkillImprovements
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// Dedicated rate limiter for AI generation endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  message: { message: 'AI request limit reached. Please wait a few minutes before requesting more AI suggestions.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/profile-improve', protect, aiLimiter, improveProfile);
router.post('/headline-summary', protect, aiLimiter, suggestHeadlinesAndSummary);
router.post('/project-description', protect, aiLimiter, generateProjectDescription);
router.post('/polish-post', protect, aiLimiter, polishPost);
router.post('/skill-suggestions', protect, aiLimiter, suggestSkillImprovements);

module.exports = router;
