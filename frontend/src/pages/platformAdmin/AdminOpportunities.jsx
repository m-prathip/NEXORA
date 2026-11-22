import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import {
  FiBriefcase,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiClock,
  FiSearch,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Rejection modal
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOpportunities = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getOpportunities({
        status: statusFilter,
        q: search,
        page,
        limit: 20
      });
      setOpportunities(res.data.opportunities || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOpportunities(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOpportunities]);

  const handleApprove = async (opp) => {
    try {
      await adminAPI.moderateOpportunity(opp._id, { action: 'approve' });
      toast.success(`Opportunity "${opp.title}" approved and live!`);
      fetchOpportunities(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve listing');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminAPI.moderateOpportunity(selectedOpp._id, {
        action: 'reject',
        reason: rejectReason.trim()
      });
      toast.success(`Opportunity rejected`);
      setSelectedOpp(null);
      setRejectReason('');
      fetchOpportunities(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject listing');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FiBriefcase className="text-primary-600" /> Opportunities Moderation & Approval
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Validate external internships, fresher roles, and hackathons submitted by the builder community.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total in View: <span className="text-slate-900 dark:text-white font-bold">{pagination.total}</span>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['pending', 'active', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition shrink-0 ${
                statusFilter === tab
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'pending' ? 'Pending Approval' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search title, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Listings */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Spinner size="lg" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No opportunities found in the "{statusFilter}" queue.
          </div>
        ) : (
          opportunities.map((opp) => (
            <div
              key={opp._id}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {opp.title}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {opp.company}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 capitalize">
                    {opp.type.replace('_', ' ')}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    opp.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                    opp.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                  }`}>
                    {opp.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {opp.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>Location: <strong className="text-slate-700 dark:text-slate-300">{opp.location || 'Remote'}</strong></span>
                  <span>Submitted By: <strong className="text-slate-700 dark:text-slate-300">@{opp.poster?.username || 'builder'}</strong></span>
                  <a
                    href={opp.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    Verify Source Link <FiExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                {opp.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(opp)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                    >
                      <FiCheckCircle size={14} /> Approve & Publish
                    </button>
                    <button
                      onClick={() => setSelectedOpp(opp)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100 transition"
                    >
                      <FiXCircle size={14} /> Reject
                    </button>
                  </>
                )}
                {opp.status === 'active' && (
                  <button
                    onClick={() => setSelectedOpp(opp)}
                    className="text-xs px-3 py-1.5 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                  >
                    Unpublish
                  </button>
                )}
                {opp.status === 'rejected' && (
                  <button
                    onClick={() => handleApprove(opp)}
                    className="text-xs px-3 py-1.5 font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition"
                  >
                    Re-approve
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchOpportunities(pagination.page - 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchOpportunities(pagination.page + 1)}
                className="btn-secondary px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Reject Opportunity Listing
              </h3>
              <button onClick={() => setSelectedOpp(null)} className="text-slate-400 hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Rejection *
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white mb-2"
                >
                  <option value="">Select a reason…</option>
                  <option value="Invalid or broken source link">Invalid or broken source link</option>
                  <option value="Commercial promotional advertisement or course sale">Commercial promotional advertisement or course sale</option>
                  <option value="Unverified employer / Potential scam">Unverified employer / Potential scam</option>
                  <option value="Incomplete job description or requirements">Incomplete job description or requirements</option>
                  <option value="Expired deadline">Expired deadline</option>
                </select>
                <input
                  type="text"
                  placeholder="Or enter custom reason…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOpp(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOpportunities;
