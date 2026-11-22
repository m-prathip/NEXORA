import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiCode, FiMail, FiGrid } from 'react-icons/fi';

const BottomNav = ({ onOpenMore }) => {
  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-around shadow-lg"
    >
      <NavLink
        to="/feed"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 w-14 py-1 text-xs font-semibold ${
            isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <FiHome size={20} />
        <span className="text-[10px]">Feed</span>
      </NavLink>

      <NavLink
        to="/network"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 w-14 py-1 text-xs font-semibold ${
            isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <FiUsers size={20} />
        <span className="text-[10px]">Network</span>
      </NavLink>

      <NavLink
        to="/projects"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 w-14 py-1 text-xs font-semibold ${
            isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <FiCode size={20} />
        <span className="text-[10px]">Collab</span>
      </NavLink>

      <NavLink
        to="/messages"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 w-14 py-1 text-xs font-semibold ${
            isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <FiMail size={20} />
        <span className="text-[10px]">Messages</span>
      </NavLink>

      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center gap-1 w-14 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer"
        aria-label="More navigation items"
      >
        <FiGrid size={20} />
        <span className="text-[10px]">More</span>
      </button>
    </nav>
  );
};

export default BottomNav;
