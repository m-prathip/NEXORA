import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiCompass, FiSearch, FiFilter, FiExternalLink, FiCode, 
  FiStar, FiUsers, FiAward, FiCheck, FiUserPlus, FiArrowRight, 
  FiBookOpen, FiZap, FiRefreshCw 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { networkAPI } from '../../services/api';
import MutualConnectionsModal from '../../components/common/MutualConnectionsModal';
import toast from 'react-hot-toast';

const POPULAR_SKILLS = ['All', 'Python', 'React 19', 'TypeScript', 'PyTorch', 'Docker', 'Kubernetes', 'Go', 'Rust'];
const POPULAR_COLLEGES = ['All', 'Stanford University', 'MIT', 'UC Berkeley', 'IIT', 'NIT'];
const POPULAR_INTERESTS = ['All', 'Distributed Systems', 'Generative AI', 'Open Source', 'Cloud Native', 'Cybersecurity'];

const FALLBACK_BUILDERS = [
  {
    id: 'b-1',
    name: 'Devin Thorne',
    username: 'devin_t',
    primaryRole: 'AI/ML Engineer',
    headline: 'Fine-tuning open weights & scaling inference servers @ HyperScale',
    college: 'Stanford University',
    department: 'Computer Science',
    skills: ['PyTorch', 'TensorFlow', 'LLMs', 'Python', 'FastAPI'],
    interests: ['Generative AI', 'Distributed Systems'],
    reputation: 840,
    mutualCount: 14
  },
  {
    id: 'b-2',
    name: 'Amara Okafor',
    username: 'amara_o',
    primaryRole: 'UI/UX & Design Systems Lead',
    headline: 'Crafting accessible React design systems with Tailwind & Radix',
    college: 'UC Berkeley',
    department: 'Human-Computer Interaction',
    skills: ['Figma', 'React 19', 'Tailwind CSS', 'TypeScript'],
    interests: ['Developer Tools', 'Open Source'],
    reputation: 920,
    mutualCount: 9
  },
  {
    id: 'b-3',
    name: 'Kenji Sato',
    username: 'kenji_s',
    primaryRole: 'Distributed Systems & Go Specialist',
    headline: 'High-throughput database engines & Raft consensus implementations',
    college: 'MIT',
    department: 'Computer Systems',
    skills: ['Go', 'gRPC', 'PostgreSQL', 'Docker', 'Kubernetes'],
    interests: ['Distributed Systems', 'Cloud Native'],
    reputation: 730,
    mutualCount: 18
  },
  {
    id: 'b-4',
    name: 'Maya Lin',
    username: 'mayalin',
    primaryRole: 'Full-Stack Developer & Security Researcher',
    headline: 'Modern web architectures, zero-trust auth & offensive AppSec',
    college: 'National Institute of Technology',
    department: 'Information Security',
    skills: ['Node.js', 'Express', 'React 19', 'TypeScript', 'Docker'],
    interests: ['Cybersecurity', 'Open Source'],
    reputation: 670,
    mutualCount: 6
  },
  {
    id: 'b-5',
    name: 'Tariq Al-Mansoor',
    username: 'tariq_dev',
    primaryRole: 'Cloud & DevOps Architect',
    headline: 'Terraform, multi-region AWS/GCP clusters & GitOps pipelines',
    college: 'IIT',
    department: 'Computer Engineering',
    skills: ['Terraform', 'Kubernetes', 'AWS', 'Docker', 'Go'],
    interests: ['Cloud Native', 'Distributed Systems'],
    reputation: 880,
    mutualCount: 12
  },
  {
    id: 'b-6',
    name: 'Sophia Chen',
    username: 'sophiac',
    primaryRole: 'AI Research Scientist',
    headline: 'Diffusion models, multi-modal embeddings & evaluation pipelines',
    college: 'Stanford University',
    department: 'Artificial Intelligence',
    skills: ['PyTorch', 'Python', 'JAX', 'Computer Vision'],
    interests: ['Generative AI', 'Deep Learning'],
    reputation: 960,
    mutualCount: 21
  }
];

const Discover = () => {
  const { user, isAuth } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState('All');
  const [selectedCollege, setSelectedCollege] = useState('All');
  const [selectedInterest, setSelectedInterest] = useState('All');
  
  const [builders, setBuilders] = useState(FALLBACK_BUILDERS);
  const [loading, setLoading] = useState(false);
  const [sentMap, setSentMap] = useState({});
  const [mutualModalUser, setMutualModalUser] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchBuilders();
    }, 250);

    return () => clearTimeout(handler);
  }, [search, selectedRole, selectedSkill, selectedCollege, selectedInterest]);

  const fetchBuilders = async () => {
    if (!isAuth) {
      filterFallbackBuilders();
      return;
    }

    setLoading(true);
    try {
      const res = await networkAPI.discover({
        q: search.trim() || undefined,
        role: selectedRole === 'All' ? undefined : selectedRole,
        skill: selectedSkill === 'All' ? undefined : selectedSkill,
        college: selectedCollege === 'All' ? undefined : selectedCollege,
        interest: selectedInterest === 'All' ? undefined : selectedInterest,
        limit: 20
      });

      if (res.data?.builders && res.data.builders.length > 0) {
        setBuilders(res.data.builders);
      } else {
        filterFallbackBuilders();
      }
    } catch {
      filterFallbackBuilders();
    } finally {
      setLoading(false);
    }
  };

  const filterFallbackBuilders = () => {
    let list = [...FALLBACK_BUILDERS];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b => 
        b.name.toLowerCase().includes(q) ||
        b.username.toLowerCase().includes(q) ||
        (b.headline && b.headline.toLowerCase().includes(q)) ||
        (b.college && b.college.toLowerCase().includes(q)) ||
        (b.skills && b.skills.some(s => s.toLowerCase().includes(q)))
      );
    }

    if (selectedRole !== 'All') {
      list = list.filter(b => b.primaryRole?.toLowerCase().includes(selectedRole.toLowerCase()));
    }

    if (selectedSkill !== 'All') {
      list = list.filter(b => b.skills && b.skills.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase())));
    }

    if (selectedCollege !== 'All') {
      list = list.filter(b => b.college && b.college.toLowerCase().includes(selectedCollege.toLowerCase()));
    }

    if (selectedInterest !== 'All') {
      list = list.filter(b => b.interests && b.interests.some(i => i.toLowerCase().includes(selectedInterest.toLowerCase())));
    }

    setBuilders(list);
  };

  const handleConnect = async (builder) => {
    const builderId = builder.id || builder._id;
    setSentMap(prev => ({ ...prev, [builderId]: true }));
    toast.success(`Connection request sent to ${builder.name}!`);

    if (isAuth) {
      try {
        await networkAPI.sendRequest(builderId);
      } catch (err) {
        console.warn('Connect error:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Search & Multi-Criteria Filter Bar ──────────────────── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full border border-primary-500/20">
            Talent & Builder Discovery
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <FiCompass className="text-primary-600" /> Discover Builders by Skill, College & Interests
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Connect with verified peers across leading colleges, open-source maintainers, and specialized domain engineers.
          </p>
        </div>

        {/* Global Search & Role Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="sm:col-span-2 relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, handle, college, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="All">All Disciplines</option>
              <option value="AI/ML">AI & ML Engineers</option>
              <option value="Full-Stack">Full-Stack Developers</option>
              <option value="Systems">Backend & Systems</option>
              <option value="UI/UX">Designers & UI/UX</option>
              <option value="Cloud">Cloud & DevOps</option>
            </select>
          </div>
        </div>

        {/* Filter Chips Strips */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Skills Filter */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Skill:</span>
            {POPULAR_SKILLS.map(skill => (
              <button
                key={skill}
                onClick={() => setSelectedSkill(skill)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSkill === skill
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>

          {/* College Filter */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] shrink-0">College:</span>
            {POPULAR_COLLEGES.map(college => (
              <button
                key={college}
                onClick={() => setSelectedCollege(college)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCollege === college
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {college}
              </button>
            ))}
          </div>

          {/* Interests Filter */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Interest:</span>
            {POPULAR_INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => setSelectedInterest(interest)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedInterest === interest
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Discovered Builders Grid ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Matching Builders ({builders.length})
          </h3>
          {(selectedSkill !== 'All' || selectedCollege !== 'All' || selectedInterest !== 'All' || selectedRole !== 'All' || search) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedRole('All');
                setSelectedSkill('All');
                setSelectedCollege('All');
                setSelectedInterest('All');
              }}
              className="text-xs text-primary-600 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Searching peer builders...
          </div>
        ) : builders.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <p className="font-bold text-sm text-slate-900 dark:text-white">No builders match your search filters</p>
            <p className="text-xs text-slate-500 mt-1">Try broadening your criteria or reset filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {builders.map((builder) => {
              const bId = builder.id || builder._id;
              const isSent = !!sentMap[bId];

              return (
                <div
                  key={bId}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Avatar, Name & Handle */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-xs shrink-0 overflow-hidden">
                        {builder.profileImage ? (
                          <img src={builder.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          builder.name?.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <Link
                            to={`/profile/${builder.username}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 truncate"
                          >
                            {builder.name}
                          </Link>
                          <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5 shrink-0">
                            <FiStar size={11} /> {builder.reputation || 100}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">@{builder.username}</p>
                      </div>
                    </div>

                    {/* Headline */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {builder.headline || builder.primaryRole || 'Software Builder on NEXORA'}
                    </p>

                    {/* College & Department */}
                    {builder.college && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        <FiBookOpen size={12} className="text-indigo-600 shrink-0" />
                        <span className="truncate">{builder.college} {builder.department ? `• ${builder.department}` : ''}</span>
                      </div>
                    )}

                    {/* Skills Pills */}
                    {builder.skills && builder.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {builder.skills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mutual Connections & Connect Action */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setMutualModalUser({ id: bId, name: builder.name, username: builder.username })}
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left"
                    >
                      <strong className="text-primary-600 dark:text-primary-400">{builder.mutualCount || 0}</strong> mutual connections
                    </button>

                    <button
                      onClick={() => handleConnect(builder)}
                      disabled={isSent}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs ${
                        isSent
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                    >
                      {isSent ? <FiCheck size={12} /> : <FiUserPlus size={12} />}
                      {isSent ? 'Sent' : 'Connect'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mutual Connections Inspect Modal */}
      <MutualConnectionsModal
        targetUser={mutualModalUser}
        isOpen={Boolean(mutualModalUser)}
        onClose={() => setMutualModalUser(null)}
      />
    </div>
  );
};

export default Discover;
