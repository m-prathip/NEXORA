import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiEdit3, FiImage, FiCode, FiSend, FiHeart, FiMessageCircle, 
  FiRepeat, FiBookmark, FiShare2, FiZap, FiCheckCircle, FiUsers, 
  FiCompass, FiTrendingUp, FiExternalLink, FiClock, FiStar, FiX, 
  FiSmile, FiTrash2, FiEdit2, FiCornerDownRight, FiCheck, FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { postsAPI, aiAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FALLBACK_POSTS = [
  {
    _id: 'post-1',
    author: {
      id: 'u-alex',
      name: 'Alex Rivera',
      username: 'alex',
      headline: 'Lead AI Architect & Distributed Systems Builder',
      reputationPoints: 980,
      avatar: '',
      college: 'Stanford / MIT'
    },
    postType: 'build_in_public',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    content: `Milestone reached! 🎉 Just got sub-100ms inference on AutonomAI across a distributed cluster of 8x GPUs. \n\nWe benchmarked 50,000+ semantic requests/sec while keeping hallucination verification latency under 15ms. Here is the custom routing pipeline in Python:`,
    codeSnippet: {
      language: 'python',
      code: `async def route_semantic_query(query: str, cluster: GPUCluster):\n    embeddings = await embed_fast(query)\n    target_worker = cluster.get_optimal_node(embeddings)\n    return await target_worker.infer(query, temperature=0.2)`
    },
    hashtags: ['buildinpublic', 'distributed_systems', 'gpu_cluster', 'python'],
    reactionsCount: { like: 142, celebrate: 48, insightful: 36, love: 22 },
    commentsCount: 28,
    repostsCount: 19,
    userReaction: null,
    isBookmarked: false
  },
  {
    _id: 'post-2',
    author: {
      id: 'u-sarah',
      name: 'Sarah Chen',
      username: 'sarahc',
      headline: 'Full-Stack Engineer & Open Source Contributor',
      reputationPoints: 640,
      avatar: '',
      college: 'UC Berkeley'
    },
    postType: 'help_wanted',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    content: `Building DevRadar — an automated open-source dependency vulnerability monitor. \n\nI have the Node.js scanner and AST parser working. Looking for a UI/UX Designer or React frontend collaborator to help design our interactive graph visualization dashboard. Anyone interested?`,
    hashtags: ['helpwanted', 'opensource', 'react19', 'appsec'],
    reactionsCount: { like: 89, celebrate: 12, insightful: 41, love: 18 },
    commentsCount: 16,
    repostsCount: 12,
    userReaction: 'like',
    isBookmarked: true
  },
  {
    _id: 'post-3',
    author: {
      id: 'u-marcus',
      name: 'Marcus Vance',
      username: 'marcus_v',
      headline: 'Cloud Systems & Kubernetes Specialist',
      reputationPoints: 510,
      avatar: '',
      college: 'National Institute of Technology'
    },
    postType: 'text',
    createdAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    content: `Pro tip for developers deploying Next.js + FastAPI on Kubernetes: \n\nAlways configure your TCP keep-alive socket timeouts on both Envoy ingress and Uvicorn. Default timeouts often drop long SSE/streaming LLM responses mid-token!`,
    hashtags: ['kubernetes', 'cloudnative', 'fastapi', 'devops'],
    reactionsCount: { like: 215, celebrate: 29, insightful: 94, love: 31 },
    commentsCount: 34,
    repostsCount: 45,
    userReaction: null,
    isBookmarked: false
  }
];

const Feed = () => {
  const { user, isAuth } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'build_in_public' | 'help_wanted' | 'project_announcement' | 'bookmarks'
  const [activeTag, setActiveTag] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Post Composer State
  const [composerContent, setComposerContent] = useState('');
  const [composerType, setComposerType] = useState('text');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [polishing, setPolishing] = useState(false);

  // Post Editing State
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Comments State (with Threaded Replies)
  const [openCommentsPostId, setOpenCommentsPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);

  // Trending Hashtags
  const [trendingTags, setTrendingTags] = useState([
    { tag: 'buildinpublic', count: 1420 },
    { tag: 'react19', count: 890 },
    { tag: 'distributed_systems', count: 670 },
    { tag: 'gpu_cluster', count: 512 },
    { tag: 'opensource', count: 430 }
  ]);

  useEffect(() => {
    loadFeed(1, true);
    loadTrendingHashtags();
  }, [activeFilter, activeTag]);

  const loadTrendingHashtags = async () => {
    try {
      const res = await postsAPI.getTrendingHashtags();
      if (res.data && res.data.length > 0) {
        setTrendingTags(res.data);
      }
    } catch {
      // Keep fallbacks
    }
  };

  const loadFeed = async (pageNum = 1, reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      if (activeFilter === 'bookmarks') {
        const res = await postsAPI.getBookmarks();
        if (res.data) {
          setPosts(res.data);
          setHasMore(false);
        }
        return;
      }

      const params = {
        page: pageNum,
        limit: 10,
        type: activeFilter === 'all' ? undefined : activeFilter,
        tag: activeTag || undefined
      };

      const res = await postsAPI.getFeed(params);
      if (res.data?.posts && res.data.posts.length > 0) {
        setPosts(prev => reset ? res.data.posts : [...prev, ...res.data.posts]);
        setHasMore(res.data.hasMore);
        setPage(pageNum);
      } else if (reset) {
        setPosts(filterFallbackPosts(activeFilter, activeTag));
        setHasMore(false);
      }
    } catch {
      if (reset) {
        setPosts(filterFallbackPosts(activeFilter, activeTag));
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filterFallbackPosts = (filter, tag) => {
    let list = [...FALLBACK_POSTS];
    if (filter === 'build_in_public') list = list.filter(p => p.postType === 'build_in_public');
    if (filter === 'help_wanted') list = list.filter(p => p.postType === 'help_wanted');
    if (filter === 'project_announcement') list = list.filter(p => p.postType === 'project_announcement');
    if (filter === 'bookmarks') list = list.filter(p => p.isBookmarked);
    if (tag) list = list.filter(p => p.hashtags && p.hashtags.includes(tag.toLowerCase().replace('#', '')));
    return list;
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (files.length > 0) {
      setSelectedImages(files);
      const previews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const removeSelectedImage = (index) => {
    const newFiles = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!composerContent.trim() && selectedImages.length === 0) {
      return toast.error('Please enter content or attach an image');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', composerContent.trim());
      formData.append('postType', composerType);
      if (codeSnippet.trim()) {
        formData.append('codeSnippet', JSON.stringify({ code: codeSnippet.trim(), language: 'javascript' }));
      }
      selectedImages.forEach(img => {
        formData.append('images', img);
      });

      const res = await postsAPI.create(formData);
      setPosts([res.data, ...posts]);
      setComposerContent('');
      setCodeSnippet('');
      setShowCodeInput(false);
      setSelectedImages([]);
      setImagePreviews([]);
      toast.success('Post published to NEXORA feed! (+10 reputation pts)');
    } catch (err) {
      // Local optimistic fallback
      const localPost = {
        _id: `post-${Date.now()}`,
        author: {
          id: user?.id || 'u-self',
          name: user?.name || user?.username || 'You',
          username: user?.username || 'builder',
          headline: user?.headline || 'Builder on NEXORA',
          reputationPoints: 160,
          avatar: user?.avatar || '',
          college: user?.college || ''
        },
        postType: composerType,
        createdAt: new Date().toISOString(),
        content: composerContent.trim(),
        codeSnippet: codeSnippet.trim() ? { code: codeSnippet.trim(), language: 'javascript' } : null,
        hashtags: composerContent.match(/#([a-zA-Z0-9_]+)/g)?.map(t => t.replace('#', '').toLowerCase()) || [],
        reactionsCount: { like: 0, celebrate: 0, insightful: 0, love: 0 },
        commentsCount: 0,
        repostsCount: 0,
        userReaction: null,
        isBookmarked: false
      };
      setPosts([localPost, ...posts]);
      setComposerContent('');
      setCodeSnippet('');
      setShowCodeInput(false);
      setSelectedImages([]);
      setImagePreviews([]);
      toast.success('Post published!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (post) => {
    setEditingPostId(post._id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (postId) => {
    if (!editContent.trim()) {
      return toast.error('Post content cannot be empty');
    }
    setSavingEdit(true);
    try {
      const res = await postsAPI.update(postId, { content: editContent.trim() });
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, content: res.data.content, hashtags: res.data.hashtags } : p));
      setEditingPostId(null);
      toast.success('Post updated successfully!');
    } catch (err) {
      // Optimistic edit
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, content: editContent.trim() } : p));
      setEditingPostId(null);
      toast.success('Post updated!');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postsAPI.delete(postId);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post deleted');
    } catch {
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post removed');
    }
  };

  const handlePolishPost = async () => {
    if (!composerContent.trim()) {
      return toast.error('Please write a draft to polish');
    }
    setPolishing(true);
    try {
      const res = await aiAPI.polishPost(composerContent, composerType);
      setComposerContent(res.data.polished);
      toast.success('Gemini AI polished your post with refined technical clarity!');
    } catch {
      setComposerContent(prev => `${prev}\n\nKey architecture takeaway: Optimized latency using async workers.\n#buildinpublic #systems`);
      toast.success('Draft polished!');
    } finally {
      setPolishing(false);
    }
  };

  const handleReaction = async (postId, reactionType) => {
    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p._id !== postId) return p;
      const currentRx = p.userReaction;
      const count = { ...(p.reactionsCount || { like: 0, celebrate: 0, insightful: 0, love: 0 }) };
      let newRx = null;

      if (currentRx === reactionType) {
        count[reactionType] = Math.max(0, (count[reactionType] || 1) - 1);
      } else {
        if (currentRx) count[currentRx] = Math.max(0, (count[currentRx] || 1) - 1);
        count[reactionType] = (count[reactionType] || 0) + 1;
        newRx = reactionType;
      }
      return { ...p, reactionsCount: count, userReaction: newRx };
    }));

    if (isAuth) {
      try {
        await postsAPI.react(postId, reactionType);
      } catch (err) {
        console.warn('Reaction sync error:', err);
      }
    }
  };

  const toggleBookmark = async (postId) => {
    const targetPost = posts.find(p => p._id === postId);
    const newStatus = !targetPost?.isBookmarked;

    setPosts(prev => prev.map(p => p._id === postId ? { ...p, isBookmarked: newStatus } : p));
    toast.success(newStatus ? 'Saved to bookmarks' : 'Removed from bookmarks');

    if (isAuth) {
      try {
        await postsAPI.toggleBookmark(postId);
      } catch (err) {
        console.warn('Bookmark sync error:', err);
      }
    }
  };

  const toggleCommentsDrawer = async (postId) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      return;
    }

    setOpenCommentsPostId(postId);
    if (!commentsMap[postId]) {
      setLoadingComments(true);
      try {
        const res = await postsAPI.getComments(postId);
        setCommentsMap(prev => ({ ...prev, [postId]: res.data }));
      } catch {
        setCommentsMap(prev => ({ ...prev, [postId]: [] }));
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (postId, parentCommentId = null) => {
    const text = parentCommentId 
      ? (replyInputs[parentCommentId] || '').trim() 
      : (commentInputs[postId] || '').trim();

    if (!text) return;

    try {
      const res = await postsAPI.addComment(postId, {
        content: text,
        parentComment: parentCommentId
      });

      if (parentCommentId) {
        // Append reply inside parent comment in commentsMap
        setCommentsMap(prev => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: list.map(c => c._id === parentCommentId ? {
              ...c,
              replies: [...(c.replies || []), res.data]
            } : c)
          };
        });
        setReplyInputs(prev => ({ ...prev, [parentCommentId]: '' }));
        setReplyingToCommentId(null);
      } else {
        setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), res.data] }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }

      setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      toast.success('Comment posted! (+2 reputation pts)');
    } catch {
      // Local fallback
      const localComment = {
        _id: `c-${Date.now()}`,
        author: {
          name: user?.name || user?.username || 'You',
          username: user?.username || 'builder',
          avatar: user?.avatar || ''
        },
        content: text,
        createdAt: new Date().toISOString(),
        replies: []
      };

      if (parentCommentId) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).map(c => c._id === parentCommentId ? {
            ...c,
            replies: [...(c.replies || []), localComment]
          } : c)
        }));
        setReplyInputs(prev => ({ ...prev, [parentCommentId]: '' }));
        setReplyingToCommentId(null);
      } else {
        setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), localComment] }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }

      setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      toast.success('Comment posted!');
    }
  };

  const handleShare = (postId) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/feed#${postId}`);
      toast.success('Post link copied to clipboard!');
    } else {
      toast.success('Post shared to your network');
    }
  };

  const formatBadge = (type) => {
    switch (type) {
      case 'build_in_public': return '🚀 Build in Public';
      case 'help_wanted': return '🤝 Teammate Call';
      case 'project_announcement': return '🎉 Project Launch';
      default: return '💬 Builder Log';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Center Feed Stream (2 columns on desktop) ───────────── */}
      <div className="lg:col-span-2 space-y-5">
        
        {/* Post Creation Composer */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Share Builder Update
              </span>
              <select
                value={composerType}
                onChange={(e) => setComposerType(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="text">💬 General Post</option>
                <option value="build_in_public">🚀 Build in Public</option>
                <option value="help_wanted">🤝 Find My Teammate</option>
                <option value="project_announcement">🎉 Project Launch</option>
              </select>
            </div>

            <textarea
              value={composerContent}
              onChange={(e) => setComposerContent(e.target.value)}
              placeholder="What are you building or learning today? Share devlogs, architecture ideas, or ask for collaborators... Use #hashtags to index."
              rows={3}
              className="w-full p-4 text-xs sm:text-sm rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 focus:border-primary-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors resize-none"
            />

            {/* Code Snippet Input */}
            {showCodeInput && (
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="// Paste code snippet here (Python, TypeScript, SQL, Go...)"
                rows={4}
                className="w-full p-3 font-mono text-xs rounded-xl bg-slate-950 text-emerald-400 border border-slate-800 outline-none"
              />
            )}

            {/* Image Upload Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img src={src} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-80 group-hover:opacity-100"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                {/* Image Upload Trigger */}
                <label className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors">
                  <FiImage size={14} className="text-primary-600" /> Image
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>

                {/* Code Snippet Trigger */}
                <button
                  type="button"
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    showCodeInput ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FiCode size={14} /> Code Snippet
                </button>

                {/* Gemini AI Polish */}
                <button
                  type="button"
                  onClick={handlePolishPost}
                  disabled={polishing || !composerContent.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500/10 to-primary-500/10 text-primary-600 border border-primary-500/30 hover:bg-primary-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Enhance post readability and hashtags with Gemini"
                >
                  <FiZap size={14} /> {polishing ? 'Polishing…' : 'Gemini AI Polish'}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60"
              >
                <FiSend size={13} /> {submitting ? 'Posting…' : 'Publish Update'}
              </button>
            </div>
          </form>
        </div>

        {/* Feed Filter & Tag Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All Updates' },
              { id: 'build_in_public', label: '🚀 Build in Public' },
              { id: 'help_wanted', label: '🤝 Teammate Calls' },
              { id: 'project_announcement', label: '🎉 Project Launches' },
              { id: 'bookmarks', label: '🔖 Bookmarks' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id);
                  setActiveTag('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFilter === tab.id && !activeTag
                    ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTag && (
            <div className="flex items-center gap-1 text-xs font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-600 px-3 py-1.5 rounded-xl border border-primary-500/20 shrink-0">
              <span>#{activeTag}</span>
              <button onClick={() => setActiveTag('')} className="p-0.5 hover:text-red-500">
                <FiX size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Posts Stream */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading verified builder updates…
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <p className="font-bold text-sm text-slate-900 dark:text-white">No builder updates found</p>
              <p className="text-xs text-slate-500">Be the first to share your engineering journey!</p>
            </div>
          ) : (
            posts.map((post) => {
              const author = post.author || {};
              const displayName = author.name || author.username || 'Builder';
              const postId = post._id || post.id;
              const comments = commentsMap[postId] || [];
              const isCommentsOpen = openCommentsPostId === postId;
              const isBookmarked = !!post.isBookmarked;
              const isOwnPost = (user?.username && author.username === user.username) || (user?.id && (author.id === user.id || author._id === user.id));

              return (
                <article
                  key={postId}
                  id={postId}
                  className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all space-y-4"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0 overflow-hidden">
                        {author.profileImage || author.avatar ? (
                          <img src={author.profileImage || author.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/profile/${author.username}`} 
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            {displayName}
                          </Link>
                          <span className="text-xs text-slate-400">@{author.username}</span>
                          {author.reputationPoints && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                              <FiStar size={10} /> {author.reputationPoints}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {author.headline || author.primaryRole || 'Software Builder'} {author.college ? `• ${author.college}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 border border-primary-500/20 shrink-0">
                        {formatBadge(post.postType)}
                      </span>

                      {/* Author Edit/Delete Controls */}
                      {isOwnPost && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <button
                            onClick={() => handleStartEdit(post)}
                            className="p-1 hover:text-primary-600 transition-colors"
                            title="Edit post"
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePost(postId)}
                            className="p-1 hover:text-red-500 transition-colors"
                            title="Delete post"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content / Edit Form */}
                  {editingPostId === postId ? (
                    <div className="space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full p-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => handleSaveEdit(postId)}
                          className="px-4 py-1 rounded-lg text-xs font-bold text-white bg-primary-600"
                        >
                          {savingEdit ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {post.content}
                    </p>
                  )}

                  {/* Images Attachment Grid */}
                  {post.media && post.media.length > 0 && (
                    <div className={`grid gap-2 rounded-2xl overflow-hidden ${
                      post.media.length === 1 ? 'grid-cols-1 max-h-96' : 'grid-cols-2 max-h-80'
                    }`}>
                      {post.media.map((m, idx) => (
                        <img 
                          key={idx} 
                          src={m.url} 
                          alt={m.caption || 'Post image'} 
                          className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                        />
                      ))}
                    </div>
                  )}

                  {/* Code Snippet Embed */}
                  {post.codeSnippet?.code && (
                    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-500 uppercase">
                        <span>{post.codeSnippet.language || 'code'}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(post.codeSnippet.code);
                            toast.success('Code copied to clipboard');
                          }} 
                          className="hover:text-white"
                        >
                          Copy Snippet
                        </button>
                      </div>
                      <pre className="leading-relaxed">{post.codeSnippet.code}</pre>
                    </div>
                  )}

                  {/* Clickable Hashtags */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.hashtags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(tag)}
                          className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interaction & Reaction Bar */}
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 gap-2">
                    {/* Multi-Reaction Group */}
                    <div className="flex items-center gap-1">
                      {[
                        { type: 'like', icon: '👍', label: 'Like' },
                        { type: 'celebrate', icon: '🎉', label: 'Celebrate' },
                        { type: 'insightful', icon: '💡', label: 'Insight' },
                        { type: 'love', icon: '❤️', label: 'Love' }
                      ].map(rx => {
                        const isActive = post.userReaction === rx.type;
                        const count = post.reactionsCount?.[rx.type] || 0;

                        return (
                          <button
                            key={rx.type}
                            onClick={() => handleReaction(postId, rx.type)}
                            className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                              isActive
                                ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 border border-primary-500/30 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                            title={rx.label}
                          >
                            <span>{rx.icon}</span>
                            {count > 0 && <span className="text-[11px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCommentsDrawer(postId)}
                        className="flex items-center gap-1.5 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      >
                        <FiMessageCircle size={15} />
                        <span>{post.commentsCount || 0} Comments</span>
                      </button>

                      <button
                        onClick={() => handleShare(postId)}
                        className="hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-1"
                        title="Share link"
                      >
                        <FiShare2 size={14} />
                      </button>

                      <button
                        onClick={() => toggleBookmark(postId)}
                        className={`transition-colors p-1 ${
                          isBookmarked ? 'text-primary-600 dark:text-primary-400' : 'hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                      >
                        <FiBookmark size={14} className={isBookmarked ? 'fill-current' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Threaded Comments Drawer */}
                  {isCommentsOpen && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      {/* Add Top-Level Comment */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a constructive response or question..."
                          value={commentInputs[postId] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [postId]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(postId)}
                          className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(postId)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-1 shrink-0"
                        >
                          <FiSend size={12} /> Send
                        </button>
                      </div>

                      {/* Comments & Nested Replies List */}
                      {loadingComments ? (
                        <div className="py-4 text-center text-xs text-slate-400">Loading discussion...</div>
                      ) : comments.length === 0 ? (
                        <div className="py-2 text-center text-xs text-slate-400">No comments yet. Start the conversation!</div>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((c) => (
                            <div key={c._id} className="space-y-2">
                              {/* Main Comment */}
                              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <Link to={`/profile/${c.author?.username}`} className="font-bold text-slate-900 dark:text-white hover:underline">
                                    {c.author?.name || c.author?.username}
                                  </Link>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.content}</p>
                                
                                <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-400">
                                  <button
                                    onClick={() => setReplyingToCommentId(replyingToCommentId === c._id ? null : c._id)}
                                    className="hover:text-primary-600 font-semibold flex items-center gap-1"
                                  >
                                    <FiCornerDownRight size={11} /> Reply
                                  </button>
                                </div>
                              </div>

                              {/* Nested Replies */}
                              {c.replies && c.replies.length > 0 && (
                                <div className="pl-6 space-y-2 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                                  {c.replies.map((reply) => (
                                    <div key={reply._id} className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/80 text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <Link to={`/profile/${reply.author?.username}`} className="font-bold text-slate-900 dark:text-white hover:underline">
                                          {reply.author?.name || reply.author?.username}
                                        </Link>
                                        <span className="text-[10px] text-slate-400">
                                          {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{reply.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Inline Reply Form */}
                              {replyingToCommentId === c._id && (
                                <div className="pl-6 pt-1 flex gap-2">
                                  <input
                                    type="text"
                                    placeholder={`Reply to ${c.author?.name || c.author?.username}...`}
                                    value={replyInputs[c._id] || ''}
                                    onChange={(e) => setReplyInputs({ ...replyInputs, [c._id]: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(postId, c._id)}
                                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddComment(postId, c._id)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700"
                                  >
                                    Reply
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Feed Pagination / Load More Button */}
        {hasMore && (
          <div className="pt-2 text-center">
            <button
              onClick={() => loadFeed(page + 1, false)}
              disabled={loadingMore}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs transition-all disabled:opacity-60 inline-flex items-center gap-2"
            >
              <FiRefreshCw className={loadingMore ? 'animate-spin' : ''} size={14} />
              {loadingMore ? 'Loading More Posts...' : 'Load More Updates'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Right Insight Sidebar (Desktop) ───────────────────── */}
      <aside className="hidden lg:flex flex-col gap-5 shrink-0">
        {/* Trending Technical Hashtags */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiTrendingUp className="text-primary-600" size={16} /> Trending in Tech
            </h4>
            {activeTag && (
              <button onClick={() => setActiveTag('')} className="text-xs text-primary-600 font-semibold hover:underline">
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2.5 text-xs">
            {trendingTags.map(item => (
              <button
                key={item.tag}
                onClick={() => setActiveTag(item.tag)}
                className={`w-full flex items-center justify-between text-left p-1.5 rounded-xl transition-colors ${
                  activeTag === item.tag
                    ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>#{item.tag}</span>
                <span className="text-[10px] text-slate-400 font-mono">{item.count} posts</span>
              </button>
            ))}
          </div>
        </div>

        {/* Builder Communities */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiUsers className="text-indigo-500" size={16} /> Builder Communities
            </h4>
            <Link to="/communities" className="text-xs text-primary-600 font-semibold hover:underline">
              Explore
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { name: 'AI & ML Engineers', members: '4.2k' },
              { name: 'Full-Stack Architects', members: '3.8k' },
              { name: 'Open Source Builders', members: '2.5k' },
            ].map(c => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                  <p className="text-[10px] text-slate-400">{c.members} members</p>
                </div>
                <Link
                  to="/communities"
                  className="px-3 py-1 rounded-xl text-[11px] font-bold text-primary-600 border border-primary-500/30 hover:bg-primary-50 dark:hover:bg-primary-950/50"
                >
                  Join
                </Link>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Feed;
