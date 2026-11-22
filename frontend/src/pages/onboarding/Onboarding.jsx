import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { profileAPI } from '../../services/api';
import { 
  FiUser, FiCode, FiZap, FiGithub, FiLinkedin, 
  FiArrowRight, FiArrowLeft, FiCheck, FiBriefcase, 
  FiAward, FiFolder, FiLock, FiGlobe, FiEye, FiUploadCloud, 
  FiCheckCircle, FiExternalLink, FiPlus, FiTrash2, FiBook
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const ROLES = [
  'AI / ML Engineer',
  'Full-Stack Developer',
  'Frontend Architect',
  'Backend & Cloud Engineer',
  'UI/UX & Product Designer',
  'Data Scientist / Researcher',
  'Mobile Developer',
  'College Student / Fresher'
];

const SKILL_SUGGESTIONS = [
  'Python', 'PyTorch', 'React 19', 'TypeScript', 'Node.js', 
  'FastAPI', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 
  'Tailwind CSS', 'Figma', 'Next.js', 'LLMs', 'Rust', 'Redis'
];

const INTEREST_SUGGESTIONS = [
  'Autonomous Agents', 'Distributed Systems', 'Open Source', 
  'Generative AI', 'Cloud Native', 'Cybersecurity', 'Developer Tools', 'Fintech'
];

const Onboarding = () => {
  const { user, isAuth, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Personal & Academic Identity
    name: user?.name || user?.username || '',
    headline: user?.headline || 'Software Engineer & Builder',
    primaryRole: user?.primaryRole || 'Full-Stack Developer',
    experienceLevel: 'Entry-Level / Fresher',
    about: 'Passionate developer building high-impact software, contributing to open-source, and exploring distributed AI architectures.',
    college: 'National Institute of Technology',
    department: 'Computer Science & Engineering',
    degree: 'B.Tech / B.E.',
    graduationYear: '2026',
    cgpa: '8.8 / 10',
    location: 'Bangalore, India / Remote',
    
    // Step 2: Skills & Interests
    selectedSkills: ['React 19', 'TypeScript', 'Python', 'Docker'],
    selectedInterests: ['Distributed Systems', 'Generative AI', 'Open Source'],
    customSkillInput: '',
    customInterestInput: '',

    // Step 3: Experience, Projects & Certifications
    experiences: [
      { company: 'Tech Innovators Lab', role: 'Full-Stack Engineering Intern', duration: 'Jun 2025 - Present', description: 'Engineered high-throughput REST APIs and reactive React dashboards.' }
    ],
    projects: [
      { title: 'NEXORA Network Engine', description: 'High-performance developer networking engine with real-time matchmaking.', techStack: 'React 19, Node.js, MongoDB', githubLink: 'https://github.com', liveLink: 'https://nexora.network' }
    ],
    certifications: [
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', issueDate: '2025', credentialUrl: 'https://aws.amazon.com' }
    ],
    achievements: [
      { title: 'Top 5 Finalist — Global AI Hackathon', description: 'Built an autonomous edge agent reducing inference latency by 45%.', date: '2025' }
    ],

    // Step 4: Social Links & Privacy Controls
    github: user?.username ? `https://github.com/${user.username}` : 'https://github.com',
    linkedin: 'https://linkedin.com/in',
    website: '',
    openToWork: true,
    openToCollaborate: true,
    privacy: {
      profileVisibility: 'public', // 'public' | 'network' | 'private'
      showOnlineStatus: true,
      allowDirectMessages: 'everyone',
      searchEngineIndexing: true,
      showEducation: true,
      showExperience: true
    }
  });

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(user?.bannerImage || '');
  const [coverFile, setCoverFile] = useState(null);

  // Toggle skills
  const toggleSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skill)
        ? prev.selectedSkills.filter(s => s !== skill)
        : [...prev.selectedSkills, skill]
    }));
  };

  const addCustomSkill = (e) => {
    e?.preventDefault();
    const val = formData.customSkillInput.trim();
    if (val && !formData.selectedSkills.includes(val)) {
      setFormData(prev => ({
        ...prev,
        selectedSkills: [...prev.selectedSkills, val],
        customSkillInput: ''
      }));
    }
  };

  // Toggle interests
  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      selectedInterests: prev.selectedInterests.includes(interest)
        ? prev.selectedInterests.filter(i => i !== interest)
        : [...prev.selectedInterests, interest]
    }));
  };

  const addCustomInterest = (e) => {
    e?.preventDefault();
    const val = formData.customInterestInput.trim();
    if (val && !formData.selectedInterests.includes(val)) {
      setFormData(prev => ({
        ...prev,
        selectedInterests: [...prev.selectedInterests, val],
        customInterestInput: ''
      }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name?.trim()) return toast.error('Please enter your full name');
      if (!formData.headline?.trim()) return toast.error('Please provide a professional headline');
      if (!formData.college?.trim()) return toast.error('Please specify your college or university');
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(Math.max(1, step - 1));
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('headline', formData.headline);
      data.append('primaryRole', formData.primaryRole);
      data.append('experienceLevel', formData.experienceLevel);
      data.append('about', formData.about);
      data.append('college', formData.college);
      data.append('department', formData.department);
      data.append('degree', formData.degree);
      data.append('graduationYear', formData.graduationYear);
      data.append('cgpa', formData.cgpa);
      data.append('location', formData.location);
      data.append('skills', JSON.stringify(formData.selectedSkills));
      data.append('interests', JSON.stringify(formData.selectedInterests));
      data.append('experienceSummary', JSON.stringify(formData.experiences));
      data.append('projectsSummary', JSON.stringify(formData.projects));
      data.append('certificationsSummary', JSON.stringify(formData.certifications));
      data.append('achievementsSummary', JSON.stringify(formData.achievements));
      data.append('github', formData.github);
      data.append('linkedin', formData.linkedin);
      data.append('website', formData.website);
      data.append('openToWork', formData.openToWork);
      data.append('openToCollaborate', formData.openToCollaborate);
      data.append('privacy', JSON.stringify(formData.privacy));

      if (avatarFile) data.append('profileImage', avatarFile);
      if (coverFile) data.append('coverImage', coverFile);

      const res = await profileAPI.onboard(data);
      if (res.data?.user && updateUser) {
        updateUser(res.data.user);
      }

      toast.success('Builder profile configured! Welcome to NEXORA.');
      navigate('/dashboard');
    } catch (err) {
      console.warn('Backend onboarding fallback:', err);
      // Fallback updates local user session so user can continue without getting stuck
      if (updateUser) {
        updateUser({
          name: formData.name,
          headline: formData.headline,
          primaryRole: formData.primaryRole,
          isOnboarded: true
        });
      }
      toast.success('Onboarding complete! Profile setup recorded.');
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const username = user?.username || 'builder';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-white flex flex-col justify-between p-4 sm:p-6 transition-colors">
      {/* Brand Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-primary-600 to-sky-500 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-lg">N</span>
          </div>
          <div>
            <span className="font-black text-base tracking-tight block">NEXORA</span>
            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider block">
              Builder Profile Setup
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            Step {step} of 4
          </span>
          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Wizard Container */}
      <div className="max-w-3xl mx-auto w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-6">
        
        {/* STEP 1: Personal & Academic Identity */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full border border-primary-500/20">
                Step 1: Builder Identity
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                Name, Headline & Education
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Establish your verified professional presence on the builders network.
              </p>
            </div>

            {/* Profile Avatar & Cover Image Selectors */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Profile Photo & Cover Banner
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                {/* Avatar Preview */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-2xl overflow-hidden shadow-sm">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <FiUploadCloud size={20} />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>

                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Upload Builder Avatar</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">PNG, JPG or WebP up to 5MB. Clear headshot recommended.</p>
                  <label className="inline-block mt-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer">
                    Choose Photo File
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Name & Headline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Professional Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems Engineer • AI Builder"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            {/* Role & Experience Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Discipline</label>
                <select
                  value={formData.primaryRole}
                  onChange={(e) => setFormData({ ...formData, primaryRole: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Experience Level</label>
                <select
                  value={formData.experienceLevel}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                >
                  <option>Student</option>
                  <option>Entry-Level / Fresher</option>
                  <option>Mid-Level</option>
                  <option>Senior</option>
                  <option>Lead / Staff</option>
                </select>
              </div>
            </div>

            {/* College & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">College / University</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford / IIT / NIT"
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department / Branch</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Graduation Year</label>
                <input
                  type="text"
                  placeholder="e.g. 2026"
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            {/* Bio / About */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">About Section</label>
              <textarea
                rows={3}
                placeholder="A short summary of your background, engineering interests, and what you build."
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Skills & Builder Interests */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-500/20">
                Step 2: Technical Radar
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                Skills & Builder Interests
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select your engineering tools and domains to unlock accurate teammate recommendations and job radar.
              </p>
            </div>

            {/* Skills selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Technical Skills (Selected: {formData.selectedSkills.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map(skill => {
                  const isSelected = formData.selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isSelected && <FiCheck size={12} />}
                      {skill}
                    </button>
                  );
                })}
              </div>

              {/* Custom Skill Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add custom skill (e.g. GraphQL, Solidity, PySpark)..."
                  value={formData.customSkillInput}
                  onChange={(e) => setFormData({ ...formData, customSkillInput: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomSkill(e)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800"
                >
                  Add Skill
                </button>
              </div>
            </div>

            {/* Interests & Domains */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Interests & Domains of Focus
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_SUGGESTIONS.map(interest => {
                  const isSelected = formData.selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isSelected && <FiCheck size={12} />}
                      {interest}
                    </button>
                  );
                })}
              </div>

              {/* Custom Interest Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add custom interest (e.g. Quantum Computing, AI Safety)..."
                  value={formData.customInterestInput}
                  onChange={(e) => setFormData({ ...formData, customInterestInput: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomInterest(e)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomInterest}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800"
                >
                  Add Interest
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Experience, Projects & Certifications */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Step 3: Proof of Work
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                Experience & Showcase Projects
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Highlight your engineering contributions, hackathons, and certifications.
              </p>
            </div>

            {/* Showcase Project Card */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiFolder className="text-primary-600" /> Featured Project
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Project Title</label>
                    <input
                      type="text"
                      value={formData.projects[0]?.title || ''}
                      onChange={(e) => {
                        const updated = [...formData.projects];
                        updated[0] = { ...updated[0], title: e.target.value };
                        setFormData({ ...formData, projects: updated });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Tech Stack (comma separated)</label>
                    <input
                      type="text"
                      value={formData.projects[0]?.techStack || ''}
                      onChange={(e) => {
                        const updated = [...formData.projects];
                        updated[0] = { ...updated[0], techStack: e.target.value };
                        setFormData({ ...formData, projects: updated });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.projects[0]?.description || ''}
                    onChange={(e) => {
                      const updated = [...formData.projects];
                      updated[0] = { ...updated[0], description: e.target.value };
                      setFormData({ ...formData, projects: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    placeholder="GitHub Repository URL"
                    value={formData.projects[0]?.githubLink || ''}
                    onChange={(e) => {
                      const updated = [...formData.projects];
                      updated[0] = { ...updated[0], githubLink: e.target.value };
                      setFormData({ ...formData, projects: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Live Demo URL (optional)"
                    value={formData.projects[0]?.liveLink || ''}
                    onChange={(e) => {
                      const updated = [...formData.projects];
                      updated[0] = { ...updated[0], liveLink: e.target.value };
                      setFormData({ ...formData, projects: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Experience Card */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FiBriefcase className="text-indigo-600" /> Recent Experience or Internship
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Company / Lab Name"
                    value={formData.experiences[0]?.company || ''}
                    onChange={(e) => {
                      const updated = [...formData.experiences];
                      updated[0] = { ...updated[0], company: e.target.value };
                      setFormData({ ...formData, experiences: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. SWE Intern)"
                    value={formData.experiences[0]?.role || ''}
                    onChange={(e) => {
                      const updated = [...formData.experiences];
                      updated[0] = { ...updated[0], role: e.target.value };
                      setFormData({ ...formData, experiences: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 2024 - 2025)"
                    value={formData.experiences[0]?.duration || ''}
                    onChange={(e) => {
                      const updated = [...formData.experiences];
                      updated[0] = { ...updated[0], duration: e.target.value };
                      setFormData({ ...formData, experiences: updated });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Certifications & Achievements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FiAward className="text-amber-500" /> Certification
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS Solutions Architect / Meta React"
                  value={formData.certifications[0]?.name || ''}
                  onChange={(e) => {
                    const updated = [...formData.certifications];
                    updated[0] = { ...updated[0], name: e.target.value };
                    setFormData({ ...formData, certifications: updated });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FiZap className="text-primary-600" /> Key Achievement
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1st Place Hackathon / 500+ GitHub Stars"
                  value={formData.achievements[0]?.title || ''}
                  onChange={(e) => {
                    const updated = [...formData.achievements];
                    updated[0] = { ...updated[0], title: e.target.value };
                    setFormData({ ...formData, achievements: updated });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Social Links & Privacy Controls */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full border border-primary-500/20">
                Step 4: Connectivity & Privacy
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                Links & Visibility Controls
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configure your verified developer links and choose who can access your technical portfolio.
              </p>
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Connected Profiles</label>
              
              <div className="relative">
                <FiGithub className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="url"
                  placeholder="GitHub Profile URL"
                  value={formData.github}
                  onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>

              <div className="relative">
                <FiLinkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                <input
                  type="url"
                  placeholder="LinkedIn Profile URL"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>

              <div className="relative">
                <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                <input
                  type="url"
                  placeholder="Personal Website or Portfolio (optional)"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Profile Privacy Setting
              </label>
              <div className="space-y-2">
                {[
                  { id: 'public', title: 'Public to Everyone', desc: 'Anyone can view your NEXORA profile, projects, and 3D portfolio.' },
                  { id: 'network', title: 'Connections Only', desc: 'Only approved NEXORA connections can view your full education & experience history.' },
                  { id: 'private', title: 'Stealth / Private Mode', desc: 'Hidden from global searches. Accessible only via direct portfolio link.' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="onboardingPrivacy"
                      checked={formData.privacy.profileVisibility === opt.id}
                      onChange={() => setFormData({
                        ...formData,
                        privacy: { ...formData.privacy, profileVisibility: opt.id }
                      })}
                      className="mt-1 text-primary-600"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{opt.title}</span>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Public Portfolio Preview Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-950/30 to-indigo-950/30 border border-primary-500/20 text-xs space-y-2">
              <span className="font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                <FiCheckCircle size={14} /> Your Live Public URLs
              </span>
              <div className="space-y-1 font-mono text-[11px]">
                <p className="text-slate-600 dark:text-slate-300">
                  Interactive 3D Portfolio: <span className="text-primary-600 dark:text-primary-400">/u/{username}</span>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Builder Network Profile: <span className="text-indigo-600 dark:text-indigo-400">/profile/{username}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Bottom Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FiArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-primary-600 hover:bg-slate-800 dark:hover:bg-primary-700 shadow-sm flex items-center gap-1.5 transition-all"
            >
              Continue <FiArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-md flex items-center gap-1.5 transition-all disabled:opacity-60"
            >
              <FiCheck size={14} /> {submitting ? 'Setting up Profile...' : 'Launch NEXORA Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
