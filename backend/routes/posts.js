const router = require('express').Router();
const { 
  getFeed, 
  createPost, 
  updatePost,
  getPostById, 
  deletePost, 
  toggleReaction, 
  toggleBookmark,
  getBookmarkedPosts,
  getComments, 
  addComment, 
  deleteComment,
  getTrendingHashtags
} = require('../controllers/postsController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Feed & Global Posts
router.get('/', optionalAuth, getFeed);
router.post('/', protect, upload.fields([{ name: 'images', maxCount: 4 }]), createPost);
router.get('/bookmarks', protect, getBookmarkedPosts);
router.get('/trending/hashtags', getTrendingHashtags);

// Single Post Operations
router.get('/:postId', optionalAuth, getPostById);
router.put('/:postId', protect, upload.fields([{ name: 'images', maxCount: 4 }]), updatePost);
router.delete('/:postId', protect, deletePost);

// Reactions & Bookmarks
router.post('/:postId/react', protect, toggleReaction);
router.post('/:postId/bookmark', protect, toggleBookmark);

// Threaded Comments
router.get('/:postId/comments', getComments);
router.post('/:postId/comments', protect, addComment);
router.delete('/:postId/comments/:commentId', protect, deleteComment);

module.exports = router;
