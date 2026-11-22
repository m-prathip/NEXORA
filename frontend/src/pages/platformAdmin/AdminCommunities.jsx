import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import {
  FiSearch,
  FiShare2,
  FiUsers,
  FiFileText,
  FiAlertTriangle,
  FiCheckCircle,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminCommunities = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const fetchCommunities = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getCommunities({
        q: search,
        status: statusFilter,
        page,
        limit: 20
      });
      setCommunities(res.data.communities || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch communities');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommunities(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCommunities]);

  const handleToggleStatus = async (community, action) => {
    const promptMsg = action === 'suspend'
      ? `Suspend community "${community.name}"? Members will be restricted from posting.`
      : `Re-activate community "${community.name}"?`;

    if (!window.confirm(promptMsg)) return;

    try {
      await adminAPI.moderateCommunity(community._id, {
        action,
        reason: action === 'suspend' ? 'Administrative policy violation' : 'Administrative clearance'
      });
      toast.success(`Community ${action === 'suspend' ? 'suspended' : 'activated'}`);
      fetchCommunities(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} community`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Community Hub Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Oversee student hubs, verify categories, and handle group violations.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total Communities: <span className="text-slate-900 dark:text-white font-bold">{pagination.total}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search communities by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : communities.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            No communities found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Community</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Creator</th>
                  <th className="py-3.5 px-4">Members</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {communities.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>
                        {c.name}
                        <span className="block text-xs text-slate-400 font-normal">/{c.slug}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {c.creator ? `@${c.creator.username}` : 'Platform'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      {c.membersCount || 1}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.status === 'suspended' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {c.status === 'suspended' ? (
                        <button
                          onClick={() => handleToggleStatus(c, 'activate')}
                          className="text-xs px-3 py-1 font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                        >
                          Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(c, 'suspend')}
                          className="text-xs px-3 py-1 font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchCommunities(pagination.page - 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchCommunities(pagination.page + 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCommunities;
