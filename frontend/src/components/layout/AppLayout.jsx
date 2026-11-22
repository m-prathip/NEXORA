import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeSwitcher from '../common/ThemeSwitcher';
import BottomNav from './BottomNav';
import { 
  FiHome, FiUsers, FiCompass, FiMessageSquare, FiCode, FiBriefcase, 
  FiCalendar, FiMail, FiBell, FiUser, FiSearch, FiSun, FiMoon, 
  FiLogOut, FiMenu, FiX, FiExternalLink, FiPlus, FiStar, FiGrid,
  FiLayout, FiFolder, FiSettings
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <FiLayout size={19} />, badge: null },
  { to: '/feed', label: 'Home Feed', icon: <FiHome size={19} />, badge: null },
  { to: '/network', label: 'My Network', icon: <FiUsers size={19} />, badge: '3' },
  { to: '/discover', label: 'Discover', icon: <FiCompass size={19} />, badge: null },
  { to: '/communities', label: 'Communities', icon: <FiMessageSquare size={19} />, badge: null },
  { to: '/projects', label: 'Project Showcase', icon: <FiFolder size={19} />, badge: null },
  { to: '/collaborations', label: 'Teammate Collab', icon: <FiCode size={19} />, badge: 'New' },
  { to: '/opportunities', label: 'Opportunities', icon: <FiBriefcase size={19} />, badge: '12' },
  { to: '/events', label: 'Events', icon: <FiCalendar size={19} />, badge: null },
  { to: '/messages', label: 'Messages', icon: <FiMail size={19} />, badge: '2' },
  { to: '/notifications', label: 'Notifications', icon: <FiBell size={19} />, badge: '5' },
  { to: '/settings', label: 'Settings', icon: <FiSettings size={19} />, badge: null },
  { to: '/profile/me', label: 'My Profile', icon: <FiUser size={19} />, badge: null },
];

const AppLayout = () => {
  const { user, isAuth, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out of NEXORA');
    navigate('/auth/login');
  };

  const username = user?.username || 'builder';
  const displayName = user?.name || user?.username || 'Builder';
  const roleHeadline = user?.primaryRole || 'Software Engineer';
  const reputation = user?.reputationPoints || 120;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* ─── Top Utility Navigation Header ─────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 h-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
          {/* Logo & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation"
            >
              {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>

            <Link to="/feed" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-primary-600 to-sky-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-base">N</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-black tracking-tight leading-none text-slate-900 dark:text-white">
                  NEXORA
                </span>
                <span className="text-[9px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Builders Network
                </span>
              </div>
            </Link>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md mx-2 sm:mx-6">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search builders, projects, skills, communities..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-100/90 dark:bg-slate-800/80 border border-transparent focus:border-primary-500 rounded-xl outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme switcher */}
            <ThemeSwitcher />

            {/* Dark/Light mode toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <FiSun size={18} className="text-amber-400" /> : <FiMoon size={18} />}
            </button>

            {/* Notifications shortcut */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:flex"
              aria-label="Notifications"
            >
              <FiBell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-slate-900" />
            </Link>

            {/* Messages shortcut */}
            <Link
              to="/messages"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:flex"
              aria-label="Messages"
            >
              <FiMail size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
            </Link>

            {/* User Profile Avatar & Dropdown */}
            {isAuth ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-xs">
                    {username.slice(0, 2)}
                  </div>
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-xs animate-slide-up">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">@{username}</p>
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md">
                        <FiStar size={12} /> {reputation} Reputation pts
                      </div>
                    </div>

                    <Link
                      to="/profile/me"
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FiUser size={15} /> My Profile
                    </Link>

                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FiLayout size={15} /> Dashboard
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FiSettings size={15} /> Settings & Privacy
                    </Link>

                    <Link
                      to={`/u/${username}`}
                      target="_blank"
                      className="flex items-center justify-between px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="flex items-center gap-2.5">
                        <FiExternalLink size={15} /> View 3D Portfolio
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">Live</span>
                    </Link>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-left font-medium"
                    >
                      <FiLogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth/login" className="text-xs font-bold px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200">
                  Sign in
                </Link>
                <Link to="/auth/signup" className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-primary-600 text-white shadow-xs">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content Container (Desktop Sidebar + Center) ──────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Left Desktop Navigation Rail */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-4">
          {/* Builder Mini ID Card */}
          {isAuth && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white uppercase text-base shadow-sm">
                  {username.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{displayName}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{roleHeadline}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <span>Reputation: <strong className="text-primary-600 dark:text-primary-400 font-bold">{reputation}</strong></span>
                <Link to={`/u/${username}`} target="_blank" className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1">
                  Portfolio <FiExternalLink size={11} />
                </Link>
              </div>
            </div>
          )}

          {/* Navigation Links List */}
          <nav className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* "Build in Public" / New Post Action */}
          <Link
            to="/feed"
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-slate-900 dark:bg-primary-600 hover:bg-slate-800 dark:hover:bg-primary-500 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <FiPlus size={16} /> New Builder Post
          </Link>
        </aside>

        {/* Dynamic Main Page Content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ─── Mobile Bottom Navigation Bar (< 1024px) ─────────────── */}
      <BottomNav onOpenMore={() => setMobileMenuOpen(true)} />

      {/* ─── Mobile Slide-out Menu ("More" Navigation) ──────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative ml-auto w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-base text-slate-900 dark:text-white">NEXORA Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-500">
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {isAuth && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <Link
                  to={`/u/${username}`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <FiExternalLink size={14} /> Open 3D Portfolio
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30"
                >
                  <FiLogOut size={14} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
