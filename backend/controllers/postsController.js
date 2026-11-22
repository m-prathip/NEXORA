const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const Bookmark = require('../models/Bookmark');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');
const { getBlockedUserIds } = require('./blockController');

// Helper to extract unique hashtags from text
const extractHashtags = (text) => {
  if (!text) return [];
  const regex = /#([a-zA-Z0-9_]+)/g;
  const tags = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return Array.from(new Set(tags));
};

// @desc   Get paginated social feed with privacy shielding and filters
// @route  GET /api/posts
const getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, tag, author, q } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = { 
      visibility: 'public',
      isModerated: { $ne: true }
    };
    if (type && type !== 'all') {
      filter.postType = type;
    }
    if (tag) {
      filter.hashtags = tag.toLowerCase().replace('#', '');
    }
    if (author) {
      // Find author by username or ID
      const targetUser = await User.findOne({
        $or: [{ username: author.toLowerCase().trim() }, { _id: author.match(/^[0-9a-fA-F]{24}$/) ? author : null }]
      });
      if (targetUser) {
        filter.author = targetUser._id;
      }
    }
    if (q && q.trim()) {
      filter.content = { $regex: q.trim(), $options: 'i' };
    }

    // Bidirectional blocking exclusion
    if (req.user?.id) {
      const blockedIds = await getBlockedUserIds(req.user.id);
      if (blockedIds.length > 0) {
        filter.author = { ...(filter.author ? { $eq: filter.author, $nin: blockedIds } : { $nin: blockedIds }) };
      }
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'username name primaryRole headline avatar reputationPoints college department isPrivate')
        .lean(),
      Post.countDocuments(filter)
    ]);

    // Privacy filter: exclude posts from private profiles unless requester is the author
    const currentUserId = req.user?.id ? req.user.id.toString() : null;
    const visiblePosts = posts.filter(p => {
      if (!p.author) return false;
      if (p.author.isPrivate && p.author._id.toString() !== currentUserId) {
        return false;
      }
      return true;
    });

    const authorIds = visiblePosts.map(p => p.author?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: authorIds } })
      .select('user name profileImage college department')
      .lean();
    
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    // Determine user's reactions & bookmarks if authenticated
    let userReactionMap = {};
    let userBookmarkSet = new Set();
    if (req.user) {
      const postIds = visiblePosts.map(p => p._id);
      const [userReactions, userBookmarks] = await Promise.all([
        Reaction.find({
          user: req.user.id,
          targetId: { $in: postIds },
          targetType: 'Post'
        }).lean(),
        Bookmark.find({
          user: req.user.id,
          post: { $in: postIds }
        }).select('post').lean()
      ]);

      userReactions.forEach(r => { userReactionMap[r.targetId.toString()] = r.type; });
      userBookmarks.forEach(b => { userBookmarkSet.add(b.post.toString()); });
    }

    const formattedPosts = visiblePosts.map(p => {
      const prof = profileMap[p.author?._id?.toString()];
      return {
        ...p,
        author: {
          id: p.author?._id,
          username: p.author?.username,
          name: prof?.name || p.author?.name || p.author?.username,
          headline: prof?.headline || p.author?.headline || p.author?.primaryRole || 'Software Engineer',
          primaryRole: p.author?.primaryRole || 'Software Engineer',
          college: prof?.college || p.author?.college || '',
          department: prof?.department || p.author?.department || '',
          profileImage: prof?.profileImage || p.author?.avatar || '',
          reputationPoints: p.author?.reputationPoints || 100
        },
        userReaction: userReactionMap[p._id.toString()] || null,
        isBookmarked: userBookmarkSet.has(p._id.toString())
      };
    });

    res.json({
      posts: formattedPosts,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      totalPosts: total,
      hasMore: skip + posts.length < total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create a new text or image post
// @route  POST /api/posts
const createPost = async (req, res) => {
  try {
    const { content, postType = 'text', codeSnippet, project, visibility = 'public' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content cannot be empty' });
    }

    // Spam prevention: Duplicate post detection within 60 seconds
    const trimmedContent = content.trim();
    const recentDuplicate = await Post.findOne({
      author: req.user.id,
      content: trimmedContent,
      createdAt: { $gte: new Date(Date.now() - 60000) }
    });
    if (recentDuplicate) {
      return res.status(429).json({
        message: 'Duplicate post detected. Please wait before sharing identical content again.'
      });
    }

    // Media handling (both JSON payload and multipart file uploads)
    let media = [];
    if (req.body.media) {
      if (typeof req.body.media === 'string') {
        try { media = JSON.parse(req.body.media); } catch (e) { media = []; }
      } else if (Array.isArray(req.body.media)) {
        media = req.body.media;
      }
    }

    // If images uploaded via Multer
    if (req.files?.images) {
      req.files.images.forEach(f => {
        media.push({
          url: f.path.startsWith('http') ? f.path : '/uploads/' + f.filename,
          type: 'image',
          caption: f.originalname || ''
        });
      });
    }

    // Parse code snippet if string
    let parsedSnippet = codeSnippet;
    if (typeof codeSnippet === 'string') {
      try { parsedSnippet = JSON.parse(codeSnippet); } catch (e) { parsedSnippet = undefined; }
    }

    // Auto-extract hashtags
    const hashtags = extractHashtags(content);

    const post = await Post.create({
      author: req.user.id,
      content: content.trim(),
      postType,
      media,
      codeSnippet: parsedSnippet && parsedSnippet.code ? parsedSnippet : undefined,
      project: project || undefined,
      hashtags,
      visibility
    });

    // Reward builder reputation (+10 points for sharing technical work)
    await User.findByIdAndUpdate(req.user.id, { $inc: { reputationPoints: 10 } });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username name primaryRole headline avatar reputationPoints college department')
      .lean();

    const profile = await Profile.findOne({ user: req.user.id }).select('name profileImage college department').lean();

    res.status(201).json({
      ...populatedPost,
      author: {
        id: populatedPost.author?._id,
        username: populatedPost.author?.username,
        name: profile?.name || populatedPost.author?.name || populatedPost.author?.username,
        headline: profile?.headline || populatedPost.author?.headline || populatedPost.author?.primaryRole || 'Software Engineer',
        primaryRole: populatedPost.author?.primaryRole || 'Software Engineer',
        college: profile?.college || populatedPost.author?.college || '',
        department: profile?.department || populatedPost.author?.department || '',
        profileImage: profile?.profileImage || populatedPost.author?.avatar || '',
        reputationPoints: populatedPost.author?.reputationPoints || 100
      },
      userReaction: null,
      isBookmarked: false
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update/edit own post
// @route  PUT /api/posts/:postId
const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Strict ownership verification: only author can edit
    if (post.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    const { content, postType, codeSnippet, visibility } = req.body;
    if (content !== undefined) {
      if (!content.trim()) return res.status(400).json({ message: 'Content cannot be empty' });
      post.content = content.trim();
      post.hashtags = extractHashtags(content);
    }
    if (postType) post.postType = postType;
    if (visibility) post.visibility = visibility;
    
    if (codeSnippet !== undefined) {
      let parsed = codeSnippet;
      if (typeof codeSnippet === 'string') {
        try { parsed = JSON.parse(codeSnippet); } catch (e) { parsed = undefined; }
      }
      post.codeSnippet = parsed && parsed.code ? parsed : undefined;
    }

    // Append newly uploaded images if any
    if (req.files?.images) {
      req.files.images.forEach(f => {
        post.media.push({
          url: f.path.startsWith('http') ? f.path : '/uploads/' + f.filename,
          type: 'image',
          caption: f.originalname || ''
        });
      });
    }

    await post.save();

    const populated = await Post.findById(post._id)
      .populate('author', 'username name primaryRole headline avatar reputationPoints college department')
      .lean();

    const profile = await Profile.findOne({ user: req.user.id }).select('name profileImage college department').lean();

    res.json({
      ...populated,
      author: {
        id: populated.author?._id,
        username: populated.author?.username,
        name: profile?.name || populated.author?.name || populated.author?.username,
        headline: profile?.headline || populated.author?.headline || populated.author?.primaryRole || 'Software Engineer',
        profileImage: profile?.profileImage || populated.author?.avatar || '',
        reputationPoints: populated.author?.reputationPoints || 100
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get single post details
// @route  GET /api/posts/:postId
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username name primaryRole headline avatar reputationPoints college department isPrivate')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Privacy check
    const currentUserId = req.user?.id ? req.user.id.toString() : null;
    if (post.author?.isPrivate && post.author._id.toString() !== currentUserId) {
      return res.status(403).json({ message: 'This post is from a private profile' });
    }

    const profile = await Profile.findOne({ user: post.author._id }).select('name profileImage college department').lean();

    let userReaction = null;
    let isBookmarked = false;
    if (req.user) {
      const [rx, bm] = await Promise.all([
        Reaction.findOne({ user: req.user.id, targetId: post._id, targetType: 'Post' }),
        Bookmark.findOne({ user: req.user.id, post: post._id })
      ]);
      if (rx) userReaction = rx.type;
      if (bm) isBookmarked = true;
    }

    res.json({
      ...post,
      author: {
        id: post.author?._id,
        username: post.author?.username,
        name: profile?.name || post.author?.name || post.author?.username,
        headline: profile?.headline || post.author?.headline || post.author?.primaryRole || 'Software Engineer',
        profileImage: profile?.profileImage || post.author?.avatar || '',
        reputationPoints: post.author?.reputationPoints || 100
      },
      userReaction,
      isBookmarked
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Delete a post
// @route  DELETE /api/posts/:postId
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Promise.all([
      Post.findByIdAndDelete(post._id),
      Comment.deleteMany({ post: post._id }),
      Reaction.deleteMany({ targetId: post._id, targetType: 'Post' }),
      Bookmark.deleteMany({ post: post._id })
    ]);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Toggle reaction on a post with duplicate prevention
// @route  POST /api/posts/:postId/react
const toggleReaction = async (req, res) => {
  try {
    const { type } = req.body; // 'like' | 'celebrate' | 'insightful' | 'love'
    const postId = req.params.postId;
    const userId = req.user.id;

    if (!['like', 'celebrate', 'insightful', 'love'].includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existing = await Reaction.findOne({
      user: userId,
      targetId: postId,
      targetType: 'Post'
    });

    if (existing) {
      if (existing.type === type) {
        // Remove reaction (toggle off)
        await Reaction.findByIdAndDelete(existing._id);
        const updateField = `reactionsCount.${type}`;
        await Post.findByIdAndUpdate(postId, { $inc: { [updateField]: -1 } });
        return res.json({ reacted: false, currentType: null });
      } else {
        // Change reaction type atomically
        const oldType = existing.type;
        existing.type = type;
        await existing.save();

        await Post.findByIdAndUpdate(postId, {
          $inc: {
            [`reactionsCount.${oldType}`]: -1,
            [`reactionsCount.${type}`]: 1
          }
        });
        return res.json({ reacted: true, currentType: type });
      }
    }

    // New reaction
    await Reaction.create({
      user: userId,
      targetId: postId,
      targetType: 'Post',
      type
    });

    await Post.findByIdAndUpdate(postId, {
      $inc: { [`reactionsCount.${type}`]: 1 }
    });

    // Notify author if not reacting to own post
    if (post.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: userId,
        type: 'post_reaction',
        title: 'New Reaction',
        message: `${req.user.username} reacted with ${type} to your post.`,
        link: '/feed'
      }).catch(() => {});
    }

    res.json({ reacted: true, currentType: type });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Toggle bookmark for a post
// @route  POST /api/posts/:postId/bookmark
const toggleBookmark = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existing = await Bookmark.findOne({ user: userId, post: postId });
    if (existing) {
      await Bookmark.findByIdAndDelete(existing._id);
      return res.json({ bookmarked: false, message: 'Bookmark removed' });
    }

    await Bookmark.create({ user: userId, post: postId });
    res.json({ bookmarked: true, message: 'Post bookmarked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get user's bookmarked posts
// @route  GET /api/posts/bookmarks
const getBookmarkedPosts = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user.id })
      .sort('-createdAt')
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'username name primaryRole headline avatar reputationPoints college department'
        }
      })
      .lean();

    const posts = bookmarks
      .map(b => b.post)
      .filter(Boolean)
      .map(p => ({
        ...p,
        isBookmarked: true
      }));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get comments and threaded replies for a post
// @route  GET /api/posts/:postId/comments
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort('createdAt')
      .populate('author', 'username name primaryRole avatar reputationPoints college department')
      .lean();

    const authorIds = comments.map(c => c.author?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: authorIds } }).select('user name profileImage').lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    // Format comments and group replies under parent comments
    const commentMap = {};
    const rootComments = [];

    comments.forEach(c => {
      const formatted = {
        ...c,
        author: {
          id: c.author?._id,
          username: c.author?.username,
          name: profileMap[c.author?._id?.toString()]?.name || c.author?.name || c.author?.username,
          headline: c.author?.primaryRole || 'Software Engineer',
          profileImage: profileMap[c.author?._id?.toString()]?.profileImage || c.author?.avatar || ''
        },
        replies: []
      };
      commentMap[c._id.toString()] = formatted;
    });

    comments.forEach(c => {
      const formatted = commentMap[c._id.toString()];
      if (c.parentComment && commentMap[c.parentComment.toString()]) {
        commentMap[c.parentComment.toString()].replies.push(formatted);
      } else {
        rootComments.push(formatted);
      }
    });

    res.json(rootComments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Add a comment or threaded reply
// @route  POST /api/posts/:postId/comments
const addComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    const postId = req.params.postId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    // Spam prevention: Duplicate comment detection within 30 seconds
    const trimmedComment = content.trim();
    const recentComment = await Comment.findOne({
      post: postId,
      author: req.user.id,
      content: trimmedComment,
      createdAt: { $gte: new Date(Date.now() - 30000) }
    });
    if (recentComment) {
      return res.status(429).json({
        message: 'Duplicate comment detected. Please wait before repeating comments.'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    let parentDoc = null;
    if (parentComment) {
      parentDoc = await Comment.findById(parentComment);
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user.id,
      content: content.trim(),
      parentComment: parentDoc ? parentDoc._id : null
    });

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    await User.findByIdAndUpdate(req.user.id, { $inc: { reputationPoints: 2 } });

    const populated = await Comment.findById(comment._id)
      .populate('author', 'username name primaryRole avatar reputationPoints college department')
      .lean();

    const profile = await Profile.findOne({ user: req.user.id }).select('name profileImage').lean();

    // Notify post author if not commenting on own post
    if (post.author.toString() !== req.user.id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'post_comment',
        title: 'New Comment',
        message: `${req.user.username} commented on your post: "${content.slice(0, 40)}..."`,
        link: '/feed'
      }).catch(() => {});
    }

    // If reply, also notify parent comment author
    if (parentDoc && parentDoc.author.toString() !== req.user.id.toString()) {
      await Notification.create({
        recipient: parentDoc.author,
        sender: req.user.id,
        type: 'post_comment',
        title: 'New Reply',
        message: `${req.user.username} replied to your comment: "${content.slice(0, 40)}..."`,
        link: '/feed'
      }).catch(() => {});
    }

    res.status(201).json({
      ...populated,
      author: {
        id: populated.author?._id,
        username: populated.author?.username,
        name: profile?.name || populated.author?.name || populated.author?.username,
        headline: populated.author?.primaryRole || 'Software Engineer',
        profileImage: profile?.profileImage || populated.author?.avatar || ''
      },
      replies: []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Delete a comment
// @route  DELETE /api/posts/:postId/comments/:commentId
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const post = await Post.findById(postId);
    const isCommentAuthor = comment.author.toString() === req.user.id.toString();
    const isPostAuthor = post && post.author.toString() === req.user.id.toString();

    if (!isCommentAuthor && !isPostAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(commentId);
    // Also delete any child replies
    const childReplies = await Comment.deleteMany({ parentComment: commentId });
    const totalDeleted = 1 + (childReplies?.deletedCount || 0);

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -totalDeleted } });

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get trending hashtags
// @route  GET /api/posts/trending/hashtags
const getTrendingHashtags = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const aggregation = await Post.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, visibility: 'public' } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const tags = aggregation.map(a => ({
      tag: a._id,
      count: a.count
    }));

    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
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
};
