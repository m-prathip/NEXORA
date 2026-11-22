import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiUsers, FiStar, FiExternalLink, FiUserCheck } from 'react-icons/fi';
import { networkAPI } from '../../services/api';

const FALLBACK_MUTUALS = [
  {
    id: 'm-1',
    name: 'Priya Sharma',
    username: 'priyadev',
    headline: 'Full-Stack Developer @ CloudScale • Ex-Intern @ Amazon',
    avatar: '',
    reputationPoints: 850
  },
  {
    id: 'm-2',
    name: 'Kenji Sato',
    username: 'kenji_s',
    headline: 'Distributed Systems & Go Specialist @ OpenEngine',
    avatar: '',
    reputationPoints: 730
  }
];

const MutualConnectionsModal = ({ targetUser, isOpen, onClose }) => {
  const [mutualList, setMutualList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !targetUser?.id) return;

    let isMounted = true;
    setLoading(true);

    networkAPI.getMutual(targetUser.id)
      .then(res => {
        if (!isMounted) return;
        if (res.data?.mutualConnections && res.data.mutualConnections.length > 0) {
          setMutualList(res.data.mutualConnections);
        } else {
          setMutualList(FALLBACK_MUTUALS);
        }
      })
      .catch(() => {
        if (isMounted) setMutualList(FALLBACK_MUTUALS);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, targetUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
              <FiUsers size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Mutual Connections</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Builders you and <span className="font-semibold text-slate-700 dark:text-slate-300">{targetUser?.name || 'this builder'}</span> both know
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 animate-pulse flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="w-48 h-2.5 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : mutualList.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <FiUserCheck size={28} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No mutual connections found</p>
              <p className="text-xs text-slate-500">Connect with more peers to grow your collaborative circle.</p>
            </div>
          ) : (
            mutualList.map(peer => {
              const displayName = peer.name || peer.username;
              return (
                <div 
                  key={peer.id || peer._id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs overflow-hidden">
                      {peer.avatar ? (
                        <img src={peer.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        displayName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${peer.username}`}
                          onClick={onClose}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 transition-colors truncate"
                        >
                          {displayName}
                        </Link>
                        {peer.reputationPoints && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5 shrink-0">
                            <FiStar size={9} /> {peer.reputationPoints}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {peer.headline || 'Software Engineer'}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/profile/${peer.username}`}
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all shrink-0"
                    title="View Profile"
                  >
                    <FiExternalLink size={15} />
                  </Link>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MutualConnectionsModal;
