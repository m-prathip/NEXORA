import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FiGrid,
  FiUsers,
  FiFileText,
  FiShare2,
  FiAlertTriangle,
  FiBriefcase,
  FiBarChart2,
  FiShield,
  FiSettings,
  FiSun,
  FiMoon,
  FiExternalLink,
  FiMenu,
  FiX,
  FiLogOut
} from 'react-icons/fi';

const navItems = [
  { name: 'Overview', path: '/admin', icon: FiGrid, exact: true },
  { name: 'Users', path: '/admin/users', icon: FiUsers },
  { name: 'Posts', path: '/admin/posts', icon: FiFileText },
  { name: 'Communities', path: '/admin/communities', icon: FiShare2 },
  { name: 'Reports & Tickets', path: '/admin/reports', icon: FiAlertTriangle },
  { name: 'Opportunities', path: '/admin/opportunities', icon: FiBriefcase },
  { name: 'Platform Analytics', path: '/admin/analytics', icon: FiBarChart2 },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: FiShield },
  { name: 'Platform Settings', path: '/admin/settings', icon: FiSettings }
];

const AdminDashboardLayout = () => {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const role = (user?.role || 'USER').toUpperCase();

  const getRoleBadge = () => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            SUPER ADMIN
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            ADMINISTRATOR
          </span>
        );
      case 'MODERATOR':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            MODERATOR
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              N
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg text-slate-900 dark:text-white">NEXORA</span>
              <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-2">
                Command Center
              </span>
            </div>
          </Link>

          <div className="hidden sm:block ml-3">
            {getRoleBadge()}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleMode}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {mode === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <span>Exit to App</span>
            <FiExternalLink size={13} />
          </Link>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-xs overflow-hidden border border-slate-200 dark:border-slate-700">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || 'A'
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-white">@{user?.username}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
            flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0
            ${mobileOpen ? 'translate-x-0 top-14' : '-translate-x-full'}
          `}
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 sm:hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Privileges</span>
              {getRoleBadge()}
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition
                  ${isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }
                `}
              >
                <item.icon size={18} className="shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                logout();
                navigate('/auth/login');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
            >
              <FiLogOut size={16} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
          />
        )}

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
