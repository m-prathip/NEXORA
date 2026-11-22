const router = require('express').Router();
const { 
  getCommunities, 
  getCommunityBySlug, 
  createCommunity, 
  updateCommunity,
  toggleJoinCommunity,
  getCommunityMembers,
  updateMemberRole,
  getCommunityPosts,
  reportCommunity
} = require('../controllers/communityController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getCommunities);
router.post('/', protect, createCommunity);
router.get('/:slug', optionalAuth, getCommunityBySlug);
router.put('/:communityId', protect, updateCommunity);
router.post('/:communityId/join', protect, toggleJoinCommunity);
router.get('/:communityId/members', optionalAuth, getCommunityMembers);
router.patch('/:communityId/members/:memberId', protect, updateMemberRole);
router.get('/:communityId/posts', optionalAuth, getCommunityPosts);
router.post('/:communityId/report', protect, reportCommunity);

module.exports = router;
