import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import {
  FiSearch,
  FiFileText,
  FiEyeOff,
  FiEye,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Moderate Modal
  const [selectedPost, setSelectedPost] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getPosts({
        filter,
        q: search,
        page,
        limit: 20
      });
      setPosts(res.data.posts || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  const handleHide = async (e) => {
    e.preventDefault();
    if (!moderationReason.trim()) return toast.error('A moderation reason is required');

    setActionLoading(true);
    try {
      await adminAPI.moderatePost(selectedPost._id, {
        action: 'hide',
        reason: moderationReason.trim()
      });
      toast.success('Post hidden from public feed');
      setSelectedPost(null);
      setModerationReason('');
      fetchPosts(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to hide post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (post) => {
    try {
      await adminAPI.moderatePost(post._id, { action: 'restore' });
      toast.success('Post restored to public feed');
      fetchPosts(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore post');
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm('Permanently delete this post and its comments? This cannot be undone.')) return;
    try {
      await adminAPI.moderatePost(post._id, { action: 'delete' });
      toast.success('Post permanently deleted');
      fetchPosts(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete post');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Social Feed & Content Moderation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review reported posts, inspect suspicious content, and remove violations.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total Posts: <span className="text-slate-900 dark:text-white font-bold">{pagination.total}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search content by keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Posts</option>
            <option value="active">Active Only</option>
            <option value="moderated">Hidden / Moderated Only</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Spinner size="lg" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No posts found matching the filter criteria.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post._id}
              className={`p-5 rounded-2xl border transition shadow-xs bg-white dark:bg-slate-900 ${
                post.isModerated
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                    {post.author?.avatar ? (
                      <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
                    ) : (
                      post.author?.username?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      @{post.author?.username || 'unknown'}
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {post.postType}
                      </span>
                      {post.isModerated && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-400">
                          HIDDEN / MODERATED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(post.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {post.isModerated ? (
                    <button
                      onClick={() => handleRestore(post)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100 transition"
                    >
                      <FiEye size={14} /> Restore Post
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 hover:bg-amber-100 transition"
                    >
                      <FiEyeOff size={14} /> Hide Post
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(post)}
                    className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                    title="Permanently Delete Post"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div className="mt-3 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </div>

              {/* Moderation Notes Banner if moderated */}
              {post.isModerated && (
                <div className="mt-3 p-3 rounded-xl bg-red-100/60 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 flex items-center justify-between">
                  <span>
                    <strong>Moderation Reason:</strong> {post.moderationReason || 'Flagged by system'}
                  </span>
                  {post.moderatedBy && (
                    <span className="text-[11px] text-red-600 dark:text-red-400">
                      Enforced by @{post.moderatedBy.username}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPosts(pagination.page - 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchPosts(pagination.page + 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hide Post Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Hide Post from Social Feed
              </h3>
              <button onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleHide} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Moderation Action *
                </label>
                <select
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mb-2"
                >
                  <option value="">Select a reason…</option>
                  <option value="Spam / Commercial advertising">Spam / Commercial advertising</option>
                  <option value="Harassment or personal attack">Harassment or personal attack</option>
                  <option value="Plagiarism / Copyright concern">Plagiarism / Copyright concern</option>
                  <option value="Fraudulent opportunity or link">Fraudulent opportunity or link</option>
                  <option value="Inappropriate media or hate speech">Inappropriate media or hate speech</option>
                  <option value="Violation of NEXORA builder guidelines">Violation of NEXORA builder guidelines</option>
                </select>
                <input
                  type="text"
                  placeholder="Or enter custom reason…"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? 'Hiding…' : 'Hide Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPosts;
