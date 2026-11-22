import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiBell, FiCheck, FiHeart, FiUserPlus, FiMessageSquare, 
  FiZap, FiCheckCircle, FiBriefcase, FiAward, FiInbox
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FALLBACK_NOTIFICATIONS = [
  {
    _id: 'notif-1',
    type: 'connection_request',
    title: 'New Connection Request',
    message: 'Priya Sharma wants to connect with you.',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    read: false,
    link: '/network'
  },
  {
    _id: 'notif-2',
    type: 'collaboration_invite',
    title: 'Teammate Application Received',
    message: 'Sarah Chen applied for "Frontend UI/UX Lead" on AutonomAI.',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    read: false,
    link: '/projects'
  },
  {
    _id: 'notif-3',
    type: 'opportunity_match',
    title: 'New Hackathon Matched',
    message: 'Global AI Agents Hackathon 2026 matches your skills in Python and PyTorch.',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    read: false,
    link: '/opportunities'
  },
  {
    _id: 'notif-4',
    type: 'post_reaction',
    title: 'Milestone Liked',
    message: 'Marcus Vance and 18 other builders liked your Build in Public update.',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    read: true,
    link: '/feed'
  },
  {
    _id: 'notif-5',
    type: 'post_comment',
    title: 'New Discussion Comment',
    message: 'David Kim replied to your post: "Great architecture! How do you handle socket drops?"',
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    read: true,
    link: '/feed'
  }
];

const Notifications = () => {
  const { user, isAuth } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'

  useEffect(() => {
    loadNotifications();
  }, [isAuth]);

  const loadNotifications = async () => {
    setLoading(true);
    if (!isAuth) {
      setNotifications(FALLBACK_NOTIFICATIONS);
      setUnreadCount(3);
      setLoading(false);
      return;
    }

    try {
      const res = await notificationsAPI.getAll();
      if (res.data?.notifications && res.data.notifications.length > 0) {
        const normalized = res.data.notifications.map(n => ({
          ...n,
          read: n.read !== undefined ? n.read : n.isRead
        }));
        setNotifications(normalized);
        setUnreadCount(res.data.unreadCount ?? normalized.filter(n => !n.read).length);
      } else {
        setNotifications(FALLBACK_NOTIFICATIONS);
        setUnreadCount(3);
      }
    } catch {
      setNotifications(FALLBACK_NOTIFICATIONS);
      setUnreadCount(3);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!isAuth) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
      return;
    }

    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      // Local optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.read) return;

    // Optimistic read
    setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    if (isAuth && notif._id && !notif._id.startsWith('notif-')) {
      try {
        await notificationsAPI.markSingleRead(notif._id);
      } catch {
        // Silently handled
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
      case 'new_follower':
        return <FiUserPlus className="text-primary-600" size={18} />;
      case 'collaboration_invite':
      case 'collaboration_accepted':
      case 'collab_applicant':
        return <FiZap className="text-amber-500" size={18} />;
      case 'opportunity_match':
      case 'application_update':
        return <FiBriefcase className="text-emerald-500" size={18} />;
      case 'post_reaction':
      case 'post_like':
        return <FiHeart className="text-red-500" size={18} />;
      case 'post_comment':
        return <FiMessageSquare className="text-indigo-500" size={18} />;
      case 'badge_earned':
      case 'milestone':
        return <FiAward className="text-purple-500" size={18} />;
      default:
        return <FiBell className="text-primary-600" size={18} />;
    }
  };

  const displayedNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiBell className="text-primary-600" /> Activity Notifications
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-600 text-white">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time updates on team invitations, connection requests, opportunities, and discussions.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <FiCheckCircle size={14} className="text-primary-600" /> Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Activity ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'unread'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
            Loading notifications...
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FiInbox className="mx-auto text-slate-400" size={32} />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-slate-500">
              {activeTab === 'unread' ? 'You have read all activity updates!' : 'Activity on your posts, projects, and network will appear here.'}
            </p>
          </div>
        ) : (
          displayedNotifications.map(n => (
            <Link
              key={n._id}
              to={n.link || '/feed'}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 rounded-2xl flex items-start gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 block my-1 ${
                !n.read ? 'bg-primary-50/60 dark:bg-primary-950/25 border-l-4 border-primary-600' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {n.message}
                </p>
              </div>

              {!n.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary-600 self-center shrink-0" title="Unread" />
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
