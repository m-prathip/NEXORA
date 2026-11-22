import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiZap, FiUsers, FiBriefcase, FiCalendar, FiCompass, 
  FiExternalLink, FiPlus, FiArrowRight, FiStar, FiCode, 
  FiTrendingUp, FiBookmark, FiCheckCircle, FiActivity 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { networkAPI, opportunitiesAPI, eventsAPI, communitiesAPI } from '../../services/api';

const MainDashboard = () => {
  const { user, isAuth } = useAuth();
  const [suggestedBuilders, setSuggestedBuilders] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.name || user?.username || 'Builder';
  const roleHeadline = user?.primaryRole || 'Software Architect & Engineer';
  const reputation = user?.reputationPoints || 140;

  useEffect(() => {
    loadDashboardData();
  }, [isAuth]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sugRes, oppRes, evRes, commRes] = await Promise.allSettled([
        networkAPI.getSuggested(),
        opportunitiesAPI.getAll({ limit: 3 }),
        eventsAPI.getAll({ limit: 2 }),
        communitiesAPI.getAll({ limit: 3 })
      ]);

      if (sugRes.status === 'fulfilled' && sugRes.value?.data) {
        setSuggestedBuilders(sugRes.value.data.slice(0, 3));
      }
      if (oppRes.status === 'fulfilled' && oppRes.value?.data) {
        setOpportunities(oppRes.value.data.slice(0, 3));
      }
      if (evRes.status === 'fulfilled' && evRes.value?.data) {
        setEvents(evRes.value.data.slice(0, 2));
      }
      if (commRes.status === 'fulfilled' && commRes.value?.data) {
        setCommunities(commRes.value.data.slice(0, 3));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Center Main Column (2 columns on desktop) ─────────────── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Welcome Executive Header */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-primary-900/10 to-sky-900/10 border border-primary-500/20 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full border border-primary-500/20">
                Builder Command Center
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                Welcome back, {displayName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Here is your technical radar: active teammate searches, matched opportunities, and peer interactions.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                to="/feed"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-1.5 transition-all"
              >
                <FiPlus size={14} /> Share Update
              </Link>
              <Link
                to={`/u/${user?.username || 'builder'}`}
                target="_blank"
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <FiExternalLink size={13} /> 3D Portfolio
              </Link>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 text-[11px] block">Builder Score</span>
              <span className="text-base font-black text-primary-600 dark:text-primary-400 flex items-center gap-1 mt-0.5">
                <FiStar size={14} className="text-amber-500" /> {reputation}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 text-[11px] block">Connections</span>
              <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                {user?.connectionsCount || 24}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 text-[11px] block">Weekly Views</span>
              <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                340
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 text-[11px] block">Search Appears</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                +18%
              </span>
            </div>
          </div>
        </div>

        {/* Project Collaboration & "Find My Teammate" Spotlight */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FiZap className="text-amber-500" /> Active Collaboration Board
              </h3>
              <p className="text-xs text-slate-500">Teams looking for complementary skillsets</p>
            </div>
            <Link to="/projects" className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1">
              Browse All <FiArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  AI & ML Systems
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  AutonomAI Distributed Agent Orchestrator
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  Seeking a React 19 Canvas lead for real-time inference latency graph visualization.
                </p>
              </div>
              <Link
                to="/projects"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs self-start sm:self-auto shrink-0"
              >
                Apply for Role
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Full-Stack Cloud
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  DevRadar Dependency Vulnerability Monitor
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  Seeking UI/UX Designer and Node.js security researcher to build automated AST analysis.
                </p>
              </div>
              <Link
                to="/projects"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs self-start sm:self-auto shrink-0"
              >
                Apply for Role
              </Link>
            </div>
          </div>
        </div>

        {/* Opportunities Radar Matches */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FiBriefcase className="text-emerald-500" /> Matched Opportunities
              </h3>
              <p className="text-xs text-slate-500">Roles tailored to your craft</p>
            </div>
            <Link to="/opportunities" className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1">
              Explore All <FiArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {opportunities.length > 0 ? (
              opportunities.map(opp => (
                <div key={opp._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{opp.title}</h4>
                    <p className="text-xs text-primary-600 font-semibold">{opp.company} • {opp.location}</p>
                  </div>
                  <Link
                    to="/opportunities"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs"
                  >
                    Quick Apply
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Discover fresh internships and developer roles on the Opportunities page.</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Right Column: Recommendations & Events ─────────────────── */}
      <div className="space-y-6">
        {/* Recommended Builders */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiUsers className="text-primary-600" /> Suggested Builders
            </h4>
            <Link to="/network" className="text-xs text-primary-600 font-semibold hover:underline">
              See All
            </Link>
          </div>

          <div className="space-y-3">
            {suggestedBuilders.length > 0 ? (
              suggestedBuilders.map(b => (
                <div key={b.id || b._id} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0">
                      {(b.name || b.username || 'B').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link to={`/profile/${b.username}`} className="font-bold text-xs text-slate-900 dark:text-white hover:text-primary-600">
                        {b.name || b.username}
                      </Link>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{b.headline || 'Software Engineer'}</p>
                    </div>
                  </div>
                  <Link
                    to="/network"
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary-600 border border-primary-500/30 hover:bg-primary-50 dark:hover:bg-primary-950/40 shrink-0"
                  >
                    Connect
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Discover builders in your domain via the Network tab.</p>
            )}
          </div>
        </div>

        {/* Upcoming Hackathons & Tech Events */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiCalendar className="text-indigo-500" /> Upcoming Events
            </h4>
            <Link to="/events" className="text-xs text-primary-600 font-semibold hover:underline">
              Calendar
            </Link>
          </div>

          <div className="space-y-3">
            {events.length > 0 ? (
              events.map(ev => (
                <div key={ev._id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    {ev.type}
                  </span>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">{ev.title}</h5>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                    <span>{new Date(ev.startDate).toLocaleDateString()}</span>
                    <Link to="/events" className="font-bold text-primary-600 hover:underline">RSVP</Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No events scheduled. Host one from the Events portal!</p>
            )}
          </div>
        </div>

        {/* Domain Communities */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiCompass className="text-primary-600" /> Recommended Guilds
            </h4>
            <Link to="/communities" className="text-xs text-primary-600 font-semibold hover:underline">
              Explore
            </Link>
          </div>

          <div className="space-y-2.5">
            {communities.length > 0 ? (
              communities.map(c => (
                <div key={c._id} className="flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">{c.name}</h5>
                    <span className="text-[10px] text-slate-400">{c.membersCount || 1} members</span>
                  </div>
                  <Link
                    to="/communities"
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary-600 border border-primary-500/30 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                  >
                    Join
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Join technical developer guilds to discuss architectures.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
