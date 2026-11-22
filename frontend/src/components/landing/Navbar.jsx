import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCompass, FiUsers, FiBriefcase, FiLayers } from 'react-icons/fi';

const NAV_LINKS = [
  { label: 'Explore Network', href: '#features', icon: <FiCompass className="w-4 h-4" /> },
  { label: 'Communities', href: '#communities', icon: <FiUsers className="w-4 h-4" /> },
  { label: 'Find Teammates', href: '#teammates', icon: <FiLayers className="w-4 h-4" /> },
  { label: 'Opportunities', href: '#opportunities', icon: <FiBriefcase className="w-4 h-4" /> },
];

const LandingNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href) => {
    setMobileOpen(false);
    if (!href || href === '#') return;
    try {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {}
  };

  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-[72px] flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-primary-600 to-sky-500 flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <span className="text-white font-extrabold text-base tracking-wider">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                NEXORA
              </span>
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 tracking-wider uppercase">
                The Network for Builders
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/60 dark:border-slate-800">
            {NAV_LINKS.map(({ label, href }) => (
              <button
                key={label}
                onClick={() => scrollTo(href)}
                className="px-4 py-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all duration-200"
              >
                {label}
              </button>
            ))}
            <Link
              to="/feed"
              className="px-4 py-1.5 text-[13px] font-semibold text-primary-600 dark:text-primary-400 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all"
            >
              Public Feed
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/auth/login"
              className="text-[14px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth/signup"
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-slate-900 dark:bg-primary-600 hover:bg-slate-800 dark:hover:bg-primary-500 shadow-md shadow-slate-900/10 transition-all active:scale-[0.98]"
            >
              Join NEXORA
            </Link>
          </div>

          {/* Mobile Right Action + Hamburger */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <Link
              to="/auth/login"
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Sign in
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="relative w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="block w-4 h-[2px] bg-slate-900 dark:bg-white origin-center"
              />
              <motion.span
                animate={mobileOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                className="block w-4 h-[2px] bg-slate-900 dark:bg-white"
              />
              <motion.span
                animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="block w-4 h-[2px] bg-slate-900 dark:bg-white origin-center"
              />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[99] bg-white dark:bg-slate-950 md:hidden flex flex-col pt-24 px-6 overflow-y-auto"
          >
            <div className="flex flex-col gap-2">
              {NAV_LINKS.map(({ label, href, icon }, i) => (
                <motion.button
                  key={label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => scrollTo(href)}
                  className="flex items-center gap-3 text-lg font-bold text-slate-800 dark:text-slate-100 py-3.5 border-b border-slate-100 dark:border-slate-800 text-left"
                >
                  <span className="text-primary-600 dark:text-primary-400">{icon}</span>
                  {label}
                </motion.button>
              ))}
              <Link
                to="/feed"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 text-lg font-bold text-primary-600 dark:text-primary-400 py-3.5 border-b border-slate-100 dark:border-slate-800"
              >
                🌐 Explore Feed
              </Link>
            </div>
            <div className="mt-8 flex flex-col gap-3 pb-8">
              <Link
                to="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="text-center py-3.5 text-slate-800 dark:text-slate-100 font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/auth/signup"
                onClick={() => setMobileOpen(false)}
                className="text-center py-3.5 text-white font-bold bg-slate-900 dark:bg-primary-600 rounded-xl shadow-md"
              >
                Join NEXORA
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingNavbar;
