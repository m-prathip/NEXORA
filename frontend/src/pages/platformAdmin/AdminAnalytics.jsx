import { useState, useEffect, useCallback } from 'react';
import { adminAPI, BASE_URL } from '../../services/api';
import {
  FiBarChart2,
  FiTrendingUp,
  FiUsers,
  FiCheckCircle,
  FiDownload,
  FiCalendar,
  FiBriefcase,
  FiShare2,
  FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAnalytics({ range });
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to calculate platform analytics');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = (type) => {
    window.open(`${BASE_URL}/api/admin/analytics/export?type=${type}`, '_blank');
  };

  const metrics = data?.metrics || {};
  const charts = data?.charts || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FiTrendingUp className="text-emerald-500" /> Platform Analytics & Product Health
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real metrics aggregated from MongoDB data: retention, completion, networking engagement.
          </p>
        </div>

        {/* Range & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs">
            {['7d', '30d', '90d', '1y'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg uppercase transition ${
                  range === r
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="relative group">
            <button className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 shadow-xs">
              <FiDownload size={14} /> Export CSV
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 hidden group-hover:block z-20 text-xs">
              <button
                onClick={() => handleExport('users')}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Export Users
              </button>
              <button
                onClick={() => handleExport('reports')}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Export Reports
              </button>
              <button
                onClick={() => handleExport('audit-logs')}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Export Audit Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* WAU */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Weekly Active Users</span>
                <FiActivity className="text-emerald-500" size={18} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {metrics.weeklyActiveUsers?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-slate-500">
                Active Builder Ratio: <strong className="text-slate-900 dark:text-white">{metrics.wauRatio || 0}%</strong> of base
              </div>
            </div>

            {/* Profile Completion Rate */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Avg Profile Completion</span>
                <FiCheckCircle className="text-blue-500" size={18} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {metrics.profileCompletionRate || 0}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.profileCompletionRate || 0}%` }}
                />
              </div>
            </div>

            {/* Connections Per User */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Network Density</span>
                <FiUsers className="text-purple-500" size={18} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {metrics.avgConnectionsPerUser || 0}
              </div>
              <div className="text-xs text-slate-500">
                Average connections per active student account
              </div>
            </div>

            {/* Collaboration Conversion */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Collab Conversion</span>
                <FiBriefcase className="text-amber-500" size={18} />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {metrics.collaborationConversionRate || 0}%
              </div>
              <div className="text-xs text-slate-500">
                Applications accepted into project teams
              </div>
            </div>
          </div>

          {/* Activity Trends & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Post Creation Trend */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Social Feed Activity</span>
                <span className="text-xs font-normal text-slate-400">Total Days: {charts.postTrends?.length || 0}</span>
              </h2>
              {charts.postTrends && charts.postTrends.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {charts.postTrends.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500">{item.date}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{item.posts} posts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No post data in selected time frame.
                </div>
              )}
            </div>

            {/* Opportunities Engagement */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Student Opportunity Engagement</span>
                <span className="text-xs font-normal text-slate-400">Past {range}</span>
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Opportunity Discoveries / Views
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {metrics.opportunityViews || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Outbound Application Link Clicks
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {metrics.opportunityClicks || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Click-Through Intent Rate
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics.opportunityViews > 0
                      ? Math.round((metrics.opportunityClicks / metrics.opportunityViews) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;
