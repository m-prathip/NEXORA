import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiCode, FiUsers, FiZap, FiPlus, FiExternalLink, 
  FiGithub, FiStar, FiClock, FiCheck, FiX, FiSend, 
  FiTag, FiSearch, FiFilter, FiCheckCircle, FiXCircle, 
  FiImage, FiLayers, FiAlertCircle, FiFlag, FiCompass, FiCpu
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { collabAPI, aiAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'All',
  'AI & ML',
  'Full-Stack Web',
  'Mobile App',
  'Open Source Tool',
  'Developer Infra',
  'Web3 & Security',
  'Design & UI/UX'
];

const FALLBACK_PROJECTS = [
  {
    _id: 'proj-1',
    title: 'AutonomAI — Distributed Multi-Agent LLM Orchestrator',
    creator: { name: 'Alex Rivera', username: 'alex', avatar: '', reputationPoints: 980, college: 'Stanford University' },
    category: 'AI & ML',
    status: 'open',
    technologies: ['Python', 'PyTorch', 'FastAPI', 'Redis', 'Docker'],
    rolesNeeded: [
      { role: 'Frontend Engineer (React 19 / Canvas)', spots: 1, spotsFilled: 0, skills: ['React 19', 'Canvas', 'TypeScript', 'Tailwind'] },
      { role: 'DevOps / K8s Deployment Specialist', spots: 1, spotsFilled: 0, skills: ['Docker', 'Kubernetes', 'Helm', 'AWS'] }
    ],
    teamMembers: [
      { user: { username: 'alex', name: 'Alex Rivera' }, role: 'Lead / Creator', joinedAt: '2026-10-15' }
    ],
    description: 'A distributed framework processing 50,000+ semantic requests/sec across GPU clusters. Building real-time agent observability graph visuals.',
    githubUrl: 'https://github.com/alex/autonomai',
    liveUrl: 'https://autonomai.dev',
    images: [{ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60', caption: 'Architecture' }]
  },
  {
    _id: 'proj-2',
    title: 'PulseTelemetry — Microservice Anomaly Detector',
    creator: { name: 'Sarah Chen', username: 'sarahc', avatar: '', reputationPoints: 640, college: 'MIT' },
    category: 'Full-Stack Web',
    status: 'open',
    technologies: ['Go', 'Kafka', 'React 19', 'TypeScript', 'PostgreSQL'],
    rolesNeeded: [
      { role: 'UI/UX Designer & Design Systems Lead', spots: 1, spotsFilled: 0, skills: ['Figma', 'Design Systems', 'Micro-interactions'] }
    ],
    teamMembers: [
      { user: { username: 'sarahc', name: 'Sarah Chen' }, role: 'Lead / Creator', joinedAt: '2026-10-20' }
    ],
    description: 'Streaming telemetry monitoring 10,000+ microservices with custom anomaly detection algorithms and WebSocket streaming.',
    githubUrl: 'https://github.com/sarahc/pulsetelemetry',
    liveUrl: 'https://pulsetelemetry.io',
    images: []
  },
  {
    _id: 'proj-3',
    title: 'NexusSynth — Real-Time Generative Voice AI',
    creator: { name: 'Maya Lin', username: 'mayalin', avatar: '', reputationPoints: 720, college: 'UC Berkeley' },
    category: 'Open Source Tool',
    status: 'open',
    technologies: ['C++', 'Python', 'PyTorch', 'ONNX', 'FastAPI'],
    rolesNeeded: [
      { role: 'Audio Signal Processing ML Lead', spots: 1, spotsFilled: 0, skills: ['PyTorch', 'DSP', 'Python', 'C++'] },
      { role: 'Mobile Engineer (React Native)', spots: 2, spotsFilled: 0, skills: ['React Native', 'Mobile Audio'] }
    ],
    teamMembers: [
      { user: { username: 'mayalin', name: 'Maya Lin' }, role: 'Lead / Creator', joinedAt: '2026-10-28' }
    ],
    description: 'Sub-40ms end-to-end voice synthesis on client mobile devices. Seeking ML and mobile collaborators to benchmark across hardware.',
    githubUrl: 'https://github.com/mayalin/nexussynth',
    liveUrl: '',
    images: []
  }
];

const ProjectHub = () => {
  const { user, isAuth } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatus, setActiveStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [mainTab, setMainTab] = useState('explore'); // 'explore' | 'matched' | 'my-applications' | 'my-projects'

  // Application Tracking & Status Map
  const [myApplications, setMyApplications] = useState([]);
  const [matchedProjects, setMatchedProjects] = useState([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [pitch, setPitch] = useState('');
  const [applying, setApplying] = useState(false);

  // Create Project Form
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'Full-Stack Web',
    technologies: '',
    roleTitle: '',
    roleSkills: '',
    roleSpots: 1,
    githubUrl: '',
    liveUrl: '',
    imageUrl: ''
  });
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Report Form
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    loadProjects();
    if (isAuth) {
      loadMyApplications();
      loadTeammateMatches();
    }
  }, [activeCategory, activeStatus, search, isAuth]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await collabAPI.getAll({
        status: activeStatus === 'all' ? undefined : activeStatus,
        category: activeCategory === 'All' ? undefined : activeCategory,
        q: search.trim() || undefined
      });
      if (res.data?.projects && res.data.projects.length > 0) {
        setProjects(res.data.projects);
      } else if (Array.isArray(res.data) && res.data.length > 0) {
        setProjects(res.data);
      } else {
        setProjects(filterFallbackProjects());
      }
    } catch {
      setProjects(filterFallbackProjects());
    } finally {
      setLoading(false);
    }
  };

  const loadMyApplications = async () => {
    try {
      const res = await collabAPI.getMyApplications();
      if (res.data) setMyApplications(res.data);
    } catch {
      // fallback
    }
  };

  const loadTeammateMatches = async () => {
    try {
      const res = await collabAPI.matchTeammates();
      if (res.data?.matches) setMatchedProjects(res.data.matches);
    } catch {
      // fallback
    }
  };

  const filterFallbackProjects = () => {
    let list = [...FALLBACK_PROJECTS];
    if (activeCategory !== 'All') {
      list = list.filter(p => p.category === activeCategory);
    }
    if (activeStatus !== 'all') {
      list = list.filter(p => p.status === activeStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.technologies && p.technologies.some(t => t.toLowerCase().includes(q))) ||
        (p.rolesNeeded && p.rolesNeeded.some(r => r.skills.some(s => s.toLowerCase().includes(q))))
      );
    }
    return list;
  };

  // Open Apply Modal
  const openApply = (proj, roleObj) => {
    setSelectedProject(proj);
    setSelectedRole(roleObj.role);
    setPitch('');
    setShowApplyModal(true);
  };

  // Submit Application
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !selectedRole) return;

    setApplying(true);
    const projId = selectedProject._id || selectedProject.id;

    if (!isAuth) {
      toast.success(`Application submitted for: ${selectedRole}!`);
      setShowApplyModal(false);
      setApplying(false);
      return;
    }

    try {
      await collabAPI.apply(projId, {
        roleAppliedFor: selectedRole,
        pitch
      });

      toast.success(`Application submitted to ${selectedProject.creator?.name || 'Creator'}!`);
      setShowApplyModal(false);
      loadProjects();
      loadMyApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleGenerateAiDescription = async () => {
    if (!createForm.title.trim()) {
      return toast.error('Please enter a project title first');
    }
    setGeneratingDesc(true);
    try {
      const techStack = createForm.technologies 
        ? createForm.technologies.split(',').map(s => s.trim()).filter(Boolean)
        : ['React', 'Node.js'];
      const res = await aiAPI.projectDescription({
        title: createForm.title.trim(),
        techStack,
        highlights: `Built for ${createForm.category}`,
        problemSolved: createForm.category
      });
      if (res.data?.description) {
        setCreateForm(prev => ({ ...prev, description: res.data.description }));
        toast.success('Gemini generated architectural project description!');
      }
    } catch {
      const techStr = createForm.technologies || 'Full-Stack';
      const desc = `### 1. Overview & Problem\n${createForm.title} addresses key scalability challenges in ${createForm.category}, using ${techStr} for modular execution.\n\n### 2. Architecture & Design\nFeatures a decoupled architecture with strict validation and deterministic state handling.\n\n### 3. Performance & Impact\nOptimized for sub-100ms response latencies with comprehensive test coverage.`;
      setCreateForm(prev => ({ ...prev, description: desc }));
      toast.success('Generated project description!');
    } finally {
      setGeneratingDesc(false);
    }
  };

  // Publish New Project Idea
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) {
      return toast.error('Please fill in project title and description');
    }

    setCreating(true);

    const rolesNeeded = [{
      role: createForm.roleTitle.trim() || 'Software Engineer',
      skills: createForm.roleSkills ? createForm.roleSkills.split(',').map(s => s.trim()).filter(Boolean) : ['React', 'Node.js'],
      spots: Math.max(1, parseInt(createForm.roleSpots, 10) || 1),
      spotsFilled: 0
    }];

    const technologies = createForm.technologies 
      ? createForm.technologies.split(',').map(s => s.trim()).filter(Boolean) 
      : ['TypeScript', 'Full-Stack'];

    if (!isAuth) {
      const mockProject = {
        _id: `proj-${Date.now()}`,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        technologies,
        creator: { name: user?.name || 'You', username: user?.username || 'you', reputationPoints: 100 },
        rolesNeeded,
        status: 'open',
        teamMembers: [{ user: { name: user?.name || 'You', username: user?.username || 'you' }, role: 'Lead / Creator' }],
        githubUrl: createForm.githubUrl,
        liveUrl: createForm.liveUrl,
        images: createForm.imageUrl ? [{ url: createForm.imageUrl, caption: 'Preview' }] : []
      };
      setProjects([mockProject, ...projects]);
      setShowCreateModal(false);
      setCreating(false);
      toast.success('Project published! (+15 reputation points)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', createForm.title.trim());
      formData.append('description', createForm.description.trim());
      formData.append('category', createForm.category);
      formData.append('technologies', JSON.stringify(technologies));
      formData.append('rolesNeeded', JSON.stringify(rolesNeeded));
      if (createForm.githubUrl) formData.append('githubUrl', createForm.githubUrl.trim());
      if (createForm.liveUrl) formData.append('liveUrl', createForm.liveUrl.trim());
      if (selectedImageFile) formData.append('images', selectedImageFile);

      const res = await collabAPI.create(formData);
      setProjects([res.data, ...projects]);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        category: 'Full-Stack Web',
        technologies: '',
        roleTitle: '',
        roleSkills: '',
        roleSpots: 1,
        githubUrl: '',
        liveUrl: '',
        imageUrl: ''
      });
      setSelectedImageFile(null);
      toast.success('Project published! (+15 reputation points)');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish project');
    } finally {
      setCreating(false);
    }
  };

  // Manage Applicants (Creator Accept / Reject)
  const openManageApplicants = (proj) => {
    setSelectedProject(proj);
    setShowManageModal(true);
  };

  const handleApplicantResponse = async (appId, action) => {
    const projId = selectedProject._id || selectedProject.id;
    try {
      if (isAuth) {
        await collabAPI.respond(projId, appId, action);
      }

      // Update local modal view
      setSelectedProject(prev => ({
        ...prev,
        applications: prev.applications?.map(a => a._id === appId ? { ...a, status: action === 'accept' ? 'accepted' : 'rejected' } : a)
      }));

      toast.success(`Application ${action}ed!`);
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} application`);
    }
  };

  // Submit Content Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    const projId = selectedProject._id || selectedProject.id;

    try {
      if (isAuth) {
        await collabAPI.report(projId, {
          reason: reportReason,
          details: reportDetails
        });
      }
      toast.success('Report submitted to trust & safety team.');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Display List Determination
  let displayedList = projects;
  if (mainTab === 'matched') {
    displayedList = matchedProjects.length > 0 ? matchedProjects : projects;
  }

  const myCreatedProjects = projects.filter(p => 
    p.creator?._id === user?._id || p.creator?.username === user?.username
  );

  return (
    <div className="space-y-6">
      {/* ─── Hero Header & Action Banner ──────────────────────────── */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Find My Teammate & Project Showcase
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <FiZap className="text-amber-500" /> Project Ideas & Team Collaboration
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Publish technical project ideas, match with teammates possessing complementary skills, track applications, and build in public.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-2 self-start sm:self-auto shadow-xs transition-all shrink-0"
        >
          <FiPlus size={15} /> Publish Project Idea
        </button>
      </div>

      {/* ─── Main Navigation Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar text-xs font-bold">
        <button
          onClick={() => setMainTab('explore')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            mainTab === 'explore'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiCompass size={14} /> Explore Projects ({projects.length})
        </button>

        <button
          onClick={() => setMainTab('matched')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            mainTab === 'matched'
              ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FiZap size={14} className="text-amber-500" /> Matching My Skills ({matchedProjects.length || 3})
        </button>

        {isAuth && (
          <>
            <button
              onClick={() => setMainTab('my-applications')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                mainTab === 'my-applications'
                  ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FiClock size={14} /> My Applications ({myApplications.length})
            </button>

            <button
              onClick={() => setMainTab('my-projects')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                mainTab === 'my-projects'
                  ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FiLayers size={14} /> My Published Projects ({myCreatedProjects.length})
            </button>
          </>
        )}
      </div>

      {/* ─── Search & Category Filters (When in Explore / Matched) ─── */}
      {(mainTab === 'explore' || mainTab === 'matched') && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects by title, technology, or required skill..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="open">Seeking Teammates (Open)</option>
                <option value="in_progress">In Progress</option>
                <option value="all">All Project Statuses</option>
              </select>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {CATEGORIES.map(cat => (
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
      )}

      {/* ─── TAB 1 & 2: PROJECT CARDS GRID (EXPLORE / MATCHED) ────── */}
      {(mainTab === 'explore' || mainTab === 'matched') && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4">
                  <div className="w-48 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="w-full h-16 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : displayedList.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <FiCode size={36} className="mx-auto text-slate-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">No projects found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Be the first to publish a collaboration call and recruit peer engineers!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700"
              >
                Publish Project Idea
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayedList.map(proj => {
                const projId = proj._id || proj.id;
                const isCreator = user && (proj.creator?._id === user._id || proj.creator?.username === user.username);
                const hasApplied = proj.myApplication || myApplications.some(a => a.projectId === projId);

                return (
                  <div
                    key={projId}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-4">
                      {/* Top Header: Creator & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs">
                            {proj.creator?.name ? proj.creator.name.slice(0, 2).toUpperCase() : 'LD'}
                          </div>
                          <div>
                            <Link 
                              to={`/profile/${proj.creator?.username}`}
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-primary-600 transition-colors"
                            >
                              {proj.creator?.name || proj.creator?.username}
                            </Link>
                            <p className="text-[11px] text-slate-400 truncate">
                              {proj.creator?.college ? `${proj.creator.college} • ` : ''}Lead Creator
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            proj.status === 'open' 
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {proj.status === 'open' ? 'SEEKING TEAM' : 'IN PROGRESS'}
                          </span>
                          <button
                            onClick={() => { setSelectedProject(proj); setShowReportModal(true); }}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            title="Report Project"
                          >
                            <FiFlag size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Project Image Banner if available */}
                      {proj.images && proj.images.length > 0 && (
                        <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img 
                            src={proj.images[0].url} 
                            alt={proj.title} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}

                      {/* Title & Description */}
                      <div>
                        <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                          {proj.category}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                          {proj.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                          {proj.description}
                        </p>
                      </div>

                      {/* Technologies Stack */}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Technologies
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {proj.technologies.map(tech => (
                              <span
                                key={tech}
                                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Open Roles & Required Skills */}
                      {proj.rolesNeeded && proj.rolesNeeded.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Roles Needed & Skills
                          </span>
                          <div className="space-y-2">
                            {proj.rolesNeeded.map((roleObj, rIdx) => {
                              const isFilled = (roleObj.spotsFilled || 0) >= (roleObj.spots || 1);
                              return (
                                <div 
                                  key={rIdx}
                                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-900 dark:text-white">{roleObj.role}</span>
                                      <span className="text-[10px] text-slate-400">
                                        ({roleObj.spotsFilled || 0}/{roleObj.spots || 1} filled)
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {roleObj.skills && roleObj.skills.map(s => (
                                        <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {!isCreator && !isFilled && (
                                    <button
                                      onClick={() => openApply(proj, roleObj)}
                                      disabled={hasApplied}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                                        hasApplied
                                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                                      }`}
                                    >
                                      {hasApplied ? 'Applied' : 'Apply'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Team Members Display */}
                      {proj.teamMembers && proj.teamMembers.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-slate-400">Team Members:</span>
                          <div className="flex items-center gap-1.5">
                            {proj.teamMembers.map((tm, tmIdx) => (
                              <span 
                                key={tmIdx}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title={tm.role}
                              >
                                {tm.user?.name || tm.user?.username || 'Builder'} ({tm.role})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Links & Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        {proj.githubUrl && (
                          <a 
                            href={proj.githubUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-semibold"
                          >
                            <FiGithub size={13} /> Code
                          </a>
                        )}
                        {proj.liveUrl && (
                          <a 
                            href={proj.liveUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <FiExternalLink size={13} /> Demo
                          </a>
                        )}
                      </div>

                      {isCreator ? (
                        <button
                          onClick={() => openManageApplicants(proj)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                        >
                          <FiUsers size={13} /> Manage Applicants ({proj.applicationsCount || proj.applications?.length || 0})
                        </button>
                      ) : (
                        <button
                          onClick={() => openApply(proj, proj.rolesNeeded?.[0] || { role: 'Collaborator' })}
                          disabled={hasApplied}
                          className={`px-4 py-1.5 rounded-xl font-bold transition-all shadow-xs ${
                            hasApplied
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-not-allowed'
                              : 'bg-primary-600 hover:bg-primary-700 text-white'
                          }`}
                        >
                          {hasApplied ? 'Application Active' : 'Request Collaboration'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 3: MY APPLICATIONS TRACKING ──────────────────────── */}
      {mainTab === 'my-applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              My Submitted Teammate Applications ({myApplications.length})
            </h3>
            <span className="text-slate-400">Track acceptance decisions and project status in real-time</span>
          </div>

          {myApplications.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <FiClock size={28} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No applications submitted yet</p>
              <p className="text-xs text-slate-500">Browse open projects on the explore tab to join technical teams!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map(app => {
                const status = app.myApplication?.status || 'pending';
                return (
                  <div
                    key={app.myApplication?.id || app.projectId}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{app.projectTitle}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {app.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Applied Role: <strong className="text-slate-800 dark:text-slate-200">{app.myApplication?.roleAppliedFor}</strong> • Creator: @{app.creator?.username}
                      </p>
                      {app.myApplication?.pitch && (
                        <p className="text-xs italic text-slate-600 dark:text-slate-400 pt-1">
                          "{app.myApplication.pitch}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                        status === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : status === 'rejected'
                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {status === 'accepted' ? <FiCheckCircle /> : status === 'rejected' ? <FiXCircle /> : <FiClock />}
                        {status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: MY PUBLISHED PROJECTS & APPLICANT INBOX ───────── */}
      {mainTab === 'my-projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Projects You Created ({myCreatedProjects.length})
            </h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-primary-600 font-bold hover:underline"
            >
              + Create Another Project
            </button>
          </div>

          {myCreatedProjects.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <FiLayers size={28} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">You have not published any projects yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 mt-2"
              >
                Publish Project Call
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myCreatedProjects.map(proj => (
                <div
                  key={proj._id || proj.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{proj.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Status: <strong className="text-emerald-600 uppercase">{proj.status}</strong> • Team Size: {proj.teamMembers?.length || 1}
                    </p>
                  </div>

                  <button
                    onClick={() => openManageApplicants(proj)}
                    className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-bold transition-all flex items-center gap-2 shrink-0"
                  >
                    <FiUsers size={14} /> Review Applications ({proj.applicationsCount || proj.applications?.length || 0})
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: Apply to Collaborate ──────────────────────────── */}
      {showApplyModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Apply to Collaborate</h3>
                <p className="text-xs text-slate-400">{selectedProject.title}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Applying For Role</label>
                <input
                  type="text"
                  readOnly
                  value={selectedRole}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Your Pitch / Relevant Experience *</label>
                <textarea
                  rows={4}
                  required
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Explain why you are excited to build this, your technical expertise, and how you will contribute..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying || !pitch.trim()}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <FiSend size={13} /> {applying ? 'Submitting...' : 'Send Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Publish Project Idea ──────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Publish Project & Collaboration Call</h3>
                <p className="text-xs text-slate-400">Recruit builders with complementary skills to build your idea</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Distributed Multi-Agent LLM Orchestrator"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Domain Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Technologies (comma separated)</label>
                  <input
                    type="text"
                    value={createForm.technologies}
                    onChange={(e) => setCreateForm({ ...createForm, technologies: e.target.value })}
                    placeholder="Python, PyTorch, Docker, React 19"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Project Description *</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={generatingDesc}
                    className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <FiCpu size={12} /> {generatingDesc ? 'Generating...' : '✨ AI Generate Description'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe the architectural problem solved, key features, and development plan..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              {/* Roles Needed Definition */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Teammate Role Needed</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Role Title</label>
                    <input
                      type="text"
                      value={createForm.roleTitle}
                      onChange={(e) => setCreateForm({ ...createForm, roleTitle: e.target.value })}
                      placeholder="e.g. Frontend Engineer (React 19)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Required Skills</label>
                    <input
                      type="text"
                      value={createForm.roleSkills}
                      onChange={(e) => setCreateForm({ ...createForm, roleSkills: e.target.value })}
                      placeholder="React 19, TypeScript, Tailwind"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Links & Image Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GitHub Repo Link</label>
                  <input
                    type="url"
                    value={createForm.githubUrl}
                    onChange={(e) => setCreateForm({ ...createForm, githubUrl: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Live Demo Link</label>
                  <input
                    type="url"
                    value={createForm.liveUrl}
                    onChange={(e) => setCreateForm({ ...createForm, liveUrl: e.target.value })}
                    placeholder="https://myproject.dev"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Screenshot / Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {creating ? 'Publishing...' : 'Publish Project Idea (+15 Pts)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Manage Project Applicants (Creator Only) ──────── */}
      {showManageModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Applicant Review & Team Roster</h3>
                <p className="text-xs text-slate-400">{selectedProject.title}</p>
              </div>
              <button onClick={() => setShowManageModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {(!selectedProject.applications || selectedProject.applications.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No applicants for this project yet. Share your project link on the feed!
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedProject.applications.map(app => (
                    <div
                      key={app._id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {app.applicant?.name || app.applicant?.username || 'Builder'}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">@{app.applicant?.username}</span>
                          <p className="text-xs text-primary-600 font-semibold mt-0.5">
                            Applied For: {app.roleAppliedFor}
                          </p>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          app.status === 'accepted' 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                            : app.status === 'rejected'
                              ? 'bg-red-500/10 text-red-600 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>

                      {app.pitch && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                          "{app.pitch}"
                        </p>
                      )}

                      {app.status === 'pending' && (
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleApplicantResponse(app._id, 'reject')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApplicantResponse(app._id, 'accept')}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-xs"
                          >
                            Accept into Team
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Report Content ────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-red-600 flex items-center gap-2">
                <FiAlertCircle /> Report Project
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Report</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="spam">Spam or fake project</option>
                  <option value="harassment">Harassment or abusive language</option>
                  <option value="inappropriate_content">Inappropriate content</option>
                  <option value="misleading">Misleading or fraudulent repository</option>
                  <option value="copyright">Copyright or IP violation</option>
                  <option value="other">Other violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Details (Optional)</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Explain why this project violates NEXORA community guidelines..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectHub;
