import { useState } from 'react';
import { Link } from 'react-router-dom';
import FooterModal from './FooterModal';

const FOOTER_LINKS = {
  Platform: [
    { label: 'Community Feed', href: '/feed', router: true },
    { label: 'My Network', href: '/network', router: true },
    { label: 'Find Teammates', href: '/projects', router: true },
    { label: 'Communities', href: '/communities', router: true },
    { label: 'Opportunities', href: '/opportunities', router: true },
  ],
  Portfolios: [
    { label: 'Live 3D Demo', href: '/u/demo', router: true },
    { label: 'Create Portfolio', href: '/auth/signup', router: true },
    { label: 'Themes & 3D Shaders', href: '/feed', router: true },
    { label: 'QR Code Sharing', href: '/auth/login', router: true },
  ],
  Ecosystem: [
    { label: 'Build in Public', href: '/feed', router: true },
    { label: 'Skill Proof', href: '/discover', router: true },
    { label: 'Events & Hackathons', href: '/events', router: true },
    { label: 'Gemini AI Assistant', href: '/feed', router: true },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/terms', router: true },
    { label: 'Privacy Policy', href: '/privacy', router: true },
    { label: 'Security Overview', href: '#', modal: true },
  ],
};

const FooterSection = () => {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <footer className="relative bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-primary-600 to-sky-500 flex items-center justify-center shadow-md">
                <span className="text-white font-extrabold text-base">N</span>
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
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mb-6">
              The professional networking and portfolio ecosystem combining proof-of-work, developer communities, project collaboration, and AI career recommendations.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Production Infrastructure • Fast & Free</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 tracking-tight">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href, router, modal }) => (
                  <li key={label}>
                    {router ? (
                      <Link
                        to={href}
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                      >
                        {label}
                      </Link>
                    ) : (
                      <button
                        onClick={() => modal && setActiveModal(label)}
                        className="text-left text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                      >
                        {label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            © {new Date().getFullYear()} NEXORA. The Network for Builders. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            <Link to="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link to="/feed" className="text-primary-600 dark:text-primary-400 font-bold hover:underline">Launch App</Link>
          </div>
        </div>
      </div>

      <FooterModal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        label={activeModal}
      />
    </footer>
  );
};

export default FooterSection;
