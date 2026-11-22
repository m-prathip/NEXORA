import { useState, useEffect } from 'react';
import { 
  FiBriefcase, FiMapPin, FiDollarSign, FiClock, FiSearch, 
  FiFilter, FiCheck, FiExternalLink, FiBookmark, FiPlus, FiX, 
  FiSend, FiAward, FiCalendar, FiCheckCircle, FiLayers, FiAlertCircle
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { opportunitiesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const OPPORTUNITY_TYPES = [
  { id: 'All', label: 'All Opportunities' },
  { id: 'internship', label: 'Internships' },
  { id: 'fresher_job', label: 'Fresher Roles' },
  { id: 'hackathon', label: 'Hackathons' },
  { id: 'competition', label: 'Technical Competitions' },
  { id: 'workshop', label: 'Workshops' }
];

const FALLBACK_OPPORTUNITIES = [
  {
    _id: 'opp-1',
    title: 'AI Systems Software Engineer Intern (Summer 2027)',
    company: 'NeuralFlow Labs',
    type: 'internship',
    location: 'San Francisco, CA (or Remote)',
    locationType: 'remote',
    salary: '$50 – $65 / hr',
    skills: ['Python', 'PyTorch', 'FastAPI', 'Docker'],
    description: 'Work alongside core researchers scaling inference clusters, optimizing prompt embeddings, and integrating custom model checkpoints into high-throughput production services.',
    sourceUrl: 'https://careers.neuralflow.ai/internships',
    deadline: '2027-02-15T00:00:00.000Z',
    applicantsCount: 42,
    isSaved: false
  },
  {
    _id: 'opp-2',
    title: 'Graduate Frontend Engineer (React 19 & Tailwind)',
    company: 'HyperScale Cloud',
    type: 'fresher_job',
    location: 'Remote',
    locationType: 'remote',
    salary: '$95,000 – $115,000 / yr',
    skills: ['React 19', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    description: 'Looking for a fresh graduate engineer who loves crafting pixel-perfect interfaces, responsive dashboards, and high-performance WebGL / micro-interaction visuals.',
    sourceUrl: 'https://hyperscale.cloud/careers',
    deadline: '2027-03-01T00:00:00.000Z',
    applicantsCount: 68,
    isSaved: true
  },
  {
    _id: 'opp-3',
    title: 'Global Autonomous Agent Hackathon 2026',
    company: 'Open Cognitive Foundation',
    type: 'hackathon',
    location: 'Global Virtual',
    locationType: 'remote',
    salary: '$50,000 in Prizes',
    skills: ['Agent Architecture', 'LLMs', 'Python', 'WebSockets'],
    description: 'Build autonomous multi-agent systems that coordinate across tool APIs, memory stores, and distributed workers to solve complex real-world workflows.',
    sourceUrl: 'https://agenthack.dev',
    deadline: '2026-12-20T00:00:00.000Z',
    eventDate: '2026-12-22T00:00:00.000Z',
    applicantsCount: 310,
    isSaved: true
  },
  {
    _id: 'opp-4',
    title: 'Distributed Consensus & Raft Architecture Competition',
    company: 'SystemsGuild',
    type: 'competition',
    location: 'Online Benchmark',
    locationType: 'remote',
    salary: '$20,000 in Prizes',
    skills: ['Go', 'Rust', 'Distributed Systems', 'Raft'],
    description: 'Implement a distributed key-value store in Go or Rust that passes rigorous Jepsen partition tests with maximum linearizable read/write throughput.',
    sourceUrl: 'https://systemsguild.org/contest',
    deadline: '2027-01-10T00:00:00.000Z',
    applicantsCount: 85,
    isSaved: false
  },
  {
    _id: 'opp-5',
    title: 'Zero-Knowledge Cryptography & Formal Verification Workshop',
    company: 'Veritas Security Labs',
    type: 'workshop',
    location: 'Virtual Masterclass',
    locationType: 'remote',
    salary: 'Free Certificate & Compute Credits',
    skills: ['Cryptography', 'Rust', 'ZK-SNARKs', 'AppSec'],
    description: '3-day hands-on intensive workshop led by research cryptographers covering zk-SNARK circuits, formal verification proofs, and secure protocol auditing.',
    sourceUrl: 'https://veritaslabs.io/workshop',
    deadline: '2026-12-15T00:00:00.000Z',
    eventDate: '2026-12-18T00:00:00.000Z',
    applicantsCount: 140,
    isSaved: false
  }
];

const Opportunities = () => {
  const { user, isAuth } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [trackedList, setTrackedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('All');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'saved' | 'tracked'
  const [search, setSearch] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [trackStatus, setTrackStatus] = useState('applied');
  const [trackNotes, setTrackNotes] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Create Form state
  const [createForm, setCreateForm] = useState({
    title: '',
    company: '',
    type: 'internship',
    locationType: 'remote',
    location: 'Remote',
    salary: '',
    skills: '',
    description: '',
    sourceUrl: '',
    deadline: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadOpportunities();
    if (isAuth) {
      loadTracked();
    }
  }, [activeType, activeTab, search, isAuth]);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const res = await opportunitiesAPI.getAll({
        type: activeType === 'All' ? undefined : activeType,
        q: search.trim() || undefined,
        savedOnly: activeTab === 'saved' ? 'true' : undefined
      });
      if (res.data?.opportunities && res.data.opportunities.length > 0) {
        setOpportunities(res.data.opportunities);
      } else if (Array.isArray(res.data) && res.data.length > 0) {
        setOpportunities(res.data);
      } else {
        setOpportunities(filterFallback());
      }
    } catch {
      setOpportunities(filterFallback());
    } finally {
      setLoading(false);
    }
  };

  const loadTracked = async () => {
    try {
      const res = await opportunitiesAPI.getMyTracked();
      if (res.data) setTrackedList(res.data);
    } catch {
      // fallback
    }
  };

  const filterFallback = () => {
    let list = [...FALLBACK_OPPORTUNITIES];
    if (activeType !== 'All') {
      list = list.filter(o => o.type === activeType);
    }
    if (activeTab === 'saved') {
      list = list.filter(o => o.isSaved);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.company.toLowerCase().includes(q) ||
        (o.skills && o.skills.some(s => s.toLowerCase().includes(q))) ||
        (o.description && o.description.toLowerCase().includes(q))
      );
    }
    return list;
  };

  const toggleSave = async (opp) => {
    const oppId = opp._id;
    if (!isAuth) {
      setOpportunities(prev => prev.map(o => o._id === oppId ? { ...o, isSaved: !o.isSaved } : o));
      toast.success(opp.isSaved ? 'Removed from saved' : 'Saved opportunity');
      return;
    }

    try {
      const res = await opportunitiesAPI.toggleSave(oppId);
      setOpportunities(prev => prev.map(o => o._id === oppId ? { ...o, isSaved: res.data.saved } : o));
      toast.success(res.data.saved ? 'Saved opportunity' : 'Removed from saved');
    } catch (err) {
      toast.error('Failed to update bookmark');
    }
  };

  // Open Track Modal
  const openTrack = (opp) => {
    setSelectedOpp(opp);
    setTrackStatus(opp.myTracking?.status || 'applied');
    setTrackNotes(opp.myTracking?.notes || '');
    setShowTrackModal(true);
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOpp) return;

    setTrackingLoading(true);
    const oppId = selectedOpp._id;

    if (!isAuth) {
      toast.success(`Application status updated to: ${trackStatus}`);
      setShowTrackModal(false);
      setTrackingLoading(false);
      return;
    }

    try {
      await opportunitiesAPI.track(oppId, {
        status: trackStatus,
        notes: trackNotes
      });
      toast.success(`Application tracked as: ${trackStatus.toUpperCase()}`);
      setShowTrackModal(false);
      loadOpportunities();
      loadTracked();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update application tracker');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.company.trim() || !createForm.description.trim() || !createForm.sourceUrl.trim()) {
      return toast.error('Title, company, description, and verified source URL are required');
    }

    setCreating(true);
    if (!isAuth) {
      const mockOpp = {
        _id: `opp-${Date.now()}`,
        ...createForm,
        skills: createForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        applicantsCount: 1,
        isSaved: false
      };
      setOpportunities([mockOpp, ...opportunities]);
      setShowCreateModal(false);
      setCreating(false);
      toast.success('Opportunity published!');
      return;
    }

    try {
      const res = await opportunitiesAPI.create({
        ...createForm,
        skills: createForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      });
      setOpportunities([res.data, ...opportunities]);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        company: '',
        type: 'internship',
        locationType: 'remote',
        location: 'Remote',
        salary: '',
        skills: '',
        description: '',
        sourceUrl: '',
        deadline: ''
      });
      toast.success('Opportunity published! (+10 reputation pts)');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish opportunity');
    } finally {
      setCreating(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'internship':
        return 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border-primary-500/20';
      case 'fresher_job':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'hackathon':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'competition':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'workshop':
        return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const formatDeadline = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Opportunities Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Verified Builder Opportunities
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <FiBriefcase className="text-emerald-600" /> Opportunities, Hackathons & Challenges
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Explore verified internships, fresher engineering roles, global hackathons, and technical competitions. All listings link directly to official verification source portals.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 self-start sm:self-auto shadow-xs transition-all shrink-0"
        >
          <FiPlus size={15} /> Post Opportunity
        </button>
      </div>

      {/* Navigation Sub-Tabs: All | Saved | Tracked */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Opportunities ({opportunities.length})
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'saved'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiBookmark size={13} /> Saved Listings
        </button>

        {isAuth && (
          <button
            onClick={() => setActiveTab('tracked')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'tracked'
                ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FiCheckCircle size={13} /> Tracked Applications ({trackedList.length})
          </button>
        )}
      </div>

      {/* Search & Category Filter Pills */}
      {activeTab !== 'tracked' && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role title, company, hackathon name, or technology..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {OPPORTUNITY_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeType === t.id
                    ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 1 & 2: OPPORTUNITY LISTINGS ──────────────────────── */}
      {activeTab !== 'tracked' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-3">
                  <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="w-full h-12 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <FiBriefcase size={36} className="mx-auto text-slate-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">No opportunities match your filter</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Check back shortly or post an opportunity from your university or company network!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {opportunities.map(opp => {
                const deadlineFormatted = formatDeadline(opp.deadline);
                const hasTracked = opp.myTracking || trackedList.some(t => t.opportunityId === opp._id);

                return (
                  <div
                    key={opp._id}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getTypeBadge(opp.type)}`}>
                              {opp.type.toUpperCase().replace('_', ' ')}
                            </span>
                            {opp.location && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                                <FiMapPin size={11} /> {opp.location}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1.5 leading-snug">
                            {opp.title}
                          </h3>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {opp.company}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleSave(opp)}
                          className={`p-2 rounded-xl transition-colors shrink-0 ${
                            opp.isSaved
                              ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/40'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Save Opportunity"
                        >
                          <FiBookmark size={16} className={opp.isSaved ? 'fill-primary-600' : ''} />
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {opp.description}
                      </p>

                      {/* Skills Tags */}
                      {opp.skills && opp.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {opp.skills.map(s => (
                            <span
                              key={s}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Compensation & Date Info */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {opp.salary || 'Competitive'}
                        </span>
                        {deadlineFormatted && (
                          <span className="flex items-center gap-1">
                            <FiClock size={11} /> Deadline: {deadlineFormatted}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                      {/* Track Application Button */}
                      <button
                        onClick={() => openTrack(opp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                          hasTracked
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <FiCheckCircle size={12} />
                        {hasTracked ? `Tracked: ${opp.myTracking?.status?.toUpperCase() || 'APPLIED'}` : 'Track Status'}
                      </button>

                      {/* Official Source Link */}
                      <a
                        href={opp.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        Official Source <FiExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 3: APPLICATION TRACKER TABLE ─────────────────────── */}
      {activeTab === 'tracked' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              My Tracked Job & Hackathon Applications ({trackedList.length})
            </h3>
            <span className="text-slate-400">Manage your active recruitment and challenge stages</span>
          </div>

          {trackedList.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <FiCheckCircle size={28} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No applications currently tracked</p>
              <p className="text-xs text-slate-500">Click "Track Status" on any internship or hackathon to organize your applications pipeline!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trackedList.map(t => {
                const status = t.myTracking?.status || 'applied';
                return (
                  <div
                    key={t.opportunityId}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeBadge(t.type)}`}>
                          {t.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.company} • {t.location} • Compensation: {t.salary}
                      </p>
                      {t.myTracking?.notes && (
                        <p className="text-xs italic text-slate-600 dark:text-slate-300 pt-1">
                          Notes: "{t.myTracking.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        status === 'offered'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : status === 'interviewing'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : status === 'rejected'
                              ? 'bg-red-500/10 text-red-600 border-red-500/20'
                              : 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 border-primary-500/20'
                      }`}>
                        {status.toUpperCase()}
                      </span>

                      <a
                        href={t.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Open Source Link"
                      >
                        <FiExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: Track Application ─────────────────────────────── */}
      {showTrackModal && selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Track Application</h3>
                <p className="text-xs text-slate-400">{selectedOpp.title}</p>
              </div>
              <button onClick={() => setShowTrackModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleTrackSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Application Pipeline Stage</label>
                <select
                  value={trackStatus}
                  onChange={(e) => setTrackStatus(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="applied">Applied (Resume Submitted)</option>
                  <option value="interviewing">Interviewing (Technical / OA)</option>
                  <option value="offered">Offer Received 🎉</option>
                  <option value="rejected">Not Selected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Personal Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={trackNotes}
                  onChange={(e) => setTrackNotes(e.target.value)}
                  placeholder="e.g. Applied with portfolio link, scheduled for system design round..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTrackModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {trackingLoading ? 'Saving...' : 'Update Tracker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Post Opportunity ──────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Post Opportunity or Hackathon</h3>
                <p className="text-xs text-slate-400">Share verified opportunities with the builder community</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Distributed Database Intern or AI Agent Hackathon"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company / Organizer *</label>
                  <input
                    type="text"
                    required
                    value={createForm.company}
                    onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    placeholder="e.g. Google, MIT Hack, CloudScale"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category Type</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="internship">Internship</option>
                    <option value="fresher_job">Fresher Job</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="competition">Competition</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Verified Source URL *</label>
                <input
                  type="url"
                  required
                  value={createForm.sourceUrl}
                  onChange={(e) => setCreateForm({ ...createForm, sourceUrl: e.target.value })}
                  placeholder="https://company.com/jobs/123 or https://hackathon.dev"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Compensation / Prize</label>
                  <input
                    type="text"
                    value={createForm.salary}
                    onChange={(e) => setCreateForm({ ...createForm, salary: e.target.value })}
                    placeholder="e.g. $50/hr or $25k in Prizes"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={createForm.deadline}
                    onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  value={createForm.skills}
                  onChange={(e) => setCreateForm({ ...createForm, skills: e.target.value })}
                  placeholder="Python, React, Docker, Distributed Systems"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Overview of the role, challenges, or hackathon themes..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {creating ? 'Publishing...' : 'Publish Listing (+10 Pts)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Opportunities;
