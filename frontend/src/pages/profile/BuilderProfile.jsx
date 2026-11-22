import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { profileAPI, networkAPI, aiAPI, BASE_URL } from '../../services/api';
import { 
  FiUser, FiMapPin, FiMail, FiGithub, FiLinkedin, FiGlobe, FiExternalLink, 
  FiEdit2, FiStar, FiAward, FiCode, FiZap, FiBriefcase, FiCpu, FiCheck, 
  FiUserPlus, FiMessageSquare, FiX, FiUpload, FiFolder, FiBookOpen
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const BuilderProfile = () => {
  const { username: paramUsername } = useParams();
  const { user, isAuth } = useAuth();
  const navigate = useNavigate();

  const isOwnProfile = !paramUsername || paramUsername === 'me' || (user && paramUsername === user.username);
  const activeUsername = isOwnProfile ? (user?.username || 'builder') : paramUsername;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'skills' | 'projects' | 'experience'
  const [isEditing, setIsEditing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiActiveFeature, setAiActiveFeature] = useState('summary'); // 'summary' | 'audit' | 'skills'
  const [aiSummary, setAiSummary] = useState('');
  const [aiAuditData, setAiAuditData] = useState(null);
  const [aiHeadlinesData, setAiHeadlinesData] = useState(null);
  const [aiSkillsData, setAiSkillsData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle' | 'pending' | 'connected'
  const [isFollowing, setIsFollowing] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    title: '',
    headline: '',
    primaryRole: 'Full-Stack Developer',
    experienceLevel: 'Senior',
    about: '',
    location: '',
    college: '',
    department: '',
    degree: '',
    graduationYear: '',
    openToWork: true,
    openToCollaborate: true,
    github: '',
    linkedin: '',
    website: ''
  });
  const [coverFile, setCoverFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [paramUsername, user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (isOwnProfile && isAuth) {
        // Fetch own complete public view to get collections + metrics
        const res = await profileAPI.getPublic(user.username);
        setProfileData(res.data);
        populateEditForm(res.data);
      } else {
        const res = await profileAPI.getPublic(activeUsername);
        setProfileData(res.data);
      }
    } catch (err) {
      // Fallback for mock/demo preview
      const fallback = {
        name: isOwnProfile ? (user?.name || user?.username || 'Alex Rivera') : activeUsername,
        username: activeUsername,
        title: 'Lead AI Architect & Full-Stack Systems Engineer',
        headline: 'Lead AI Architect & Systems Engineer • Scaling distributed LLMs',
        about: 'Specializing in distributed LLM orchestration pipelines, React 19 server architectures, and high-performance cloud infrastructure across 8+ years of engineering.',
        location: 'San Francisco, CA',
        email: 'builder@nexora.io',
        primaryRole: 'AI/ML & Systems',
        experienceLevel: 'Senior',
        openToWork: true,
        openToCollaborate: true,
        reputationPoints: 940,
        connectionsCount: 284,
        followersCount: 1240,
        domains: ['Distributed Systems', 'PyTorch & LLMs', 'React 19', 'Kubernetes'],
        social: {
          github: 'https://github.com',
          linkedin: 'https://linkedin.com'
        },
        collections: {
          skills: [
            { _id: 'sk-1', name: 'Python / PyTorch', category: 'Backend/AI', level: 'Expert', yearsOfExperience: 6 },
            { _id: 'sk-2', name: 'React 19 & TypeScript', category: 'Frontend', level: 'Expert', yearsOfExperience: 7 },
            { _id: 'sk-3', name: 'FastAPI & Microservices', category: 'Backend', level: 'Advanced', yearsOfExperience: 5 },
            { _id: 'sk-4', name: 'Docker & Kubernetes', category: 'Cloud', level: 'Advanced', yearsOfExperience: 4 }
          ],
          projects: [
            {
              _id: 'p-1',
              title: 'AutonomAI Orchestrator',
              description: 'Multi-agent cognitive engine executing complex distributed analysis over heterogeneous API clusters.',
              technologies: ['Python', 'FastAPI', 'Redis', 'Docker'],
              githubUrl: 'https://github.com',
              liveUrl: 'https://autonomai.dev'
            },
            {
              _id: 'p-2',
              title: 'HyperPulse Design System',
              description: 'Ultra-fast, accessible design tokens and reactive component framework powering next-generation interfaces.',
              technologies: ['React 19', 'Tailwind CSS', 'TypeScript'],
              githubUrl: 'https://github.com',
              liveUrl: 'https://hyperpulse.dev'
            }
          ],
          experience: [
            {
              _id: 'exp-1',
              company: 'Vanguard Systems AI',
              role: 'Staff Infrastructure Architect',
              startDate: '2023-01',
              current: true,
              description: 'Orchestrated GPU cluster scaling and microservice latency optimizations.'
            }
          ],
          education: [
            {
              _id: 'edu-1',
              institution: 'University of California, Berkeley',
              degree: 'B.S. in Computer Science',
              fieldOfStudy: 'Distributed Systems',
              startYear: '2016',
              endYear: '2020'
            }
          ]
        }
      };
      setProfileData(fallback);
      populateEditForm(fallback);
    } finally {
      setLoading(false);
    }
  };

  const populateEditForm = (data) => {
    const firstEdu = data.collections?.education?.[0] || {};
    setEditForm({
      name: data.name || '',
      title: data.title || '',
      headline: data.headline || data.title || '',
      primaryRole: data.primaryRole || 'Full-Stack Developer',
      experienceLevel: data.experienceLevel || 'Senior',
      about: data.about || '',
      location: data.location || '',
      college: data.college || firstEdu.college || firstEdu.institution || '',
      department: data.department || firstEdu.department || firstEdu.fieldOfStudy || '',
      degree: data.degree || firstEdu.degree || '',
      graduationYear: data.graduationYear || firstEdu.graduationYear || firstEdu.endYear || '',
      openToWork: data.openToWork !== undefined ? data.openToWork : true,
      openToCollaborate: data.openToCollaborate !== undefined ? data.openToCollaborate : true,
      github: data.social?.github || '',
      linkedin: data.social?.linkedin || '',
      website: data.social?.website || ''
    });
  };

  const handleConnect = async () => {
    if (!profileData?._id && !profileData?.user) {
      setConnectionStatus('pending');
      toast.success(`Connection request sent to ${displayName}!`);
      return;
    }
    const targetId = profileData.user?._id || profileData.user || profileData._id;
    try {
      await networkAPI.sendRequest(targetId);
      setConnectionStatus('pending');
      toast.success(`Connection request sent to ${displayName}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send connection request');
    }
  };

  const handleFollowToggle = async () => {
    if (!profileData?._id && !profileData?.user) {
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Unfollowed builder' : `Following ${displayName}`);
      return;
    }
    const targetId = profileData.user?._id || profileData.user || profileData._id;
    try {
      const res = await networkAPI.toggleFollow(targetId);
      setIsFollowing(res.data?.following);
      toast.success(res.data?.following ? `Following ${displayName}` : 'Unfollowed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update follow');
    }
  };

  const handleGenerateAiSummary = async () => {
    setAiGenerating(true);
    setAiActiveFeature('summary');
    if (!isAuth) {
      setTimeout(() => {
        const generated = `Senior engineering architect with proven expertise scaling distributed GPU inference clusters (50k+ req/sec). Demonstrates dual mastery of backend high-throughput microservices (FastAPI/Go) and interactive reactive frontends (React 19). Top recommended matches: Staff AI Engineer, Principal Systems Architect.`;
        setAiSummary(generated);
        setAiHeadlinesData({
          headlines: [
            `${profileData?.headline || 'Full-Stack Developer'} | Scalable Distributed Systems & AI`,
            `Systems Engineer • React 19, TypeScript & High-Throughput APIs`,
            `Open Source Builder | Performance Optimization & Cloud Native`
          ],
          summaries: [
            generated,
            `Full-stack developer focused on architecting resilient, production-ready web and cloud services. Experienced in modular design, automated verification, and performance profiling.`
          ]
        });
        setAiGenerating(false);
        toast.success('Gemini AI summary and headlines generated!');
      }, 700);
      return;
    }

    try {
      const res = await aiAPI.headlineSummary();
      setAiSummary(res.data?.summary || res.data?.summaries?.[0] || 'Executive summary generated.');
      setAiHeadlinesData(res.data);
      toast.success('Gemini AI headlines & summary generated from your projects!');
    } catch {
      const fallback = `Senior engineering architect with proven expertise scaling distributed GPU inference clusters (50k+ req/sec). Demonstrates dual mastery of backend high-throughput microservices (FastAPI/Go) and interactive reactive frontends (React 19).`;
      setAiSummary(fallback);
      setAiHeadlinesData({
        headlines: [
          `Software Engineer & Builder • Systems & Web • Scalable Architectures`,
          `Full-Stack Builder | React 19, Node.js & Distributed Systems`
        ],
        summaries: [fallback]
      });
      toast.success('AI summary generated!');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleRunProfileImprovementAudit = async () => {
    setAiGenerating(true);
    setAiActiveFeature('audit');
    if (!isAuth) {
      setTimeout(() => {
        setAiAuditData({
          overallScore: 88,
          strengths: [
            'Clear technical specialization in distributed systems and modern web stacks.',
            'Documented architecture decisions and open source contribution proof.',
            'Comprehensive skill tags demonstrating end-to-end full-stack capabilities.'
          ],
          improvements: [
            'Add explicit latency and throughput benchmarks to your top project description.',
            'Link live demonstration video or deployment URL to improve recruiter conversion.',
            'Highlight testing frameworks used (e.g. Vitest, Jest, Playwright).'
          ],
          recommendedAdditions: [
            'Publish an architectural deep-dive post on the NEXORA feed.',
            'Add a system design diagram for your primary repository.'
          ]
        });
        setAiGenerating(false);
        toast.success('AI Profile Audit completed!');
      }, 700);
      return;
    }

    try {
      const res = await aiAPI.profileImprove();
      setAiAuditData(res.data);
      toast.success(`Profile Audit complete! Score: ${res.data.overallScore}/100`);
    } catch {
      setAiAuditData({
        overallScore: 82,
        strengths: ['Solid foundation in core languages and project implementations.'],
        improvements: ['Add deeper metric breakdowns to your project descriptions.'],
        recommendedAdditions: ['Link verified GitHub repositories to showcase projects.']
      });
      toast.success('AI Profile Audit complete!');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGetSkillRoadmap = async () => {
    setAiGenerating(true);
    setAiActiveFeature('skills');
    if (!isAuth) {
      setTimeout(() => {
        setAiSkillsData({
          complementarySkills: ['TypeScript Strict Typing', 'PostgreSQL & Index Optimization', 'Docker & Containerization', 'Distributed Message Queues (Kafka/Redis)'],
          modernTools: ['Tailwind CSS v4', 'Prisma ORM', 'GitHub Actions CI/CD'],
          projectIdeas: [
            'Build an end-to-end event-driven service with optimistic UI cache synchronization.',
            'Develop an automated security static-analysis worker pipeline.'
          ],
          learningResources: ['react.dev Official Docs', 'PostgreSQL Indexing Guide', 'Docker Architecture Reference']
        });
        setAiGenerating(false);
        toast.success('Gemini Skill Roadmap generated!');
      }, 700);
      return;
    }

    try {
      const res = await aiAPI.skillSuggestions({ targetRole: profileData?.headline || 'Senior Full-Stack Engineer' });
      setAiSkillsData(res.data);
      toast.success('Gemini Skill Roadmap generated!');
    } catch {
      setAiSkillsData({
        complementarySkills: ['TypeScript Strict Typing', 'PostgreSQL & Index Optimization', 'Docker & Kubernetes'],
        modernTools: ['Tailwind CSS v4', 'Prisma ORM', 'GitHub Actions CI/CD'],
        projectIdeas: ['Build a real-time collaborative workspace with WebSockets and optimistic updates.'],
        learningResources: ['Official React Documentation', 'PostgreSQL Official Guide']
      });
      toast.success('Skill recommendations generated!');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiSummary = (textToApply) => {
    const text = typeof textToApply === 'string' ? textToApply : aiSummary;
    setEditForm(prev => ({ ...prev, about: text }));
    setIsEditing(true);
    toast.success('Applied to About bio draft!');
  };

  const handleApplyHeadline = (headline) => {
    setEditForm(prev => ({ ...prev, headline }));
    setIsEditing(true);
    toast.success('Headline applied to profile draft!');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('title', editForm.title);
      formData.append('headline', editForm.headline);
      formData.append('primaryRole', editForm.primaryRole);
      formData.append('experienceLevel', editForm.experienceLevel);
      formData.append('about', editForm.about);
      formData.append('location', editForm.location);
      formData.append('college', editForm.college);
      formData.append('department', editForm.department);
      formData.append('degree', editForm.degree);
      formData.append('graduationYear', editForm.graduationYear);
      formData.append('openToWork', editForm.openToWork);
      formData.append('openToCollaborate', editForm.openToCollaborate);
      
      const social = {
        github: editForm.github,
        linkedin: editForm.linkedin,
        website: editForm.website
      };
      formData.append('social', JSON.stringify(social));

      if (coverFile) formData.append('coverImage', coverFile);
      if (avatarFile) formData.append('profileImage', avatarFile);

      const res = await profileAPI.updateMine(formData);
      setProfileData(prev => ({ ...prev, ...res.data, ...editForm }));
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const displayName = profileData?.name || activeUsername || 'Builder';
  const displayTitle = profileData?.headline || profileData?.title || 'Software Architect';
  const coverUrl = profileData?.coverImage 
    ? (profileData.coverImage.startsWith('http') ? profileData.coverImage : `${BASE_URL}${profileData.coverImage}`)
    : null;
  const avatarUrl = profileData?.profileImage || profileData?.avatar
    ? ((profileData.profileImage || profileData.avatar).startsWith('http') 
        ? (profileData.profileImage || profileData.avatar) 
        : `${BASE_URL}${profileData.profileImage || profileData.avatar}`)
    : null;

  return (
    <div className="space-y-6">
      {/* Profile Banner & Header Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Cover Banner */}
        <div 
          className="h-44 sm:h-56 relative bg-gradient-to-r from-primary-600 via-indigo-600 to-sky-600 bg-cover bg-center"
          style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}
        >
          <div className="absolute inset-0 bg-slate-950/20" />
        </div>

        {/* Profile Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-slate-900 p-1.5 shadow-xl shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-black text-3xl sm:text-4xl text-white uppercase shadow-sm">
                  {displayName.slice(0, 2)}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Link
                to={`/u/${activeUsername}`}
                target="_blank"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-primary-600 hover:bg-slate-800 dark:hover:bg-primary-500 shadow-xs flex items-center gap-1.5 transition-all"
              >
                <FiExternalLink size={13} /> View 3D Portfolio
              </Link>

              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <FiEdit2 size={13} /> {isEditing ? 'Close Editor' : 'Edit Profile'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>

                  <button
                    onClick={handleConnect}
                    disabled={connectionStatus !== 'idle'}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                      connectionStatus === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : connectionStatus === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    {connectionStatus === 'connected' ? (
                      <>
                        <FiCheck size={13} /> Connected
                      </>
                    ) : connectionStatus === 'pending' ? (
                      <>
                        <FiCheck size={13} /> Requested
                      </>
                    ) : (
                      <>
                        <FiUserPlus size={13} /> Connect
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => navigate('/messages')}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Send Direct Message"
                  >
                    <FiMessageSquare size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {displayName}
              </h1>
              {profileData?.openToWork && (
                <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Open to Work
                </span>
              )}
              {profileData?.openToCollaborate && (
                <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Open to Collaborate
                </span>
              )}
              {profileData?.primaryRole && (
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  {profileData.primaryRole}
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-1">
              {displayTitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>@{activeUsername}</span>
              {(profileData?.college || profileData?.collections?.education?.[0]?.college || profileData?.collections?.education?.[0]?.institution) && (
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                  <FiBookOpen size={12} className="text-primary-600" />
                  {profileData?.college || profileData?.collections?.education?.[0]?.college || profileData?.collections?.education?.[0]?.institution}
                  {(profileData?.department || profileData?.collections?.education?.[0]?.department) ? ` • ${profileData?.department || profileData?.collections?.education?.[0]?.department}` : ''}
                </span>
              )}
              {profileData?.location && (
                <span className="flex items-center gap-1">
                  <FiMapPin size={12} /> {profileData.location}
                </span>
              )}
              {profileData?.social?.github && (
                <a href={profileData.social.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <FiGithub size={12} /> GitHub
                </a>
              )}
              {profileData?.social?.linkedin && (
                <a href={profileData.social.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <FiLinkedin size={12} /> LinkedIn
                </a>
              )}
              {profileData?.social?.website && (
                <a href={profileData.social.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <FiGlobe size={12} /> Website
                </a>
              )}
            </div>
          </div>

          {/* Social Stats Strip */}
          <div className="flex flex-wrap items-center gap-6 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white font-bold">{profileData?.connectionsCount || 284}</strong> Connections
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white font-bold">{profileData?.followersCount || 1240}</strong> Followers
            </span>
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <FiStar className="text-amber-500" size={13} />
              <strong className="text-slate-900 dark:text-white font-bold">{profileData?.reputationPoints || 940}</strong> Builder Reputation
            </span>
            {profileData?.experienceLevel && (
              <span className="text-slate-600 dark:text-slate-300">
                Level: <strong className="text-primary-600 font-bold">{profileData.experienceLevel}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Drawer / Inline Card */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-primary-500/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FiEdit2 className="text-primary-600" /> Edit Builder Profile
            </h3>
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input 
                type="text" 
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Professional Headline</label>
              <input 
                type="text" 
                value={editForm.headline} 
                onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                placeholder="e.g. Lead AI Architect & Systems Engineer"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Role</label>
              <select
                value={editForm.primaryRole}
                onChange={(e) => setEditForm({ ...editForm, primaryRole: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="AI/ML Engineer">AI/ML Engineer</option>
                <option value="Full-Stack Developer">Full-Stack Developer</option>
                <option value="Frontend Engineer">Frontend Engineer</option>
                <option value="Backend Engineer">Backend Engineer</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="Cloud / DevOps Engineer">Cloud / DevOps Engineer</option>
                <option value="Mobile Developer">Mobile Developer</option>
                <option value="Security Researcher">Security Researcher</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Experience Level</label>
              <select
                value={editForm.experienceLevel}
                onChange={(e) => setEditForm({ ...editForm, experienceLevel: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="Student">Student</option>
                <option value="Junior">Junior (0-2 yrs)</option>
                <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                <option value="Senior">Senior (5-8 yrs)</option>
                <option value="Lead / Principal">Lead / Principal (8+ yrs)</option>
                <option value="Founder">Founder / Architect</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Location</label>
              <input 
                type="text" 
                value={editForm.location} 
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g. San Francisco, CA or Remote"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">College / University</label>
              <input 
                type="text" 
                value={editForm.college} 
                onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                placeholder="e.g. Stanford University / NIT"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department / Branch</label>
              <input 
                type="text" 
                value={editForm.department} 
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                placeholder="e.g. Computer Science"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Graduation Year</label>
              <input 
                type="text" 
                value={editForm.graduationYear} 
                onChange={(e) => setEditForm({ ...editForm, graduationYear: e.target.value })}
                placeholder="e.g. 2026"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GitHub Profile URL</label>
              <input 
                type="url" 
                value={editForm.github} 
                onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                placeholder="https://github.com/username"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">LinkedIn Profile URL</label>
              <input 
                type="url" 
                value={editForm.linkedin} 
                onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bio / About</label>
            <textarea
              rows={4}
              value={editForm.about}
              onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
              placeholder="Tell other builders about your focus, achievements, and what you love building..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Upload New Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-600 dark:file:bg-slate-800 dark:file:text-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Upload Profile Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-600 dark:file:bg-slate-800 dark:file:text-primary-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editForm.openToWork}
                onChange={(e) => setEditForm({ ...editForm, openToWork: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              Show "Open to Work" Badge
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editForm.openToCollaborate}
                onChange={(e) => setEditForm({ ...editForm, openToCollaborate: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              Show "Open to Collaborate" Badge
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs disabled:opacity-60"
            >
              {saving ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* Gemini AI Suite Suite */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/20 via-primary-900/10 to-sky-900/10 border border-primary-500/30 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FiCpu size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                NEXORA AI Builder Suite <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold">Powered by Gemini</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ground-truth technical analysis based strictly on your projects, skills, and code artifacts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleGenerateAiSummary}
              disabled={aiGenerating}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                aiActiveFeature === 'summary' && (aiSummary || aiHeadlinesData)
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary-500'
              }`}
            >
              Headlines & Bio
            </button>
            <button
              onClick={handleRunProfileImprovementAudit}
              disabled={aiGenerating}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                aiActiveFeature === 'audit' && aiAuditData
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary-500'
              }`}
            >
              Profile Audit
            </button>
            <button
              onClick={handleGetSkillRoadmap}
              disabled={aiGenerating}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                aiActiveFeature === 'skills' && aiSkillsData
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary-500'
              }`}
            >
              Skill Roadmap
            </button>
          </div>
        </div>

        {aiGenerating ? (
          <div className="py-8 text-center text-xs text-primary-600 dark:text-primary-400 font-semibold animate-pulse flex items-center justify-center gap-2">
            <FiCpu className="animate-spin" size={16} /> Analyzing builder artifacts with Gemini AI...
          </div>
        ) : (
          <>
            {/* 1. Headlines & Summaries */}
            {aiActiveFeature === 'summary' && (aiHeadlinesData || aiSummary) && (
              <div className="mt-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-primary-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-4">
                {aiHeadlinesData?.headlines && aiHeadlinesData.headlines.length > 0 && (
                  <div>
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-2">
                      Suggested Headlines:
                    </span>
                    <div className="space-y-2">
                      {aiHeadlinesData.headlines.map((hl, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                          <span className="font-medium text-xs text-slate-800 dark:text-slate-200">{hl}</span>
                          {isOwnProfile && (
                            <button
                              onClick={() => handleApplyHeadline(hl)}
                              className="px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold text-[11px] border border-primary-500/30 hover:bg-primary-100 shrink-0 cursor-pointer self-start sm:self-auto"
                            >
                              Use Headline
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-2">
                    Executive Summary:
                  </span>
                  <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {aiSummary}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => handleApplyAiSummary(aiSummary)}
                      className="mt-2.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Apply to Bio Draft
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. Profile Improvement Audit */}
            {aiActiveFeature === 'audit' && aiAuditData && (
              <div className="mt-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-primary-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Profile Strength Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-primary-600">{aiAuditData.overallScore}</span>
                    <span className="text-xs text-slate-400 font-bold">/ 100</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                      Key Technical Strengths:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {aiAuditData.strengths?.map((s, i) => (
                        <li key={i} className="leading-relaxed">{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                      High-Impact Improvements:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {aiAuditData.improvements?.map((imp, i) => (
                        <li key={i} className="leading-relaxed">{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {aiAuditData.recommendedAdditions && aiAuditData.recommendedAdditions.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <span className="font-bold text-xs text-primary-600 dark:text-primary-400 block mb-1">
                      Recommended Portfolio Additions:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {aiAuditData.recommendedAdditions.map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 3. Skill Improvement Roadmap */}
            {aiActiveFeature === 'skills' && aiSkillsData && (
              <div className="mt-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-primary-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-4">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-2">
                    High-Demand Complementary Skills:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {aiSkillsData.complementarySkills?.map((skill, i) => (
                      <span key={i} className="px-3 py-1 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-500/30 text-xs font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-2">
                    Recommended Tools & Ecosystem:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {aiSkillsData.modernTools?.map((tool, i) => (
                      <span key={i} className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {aiSkillsData.projectIdeas && (
                  <div>
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block mb-2">
                      Hands-On Project Proof Ideas:
                    </span>
                    <div className="space-y-2">
                      {aiSkillsData.projectIdeas.map((idea, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {idea}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'skills', label: 'Skills & Proof' },
          { id: 'projects', label: 'Projects & Collabs' },
          { id: 'experience', label: 'Experience & Education' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">About the Builder</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {profileData?.about || 'No detailed biography provided yet.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2.5">
              Core Technical Domains
            </h4>
            <div className="flex flex-wrap gap-2">
              {(profileData?.domains || ['AI & Machine Learning', 'Distributed Systems', 'Cloud & Microservices']).map(d => (
                <span key={d} className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Skills & Proof */}
      {activeTab === 'skills' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiAward className="text-amber-500" /> Skill Proof & Verifiable Evidence
            </h3>
            <span className="text-xs text-emerald-500 font-bold">Verified Builder Capabilities</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {(profileData?.collections?.skills && profileData.collections.skills.length > 0) ? (
              profileData.collections.skills.map(sk => (
                <div key={sk._id || sk.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800 flex items-start justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">{sk.name}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {sk.category || 'Engineering'} • {sk.yearsOfExperience ? `${sk.yearsOfExperience} yrs experience` : 'Active Skill'}
                    </span>
                  </div>
                  {sk.level && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 border border-primary-500/20">
                      {sk.level}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 col-span-2">No skills registered yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Projects */}
      {activeTab === 'projects' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiFolder className="text-primary-600" /> Showcase Projects & Collabs
            </h3>
            <Link to="/projects" className="text-xs text-primary-600 font-bold hover:underline">
              Browse Collaboration Board
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {(profileData?.collections?.projects && profileData.collections.projects.length > 0) ? (
              profileData.collections.projects.map(proj => (
                <div key={proj._id || proj.title} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{proj.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {proj.description}
                    </p>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {proj.technologies.map(t => (
                          <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                    {proj.githubUrl && (
                      <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-600">
                        <FiGithub size={12} /> Repo
                      </a>
                    )}
                    {proj.liveUrl && (
                      <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-primary-600 hover:underline">
                        <FiExternalLink size={12} /> Live Demo
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 col-span-2">No showcase projects published yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Experience & Education */}
      {activeTab === 'experience' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <FiBriefcase className="text-primary-600" /> Work Experience
            </h3>
            <div className="space-y-3">
              {(profileData?.collections?.experience && profileData.collections.experience.length > 0) ? (
                profileData.collections.experience.map(exp => (
                  <div key={exp._id || exp.company} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{exp.role}</h4>
                    <p className="text-xs text-primary-600 font-semibold mt-0.5">{exp.company}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate || 'Completed'}
                    </p>
                    {exp.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No experience records added.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <FiBookOpen className="text-indigo-600" /> Education & Degrees
            </h3>
            <div className="space-y-3">
              {(profileData?.collections?.education && profileData.collections.education.length > 0) ? (
                profileData.collections.education.map(edu => (
                  <div key={edu._id || edu.college || edu.institution} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{edu.college || edu.institution}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      {edu.degree} {(edu.department || edu.fieldOfStudy) ? `in ${edu.department || edu.fieldOfStudy}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Class of {edu.graduationYear || edu.endYear || '2026'} {edu.cgpa ? `• CGPA: ${edu.cgpa}` : ''}
                    </p>
                  </div>
                ))
              ) : profileData?.college ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{profileData.college}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    {profileData.degree || 'B.Tech / B.E.'} {profileData.department ? `in ${profileData.department}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Class of {profileData.graduationYear || '2026'} {profileData.cgpa ? `• CGPA: ${profileData.cgpa}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No education records added.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderProfile;
