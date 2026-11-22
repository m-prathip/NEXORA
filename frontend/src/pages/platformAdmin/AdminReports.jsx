import { useState, useEffect, useCallback } from 'react';
import { adminAPI, reportsAPI } from '../../services/api';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiFilter,
  FiUserCheck,
  FiMessageSquare,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Resolve Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [actionTaken, setActionTaken] = useState('warning');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await reportsAPI.getAll({
        targetType: targetTypeFilter,
        status: statusFilter,
        page,
        limit: 20
      });
      setReports(res.data.reports || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch moderation reports');
    } finally {
      setLoading(false);
    }
  }, [targetTypeFilter, statusFilter]);

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return toast.error('Resolution notes are required');

    setActionLoading(true);
    try {
      await reportsAPI.resolve(selectedReport._id, {
        status: resolutionStatus,
        actionTaken,
        resolutionNotes: resolutionNotes.trim()
      });
      toast.success(`Report marked as ${resolutionStatus}`);
      setSelectedReport(null);
      setResolutionNotes('');
      fetchReports(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignToMe = async (reportId) => {
    try {
      await reportsAPI.assign(reportId);
      toast.success('Report assigned to you for investigation');
      fetchReports(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign ticket');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FiAlertTriangle className="text-amber-500" /> Moderation Reports & Tickets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Student-submitted complaints regarding fake profiles, spam, harassment, and policy violations.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Tickets in View: <span className="text-slate-900 dark:text-white font-bold">{pagination.total}</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="pending">Pending Only</option>
              <option value="investigating">Under Investigation</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Target Type:</span>
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="all">All Targets</option>
              <option value="User">User Profile</option>
              <option value="Post">Social Post</option>
              <option value="Comment">Comment</option>
              <option value="Community">Community</option>
              <option value="Opportunity">Opportunity</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => fetchReports(1)}
          className="btn-secondary text-xs px-3 py-2"
        >
          Refresh Queue
        </button>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            No moderation reports in this queue. Great job keeping NEXORA safe!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">Reason & Details</th>
                  <th className="py-3.5 px-4">Reporter</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {reports.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    {/* Ticket ID & Type */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {r.targetType}
                      </span>
                    </td>

                    {/* Target Snapshot */}
                    <td className="py-3.5 px-4 text-xs">
                      {r.targetSnapshot ? (
                        <div>
                          {r.targetType === 'User' && (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              @{r.targetSnapshot.username}
                            </span>
                          )}
                          {r.targetType === 'Post' && (
                            <span className="line-clamp-2 italic text-slate-700 dark:text-slate-300">
                              "{r.targetSnapshot.content?.slice(0, 70)}…"
                            </span>
                          )}
                          {r.targetType === 'Opportunity' && (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {r.targetSnapshot.title} ({r.targetSnapshot.company})
                            </span>
                          )}
                          {r.targetType === 'Community' && (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {r.targetSnapshot.name}
                            </span>
                          )}
                          {r.targetType === 'Comment' && (
                            <span className="line-clamp-2 italic text-slate-700 dark:text-slate-300">
                              "{r.targetSnapshot.content?.slice(0, 70)}…"
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Entity deleted or not found</span>
                      )}
                    </td>

                    {/* Reason & Explanation */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-red-600 dark:text-red-400 text-xs uppercase tracking-wider">
                        {r.reason.replace(/_/g, ' ')}
                      </div>
                      {r.details && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {r.details}
                        </p>
                      )}
                    </td>

                    {/* Reporter */}
                    <td className="py-3.5 px-4 text-xs">
                      {r.reporter ? (
                        <span>@{r.reporter.username}</span>
                      ) : (
                        <span className="text-slate-400 italic">Anonymous / System</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                        r.status === 'investigating' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' :
                        r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleAssignToMe(r._id)}
                            className="text-xs px-2.5 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          >
                            Assign to Me
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedReport(r);
                            setResolutionStatus('resolved');
                          }}
                          className="btn-primary text-xs px-3 py-1"
                        >
                          Resolve
                        </button>
                      </div>
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
                onClick={() => fetchReports(pagination.page - 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchReports(pagination.page + 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Resolve Complaint Ticket
              </h3>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Decision
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="resolved">Resolved (Action Taken / Verified)</option>
                  <option value="dismissed">Dismissed (False Report / No Violation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Action Taken
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="none">No Action (Dismissed)</option>
                  <option value="warning">User Warned</option>
                  <option value="content_removed">Content Removed / Hidden</option>
                  <option value="user_suspended">User Suspended</option>
                  <option value="other">Other Investigation Action</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Notes & Administrative Explanation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Document the outcome and reason for resolving or dismissing this report…"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving…' : 'Submit Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
