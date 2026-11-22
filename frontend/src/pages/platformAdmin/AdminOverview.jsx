import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  FiUsers,
  FiFileText,
  FiAlertTriangle,
  FiBriefcase,
  FiShield,
  FiTrendingUp,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getStats();
      setStats(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load administrative metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Builders',
      value: stats?.users?.total || 0,
      sub: `${stats?.users?.verified || 0} Verified (${stats?.users?.verificationRate || 0}%)`,
      icon: FiUsers,
      color: 'blue',
      link: '/admin/users'
    },
    {
      title: 'Weekly Active Users (WAU)',
      value: stats?.users?.weeklyActive || 0,
      sub: 'Active in the past 7 days',
      icon: FiActivity,
      color: 'emerald',
      link: '/admin/analytics'
    },
    {
      title: 'Pending Content Reports',
      value: stats?.moderation?.pendingReports || 0,
      sub: stats?.moderation?.pendingReports > 0 ? 'Requires immediate action' : 'Queue clear',
      icon: FiAlertTriangle,
      color: stats?.moderation?.pendingReports > 0 ? 'amber' : 'slate',
      link: '/admin/reports'
    },
    {
      title: 'Pending Opportunities',
      value: stats?.moderation?.pendingOpportunities || 0,
      sub: `${stats?.moderation?.activeOpportunities || 0} live listings`,
      icon: FiBriefcase,
      color: stats?.moderation?.pendingOpportunities > 0 ? 'purple' : 'slate',
      link: '/admin/opportunities'
    },
    {
      title: 'Published Posts',
      value: stats?.content?.totalPosts || 0,
      sub: `${stats?.content?.moderatedPosts || 0} flagged / hidden`,
      icon: FiFileText,
      color: 'indigo',
      link: '/admin/posts'
    },
    {
      title: 'Suspended Accounts',
      value: stats?.users?.suspended || 0,
      sub: 'Enforced by Trust & Safety',
      icon: FiShield,
      color: stats?.users?.suspended > 0 ? 'red' : 'slate',
      link: '/admin/users?status=suspended'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trust, Safety & Operations Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time platform telemetry, user health, and content moderation queues.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="btn-secondary text-xs px-3 py-2 self-start sm:self-auto"
        >
          Refresh Live Metrics
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => (
          <Link
            key={idx}
            to={card.link}
            className="group p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl bg-${card.color}-50 text-${card.color}-600 dark:bg-${card.color}-950/40 dark:text-${card.color}-400`}>
                  <card.icon size={20} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {card.value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{card.sub}</span>
              <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 group-hover:translate-x-1 transition font-semibold">
                View <FiArrowRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Moderation Actions */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiAlertTriangle className="text-amber-500" /> Moderation Task Force
            </h2>
            <Link to="/admin/reports" className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Open Queue
            </Link>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pending tickets submitted by students regarding spam, harassment, inappropriate behavior, or fake profiles.
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Pending Student Complaints</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats?.moderation?.pendingReports || 0}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Opportunity Listings Needing Review</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats?.moderation?.pendingOpportunities || 0}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Hidden / Flagged Posts</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats?.content?.moderatedPosts || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Audit Pulse */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiShield className="text-primary-500" /> Platform Security & Audit
            </h2>
            <Link to="/admin/audit-logs" className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              View Audit Logs
            </Link>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable tracking of all operational actions, role changes, suspensions, and system configuration updates.
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Immutable Audit Entries</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats?.moderation?.totalAuditLogs || 0}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Active Communities</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats?.content?.totalCommunities || 0}
              </span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Active Student Collaborations</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {stats?.content?.totalCollaborations || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
