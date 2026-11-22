import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiFolder, FiExternalLink, FiGithub, FiStar, FiThumbsUp, 
  FiFilter, FiSearch, FiCode, FiAward, FiPlus 
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SHOWCASE_PROJECTS = [
  {
    id: 'sp-1',
    title: 'AutonomAI — Distributed Multi-Agent LLM Orchestrator',
    author: { name: 'Alex Rivera', username: 'alex', avatar: 'AR', reputation: 980 },
    category: 'AI & ML',
    description: 'A distributed cognitive agent engine executing multi-step reasoning over heterogeneous microservices. Benchmarked sub-100ms inference on 8x GPU clusters.',
    techStack: ['Python', 'PyTorch', 'FastAPI', 'Redis', 'Docker'],
    starsCount: 384,
    upvotesCount: 215,
    githubUrl: 'https://github.com',
    liveUrl: 'https://autonomai.dev',
    verifiedCode: true
  },
  {
    id: 'sp-2',
    title: 'HyperPulse Design System',
    author: { name: 'Amara Okafor', username: 'amara_o', avatar: 'AO', reputation: 920 },
    category: 'Frontend & UI',
    description: 'Ultra-fast, accessible design tokens and reactive component framework powering modern developer platforms with 60fps micro-interactions.',
    techStack: ['React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
    starsCount: 512,
    upvotesCount: 320,
    githubUrl: 'https://github.com',
    liveUrl: 'https://hyperpulse.dev',
    verifiedCode: true
  },
  {
    id: 'sp-3',
    title: 'PulseTelemetry — Microservice Anomaly Detector',
    author: { name: 'Sarah Chen', username: 'sarahc', avatar: 'SC', reputation: 640 },
    category: 'Backend & Cloud',
    description: 'Streaming telemetry monitoring 10,000+ microservices with custom anomaly detection algorithms and WebSocket real-time graphs.',
    techStack: ['Go', 'Kafka', 'React', 'PostgreSQL', 'Docker'],
    starsCount: 198,
    upvotesCount: 142,
    githubUrl: 'https://github.com',
    liveUrl: 'https://pulsetelemetry.io',
    verifiedCode: true
  },
  {
    id: 'sp-4',
    title: 'NexusSynth — Real-Time Generative Voice AI',
    author: { name: 'Maya Lin', username: 'mayalin', avatar: 'ML', reputation: 720 },
    category: 'AI & ML',
    description: 'Sub-40ms end-to-end voice synthesis on mobile client hardware using ONNX runtime and quantized neural vocoders.',
    techStack: ['C++', 'Python', 'PyTorch', 'ONNX', 'React Native'],
    starsCount: 275,
    upvotesCount: 168,
    githubUrl: 'https://github.com',
    liveUrl: '',
    verifiedCode: true
  }
];

const ProjectShowcase = () => {
  const [projects, setProjects] = useState(SHOWCASE_PROJECTS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [upvotedMap, setUpvotedMap] = useState({});

  const handleUpvote = (id) => {
    const isUpvoted = !!upvotedMap[id];
    setUpvotedMap(prev => ({ ...prev, [id]: !isUpvoted }));
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          upvotesCount: isUpvoted ? p.upvotesCount - 1 : p.upvotesCount + 1
        };
      }
      return p;
    }));
    toast.success(isUpvoted ? 'Upvote removed' : 'Project upvoted! (+2 reputation)');
  };

  const filtered = projects.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                        p.description.toLowerCase().includes(search.toLowerCase()) ||
                        p.techStack.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FiFolder className="text-primary-600" /> Project Showcase & Skill Proof
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover verified open-source repositories and production builds created by the NEXORA builder community.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/collaborations"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-colors"
          >
            Find My Teammate
          </Link>
          <Link
            to="/collaborations"
            className="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <FiPlus size={15} /> Publish Project
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by keyword, technology, or title..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {['All', 'AI & ML', 'Frontend & UI', 'Backend & Cloud'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(proj => {
          const isUpvoted = !!upvotedMap[proj.id];

          return (
            <div
              key={proj.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                      {proj.category}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                      {proj.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>Built by <Link to={`/profile/${proj.author.username}`} className="text-primary-600 font-semibold hover:underline">{proj.author.name}</Link></span>
                      <span>•</span>
                      <span className="text-emerald-500 font-semibold flex items-center gap-1">
                        <FiAward size={12} /> Verified Skill Proof
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpvote(proj.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                      isUpvoted
                        ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FiThumbsUp size={13} className={isUpvoted ? 'fill-current' : ''} />
                    <span>{proj.upvotesCount}</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {proj.description}
                </p>

                {/* Tech stack pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proj.techStack.map(t => (
                    <span
                      key={t}
                      className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <FiStar size={13} className="text-amber-500" /> {proj.starsCount} GitHub Stars
                </span>

                <div className="flex items-center gap-2">
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      title="GitHub Repository"
                    >
                      <FiGithub size={14} />
                    </a>
                  )}
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs flex items-center gap-1"
                    >
                      Live Demo <FiExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectShowcase;
