import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import {
  FiShield,
  FiSearch,
  FiFilter,
  FiLock,
  FiInfo,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getAuditLogs({
        action: actionFilter,
        targetResource: resourceFilter,
        q: search,
        page,
        limit: 25
      });
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch audit records');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const getActionColor = (action) => {
    if (action.includes('SUSPEND') || action.includes('DELETE') || action.includes('HIDDEN')) {
      return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400';
    }
    if (action.includes('RESTORE') || action.includes('APPROVED') || action.includes('ACTIVATED')) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
    }
    if (action.includes('ROLE')) {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400';
    }
    return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FiShield className="text-primary-600" /> Immutable Operational Audit Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tamper-evident, append-only ledger tracking all administrative decisions, suspensions, and role changes.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <FiLock size={12} /> Append-Only Immutable Records
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search reason, actor, IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Resource:</span>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="all">All Resources</option>
              <option value="User">User</option>
              <option value="Post">Post</option>
              <option value="Report">Report</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Community">Community</option>
              <option value="PlatformSetting">Settings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Entries Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            No audit log records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        @{log.actor?.username || 'system'}
                      </div>
                      <span className="text-[10px] uppercase font-mono text-slate-400">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {log.targetResource}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {log.reason || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      {log.ip || 'internal'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View Metadata Payload"
                      >
                        <FiInfo size={16} />
                      </button>
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
                onClick={() => fetchLogs(pagination.page - 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiLock size={18} className="text-emerald-500" /> Audit Log Event Detail
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold uppercase">Action:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold uppercase">Operator:</span>
                <span className="text-slate-900 dark:text-white font-medium">@{selectedLog.actor?.username || 'system'} ({selectedLog.actorRole})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold uppercase">Target Resource:</span>
                <span className="text-slate-900 dark:text-white font-medium">{selectedLog.targetResource} ({selectedLog.targetId || 'N/A'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold uppercase">Reason:</span>
                <span className="text-slate-900 dark:text-white font-medium">{selectedLog.reason || 'None provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold uppercase">IP / User Agent:</span>
                <span className="text-slate-900 dark:text-white font-mono text-[11px] truncate max-w-xs">{selectedLog.ip} · {selectedLog.userAgent || 'internal'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase block mb-1">Metadata Payload:</span>
                <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl overflow-x-auto font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
