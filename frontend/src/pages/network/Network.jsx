import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, FiUserCheck, FiUserPlus, FiCheck, FiX, FiExternalLink, 
  FiMessageSquare, FiStar, FiClock, FiSearch, FiArrowRight 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { networkAPI } from '../../services/api';
import MutualConnectionsModal from '../../components/common/MutualConnectionsModal';
import toast from 'react-hot-toast';

const FALLBACK_REQUESTS = [
  {
    _id: 'req-1',
    requester: {
      _id: 'u-1',
      name: 'Priya Sharma',
      username: 'priyadev',
      headline: 'Full-Stack Developer @ CloudScale • Ex-Intern @ Amazon',
      primaryRole: 'Full-Stack Developer',
      avatar: '',
      reputationPoints: 850
    },
    mutualCount: 14,
    message: 'Hey! Loved your work on the distributed multi-agent system. Would love to connect and chat architectures!'
  },
  {
    _id: 'req-2',
    requester: {
      _id: 'u-2',
      name: 'David Kim',
      username: 'dkim',
      headline: 'UI/UX Designer & Design Systems Lead • Figma Specialist',
      primaryRole: 'UI/UX Designer',
      avatar: '',
      reputationPoints: 920
    },
    mutualCount: 8,
    message: 'Looking for collaborators for an upcoming AI hackathon. Let’s connect!'
  }
];

const FALLBACK_SUGGESTIONS = [
  {
    id: 'sug-1',
    name: 'Elena Rostova',
    username: 'elena_r',
    headline: 'Machine Learning Research Engineer @ Stanford AI Lab',
    skills: ['PyTorch', 'Transformers', 'FastAPI', 'CUDA'],
    reputation: 940,
    mutualCount: 22
  },
  {
    id: 'sug-2',
    name: 'Karthik Raja',
    username: 'karthikr',
    headline: 'Backend Infrastructure & Distributed Database Engineer',
    skills: ['Go', 'PostgreSQL', 'Kafka', 'Kubernetes'],
    reputation: 790,
    mutualCount: 11
  },
  {
    id: 'sug-3',
    name: 'Chloe Bennett',
    username: 'chloeb',
    headline: 'Frontend Engineer @ Vercel Ecosystem • Next.js Contributor',
    skills: ['React 19', 'Next.js', 'Tailwind', 'TypeScript'],
    reputation: 820,
    mutualCount: 19
  },
  {
    id: 'sug-4',
    name: 'Arjun Mehta',
    username: 'arjun_m',
    headline: 'Technical Recruiter & Talent Partner @ HighGrowth AI Startups',
    skills: ['Technical Hiring', 'Staffing', 'Engineering Leadership'],
    reputation: 680,
    mutualCount: 6
  }
];

const Network = () => {
  const { user, isAuth } = useAuth();
  const [requests, setRequests] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [connections, setConnections] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentMap, setSentMap] = useState({});
  const [followingMap, setFollowingMap] = useState({});
  const [activeTab, setActiveTab] = useState('suggestions'); // 'suggestions' | 'connections' | 'sent'
  const [mutualModalUser, setMutualModalUser] = useState(null);

  useEffect(() => {
    loadNetworkData();
  }, [isAuth]);

  const loadNetworkData = async () => {
    setLoading(true);
    if (!isAuth) {
      setRequests(FALLBACK_REQUESTS);
      setSuggestions(FALLBACK_SUGGESTIONS);
      setLoading(false);
      return;
    }

    try {
      const [reqRes, connRes, sugRes] = await Promise.allSettled([
        networkAPI.getRequests(),
        networkAPI.getConnections(),
        networkAPI.getSuggested()
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
        setRequests(reqRes.value.data.incoming || []);
        setOutgoing(reqRes.value.data.outgoing || []);
      } else {
        setRequests(FALLBACK_REQUESTS);
      }

      if (connRes.status === 'fulfilled' && connRes.value?.data) {
        setConnections(connRes.value.data);
      }

      if (sugRes.status === 'fulfilled' && sugRes.value?.data && sugRes.value.data.length > 0) {
        setSuggestions(sugRes.value.data);
      } else {
        setSuggestions(FALLBACK_SUGGESTIONS);
      }
    } catch (err) {
      setRequests(FALLBACK_REQUESTS);
      setSuggestions(FALLBACK_SUGGESTIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId, requesterName) => {
    try {
      if (isAuth) {
        await networkAPI.respondRequest(requestId, 'accept');
      }
      setRequests(prev => prev.filter(r => r._id !== requestId && r.id !== requestId));
      toast.success(`Connected with ${requesterName}!`);
      // Reload connections
      if (isAuth) {
        networkAPI.getConnections().then(res => setConnections(res.data)).catch(() => {});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation');
    }
  };

  const handleIgnore = async (requestId) => {
    try {
      if (isAuth) {
        await networkAPI.respondRequest(requestId, 'reject');
      }
      setRequests(prev => prev.filter(r => r._id !== requestId && r.id !== requestId));
      toast('Connection invitation dismissed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dismiss');
    }
  };

  const handleConnect = async (targetUserId, targetName) => {
    if (!isAuth) {
      setSentMap(prev => ({ ...prev, [targetUserId]: true }));
      toast.success(`Connection request sent to ${targetName}`);
      return;
    }

    try {
      await networkAPI.sendRequest(targetUserId);
      setSentMap(prev => ({ ...prev, [targetUserId]: true }));
      toast.success(`Connection request sent to ${targetName}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    }
  };

  const handleToggleFollow = async (targetUserId, targetName) => {
    if (!isAuth) {
      setFollowingMap(prev => ({ ...prev, [targetUserId]: !prev[targetUserId] }));
      toast.success(`Follow preference updated for ${targetName}`);
      return;
    }

    try {
      const res = await networkAPI.toggleFollow(targetUserId);
      setFollowingMap(prev => ({ ...prev, [targetUserId]: res.data?.following }));
      toast.success(res.data?.following ? `Following ${targetName}` : `Unfollowed ${targetName}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update follow');
    }
  };

  const connectionsCount = connections.length > 0 ? connections.length : (user?.connectionsCount || 0);

  return (
    <div className="space-y-6">
      {/* Network Header Summary */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiUsers className="text-primary-600" /> My Builder Network
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build reciprocal engineering relationships, discover teammates, and track peer invitations.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('connections')}
            className={`text-center px-4 py-2 rounded-2xl border transition-all ${
              activeTab === 'connections'
                ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-600 dark:text-primary-400'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <span className="block text-base font-black text-slate-900 dark:text-white">{connectionsCount}</span>
            <span className="text-[11px] text-slate-500">Connections</span>
          </button>
          <div className="text-center px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="block text-base font-black text-slate-900 dark:text-white">{user?.followersCount || 48}</span>
            <span className="text-[11px] text-slate-500">Followers</span>
          </div>
        </div>
      </div>

      {/* Pending Incoming Invitations (Top Highlight) */}
      {requests.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiUserPlus className="text-amber-500" /> Pending Invitations ({requests.length})
            </h3>
            <span className="text-xs text-slate-400 font-medium">Respond to peer builder invites</span>
          </div>

          <div className="space-y-3">
            {requests.map(req => {
              const rUser = req.requester || req.user || {};
              const reqId = req._id || req.id;
              const displayName = rUser.name || rUser.username || 'Builder';

              return (
                <div 
                  key={reqId} 
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-xs">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/profile/${rUser.username}`} 
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {displayName}
                        </Link>
                        <span className="text-xs text-slate-400">@{rUser.username}</span>
                        {rUser.reputationPoints && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                            <FiStar size={10} /> {rUser.reputationPoints}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {rUser.headline || rUser.primaryRole || 'Software Builder'}
                      </p>
                      
                      {req.message && (
                        <p className="mt-2 text-xs italic text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          "{req.message}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setMutualModalUser({ id: rUser._id || rUser.id, name: displayName, username: rUser.username })}
                          className="text-primary-600 dark:text-primary-400 font-semibold hover:underline cursor-pointer"
                        >
                          {req.mutualCount || 8} mutual connections
                        </button>
                        <Link 
                          to={`/u/${rUser.username}`}
                          target="_blank"
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
                        >
                          3D Portfolio <FiExternalLink size={10} />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleIgnore(reqId)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <FiX size={14} /> Ignore
                    </button>
                    <button
                      onClick={() => handleAccept(reqId, displayName)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <FiCheck size={14} /> Accept Invitation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Network Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'suggestions'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Suggested Builders
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'connections'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiUserCheck size={13} /> My Connections ({connectionsCount})
        </button>
        {outgoing.length > 0 && (
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'sent'
                ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiClock size={13} /> Sent Invitations ({outgoing.length})
          </button>
        )}
      </div>

      {/* Tab: Suggested Builders */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              People You May Want to Build With
            </h3>
            <Link to="/discover" className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1">
              Deep Search by Skill <FiArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map(sug => {
              const sugId = sug.id || sug._id;
              const isSent = !!sentMap[sugId];
              const isFollowing = !!followingMap[sugId];

              return (
                <div
                  key={sugId}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-xs">
                          {sug.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/profile/${sug.username}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            {sug.name}
                          </Link>
                          <p className="text-xs text-slate-400">@{sug.username}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {sug.headline}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0 flex items-center gap-0.5">
                        <FiStar size={10} /> {sug.reputation || 750}
                      </span>
                    </div>

                    {/* Skill Tags */}
                    {sug.skills && sug.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sug.skills.slice(0, 4).map(skill => (
                          <span
                            key={skill}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMutualModalUser({ id: sugId, name: sug.name, username: sug.username })}
                        className="text-primary-600 dark:text-primary-400 font-semibold hover:underline cursor-pointer"
                      >
                        {sug.mutualCount || 8} mutual connections
                      </button>
                      <span>•</span>
                      <Link to={`/u/${sug.username}`} target="_blank" className="hover:underline flex items-center gap-0.5">
                        Portfolio <FiExternalLink size={10} />
                      </Link>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                    <button
                      onClick={() => handleToggleFollow(sugId, sug.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isFollowing
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>

                    <button
                      onClick={() => handleConnect(sugId, sug.name)}
                      disabled={isSent}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                        isSent
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <FiCheck size={12} /> Request Sent
                        </>
                      ) : (
                        <>
                          <FiUserPlus size={12} /> Connect
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: My Connections */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Connected Builders ({connections.length})
            </h3>
          </div>

          {connections.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 mx-auto flex items-center justify-center">
                <FiUsers size={24} />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Direct Connections Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore the suggestions tab or search builders in the Discover portal to connect with collaborative peers.
              </p>
              <button
                onClick={() => setActiveTab('suggestions')}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-xs"
              >
                Browse Suggested Builders
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.map(conn => {
                const cUser = conn.user || {};
                const displayName = cUser.name || cUser.username || 'Builder';

                return (
                  <div
                    key={conn.connectionId || conn._id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-xs">
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          to={`/profile/${cUser.username}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {displayName}
                        </Link>
                        <p className="text-xs text-slate-400">@{cUser.username}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {cUser.headline || cUser.primaryRole || 'Software Builder'}
                        </p>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block">
                          Connected peer
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Link
                        to={`/messages`}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title="Send Message"
                      >
                        <FiMessageSquare size={14} />
                      </Link>
                      <Link
                        to={`/u/${cUser.username}`}
                        target="_blank"
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5"
                      >
                        Portfolio <FiExternalLink size={10} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Outgoing Sent Invitations */}
      {activeTab === 'sent' && outgoing.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Sent Invitations Pending Approval ({outgoing.length})
          </h3>

          <div className="space-y-3">
            {outgoing.map(out => {
              const oUser = out.recipient || {};
              const displayName = oUser.name || oUser.username || 'Builder';

              return (
                <div
                  key={out._id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{displayName}</h4>
                      <p className="text-[11px] text-slate-500">@{oUser.username} • {oUser.primaryRole || 'Software Engineer'}</p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
                    <FiClock size={12} /> Pending Response
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mutual Connections Inspect Modal */}
      <MutualConnectionsModal
        targetUser={mutualModalUser}
        isOpen={Boolean(mutualModalUser)}
        onClose={() => setMutualModalUser(null)}
      />
    </div>
  );
};

export default Network;
