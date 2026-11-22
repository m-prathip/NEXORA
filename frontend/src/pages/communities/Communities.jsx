import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, FiPlus, FiMessageSquare, FiCompass, FiCheck, 
  FiFolder, FiSearch, FiX, FiShield, FiTag, FiEdit3, 
  FiFlag, FiAlertCircle, FiSend, FiUserCheck, FiUserX, FiStar, FiLock
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { communitiesAPI, postsAPI, reportsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FALLBACK_COMMUNITIES = [
  {
    _id: 'c-1',
    name: 'AI & Large Language Model Engineers',
    slug: 'ai-ml',
    category: 'AI & Machine Learning',
    membersCount: 4210,
    postsCount: 890,
    description: 'Technical discussions on RAG pipelines, model quantization, fine-tuning, PyTorch, and distributed LLM agent architectures.',
    rules: ['Be respectful and collaborative', 'No self-promotion without technical value', 'Cite model benchmarks'],
    isMember: true,
    memberRole: 'admin',
    creator: { username: 'alex', name: 'Alex Rivera' }
  },
  {
    _id: 'c-2',
    name: 'React 19 & Modern Web Architecture',
    slug: 'react-web',
    category: 'Web & Frontend',
    membersCount: 3840,
    postsCount: 1240,
    description: 'Server Components, streaming UI, WebGL shaders, Tailwind design tokens, and next-gen web application architecture.',
    rules: ['Code snippets must use modern ES/TS', 'Constructive architecture critiques only'],
    isMember: true,
    memberRole: 'member',
    creator: { username: 'priyadev', name: 'Priya Sharma' }
  },
  {
    _id: 'c-3',
    name: 'Cloud & Distributed Systems Guild',
    slug: 'cloud-devops',
    category: 'Backend & Cloud',
    membersCount: 2950,
    postsCount: 640,
    description: 'Kubernetes, eBPF, Kafka event streams, Terraform infrastructure-as-code, and resilient multi-region architectures.',
    rules: ['Focus on distributed resilience and zero-downtime designs'],
    isMember: false,
    memberRole: null,
    creator: { username: 'karthikr', name: 'Karthik Raja' }
  },
  {
    _id: 'c-4',
    name: 'UI/UX & Product Design Engineers',
    slug: 'design-engineers',
    category: 'Design & UI/UX',
    membersCount: 1980,
    postsCount: 420,
    description: 'For engineers who care obsessively about typography, framer-motion micro-interactions, accessibility, and design tokens.',
    rules: ['Share Figma or CodePen links with design critiques'],
    isMember: false,
    memberRole: null,
    creator: { username: 'amara_o', name: 'Amara Okafor' }
  },
  {
    _id: 'c-5',
    name: 'Open Source Builders & Maintainers',
    slug: 'open-source',
    category: 'Open Source',
    membersCount: 3120,
    postsCount: 950,
    description: 'Collaborate on open-source repositories, review PRs, find mentors, and turn GitHub experiments into thriving products.',
    rules: ['Open-source license required on shared repos', 'Be polite in PR reviews'],
    isMember: false,
    memberRole: null,
    creator: { username: 'devin_t', name: 'Devin Thorne' }
  }
];

const CATEGORIES = [
  'All',
  'AI & Machine Learning',
  'Web & Frontend',
  'Backend & Cloud',
  'Open Source',
  'Design & UI/UX',
  'Mobile & GameDev'
];

const Communities = () => {
  const { user, isAuth } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeCommunity, setActiveCommunity] = useState(null);

  // Community Detail tabs: 'posts' | 'members' | 'about'
  const [detailTab, setDetailTab] = useState('posts');
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');

  // Create & Edit forms
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'AI & Machine Learning',
    ruleInput: '',
    rules: []
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'AI & Machine Learning',
    rules: []
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // Report Form
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, [selectedCategory, search]);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const res = await communitiesAPI.getAll({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        q: search.trim() || undefined
      });
      if (res.data?.communities && res.data.communities.length > 0) {
        setCommunities(res.data.communities);
      } else if (Array.isArray(res.data) && res.data.length > 0) {
        setCommunities(res.data);
      } else {
        setCommunities(filterFallbackCommunities());
      }
    } catch {
      setCommunities(filterFallbackCommunities());
    } finally {
      setLoading(false);
    }
  };

  const filterFallbackCommunities = () => {
    let list = [...FALLBACK_COMMUNITIES];
    if (selectedCategory !== 'All') {
      list = list.filter(c => c.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.description.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const toggleJoin = async (community) => {
    const communityId = community._id || community.id;
    if (!isAuth) {
      setCommunities(prev => prev.map(c => {
        if ((c._id || c.id) === communityId) {
          const next = !c.isMember;
          toast.success(next ? `Joined ${c.name}!` : `Left ${c.name}`);
          return {
            ...c,
            isMember: next,
            membersCount: next ? c.membersCount + 1 : Math.max(1, c.membersCount - 1)
          };
        }
        return c;
      }));
      return;
    }

    try {
      const res = await communitiesAPI.toggleJoin(communityId);
      setCommunities(prev => prev.map(c => {
        if ((c._id || c.id) === communityId) {
          return {
            ...c,
            isMember: res.data.joined,
            membersCount: res.data.membersCount
          };
        }
        return c;
      }));

      if (activeCommunity && (activeCommunity._id === communityId || activeCommunity.id === communityId)) {
        setActiveCommunity(prev => ({
          ...prev,
          isMember: res.data.joined,
          membersCount: res.data.membersCount
        }));
      }

      toast.success(res.data.joined ? `Joined ${community.name}!` : `Left ${community.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update community membership');
    }
  };

  // Open Community Detail Modal
  const openCommunityDetail = async (community) => {
    setActiveCommunity(community);
    setShowDetailModal(true);
    setDetailTab('posts');
    setLoadingDetail(true);

    const commId = community._id || community.id;

    try {
      const [postsRes, membersRes] = await Promise.allSettled([
        communitiesAPI.getPosts(commId),
        communitiesAPI.getMembers(commId)
      ]);

      if (postsRes.status === 'fulfilled' && postsRes.value?.data?.posts) {
        setCommunityPosts(postsRes.value.data.posts);
      } else {
        setCommunityPosts([
          {
            _id: 'cp-1',
            author: { name: 'Alex Rivera', username: 'alex', headline: 'AI Systems Architect' },
            content: `Welcome to ${community.name}! Feel free to introduce your technical projects, share architecture diagrams, and discuss open research papers.`,
            createdAt: new Date().toISOString(),
            reactionsCount: { like: 12, celebrate: 4 }
          }
        ]);
      }

      if (membersRes.status === 'fulfilled' && membersRes.value?.data?.members) {
        setCommunityMembers(membersRes.value.data.members);
      } else {
        setCommunityMembers([
          {
            _id: 'm-1',
            role: 'admin',
            user: { username: community.creator?.username || 'alex', name: community.creator?.name || 'Community Founder', headline: 'Lead Maintainer' }
          },
          {
            _id: 'm-2',
            role: 'member',
            user: { username: 'priyadev', name: 'Priya Sharma', headline: 'Full-Stack Developer' }
          }
        ]);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingDetail(false);
    }
  };

  // Create Community
  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.description.trim()) {
      return toast.error('Please enter name and description');
    }

    setCreating(true);
    if (!isAuth) {
      const newC = {
        _id: `c-${Date.now()}`,
        name: createForm.name.trim(),
        slug: createForm.name.trim().toLowerCase().replace(/\s+/g, '-'),
        category: createForm.category,
        description: createForm.description.trim(),
        rules: createForm.rules,
        membersCount: 1,
        postsCount: 0,
        isMember: true,
        memberRole: 'admin',
        creator: { username: user?.username || 'you', name: user?.name || 'You' }
      };
      setCommunities([newC, ...communities]);
      setShowCreateModal(false);
      setCreating(false);
      toast.success('Community established!');
      return;
    }

    try {
      const res = await communitiesAPI.create({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        rules: createForm.rules
      });
      setCommunities([res.data, ...communities]);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', category: 'AI & Machine Learning', ruleInput: '', rules: [] });
      toast.success('Community established! (+20 reputation pts)');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create community');
    } finally {
      setCreating(false);
    }
  };

  // Edit Community
  const handleOpenEdit = (community) => {
    setEditForm({
      name: community.name,
      description: community.description,
      category: community.category,
      rules: community.rules || []
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.description.trim()) {
      return toast.error('Name and description are required');
    }

    setEditing(true);
    const commId = activeCommunity._id || activeCommunity.id;

    if (!isAuth) {
      setActiveCommunity(prev => ({
        ...prev,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        rules: editForm.rules
      }));
      setCommunities(prev => prev.map(c => (c._id === commId || c.id === commId) ? {
        ...c,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        rules: editForm.rules
      } : c));
      setShowEditModal(false);
      setEditing(false);
      toast.success('Community updated!');
      return;
    }

    try {
      const res = await communitiesAPI.update(commId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        rules: editForm.rules
      });
      setActiveCommunity(res.data.community);
      setCommunities(prev => prev.map(c => (c._id === commId || c.id === commId) ? res.data.community : c));
      setShowEditModal(false);
      toast.success('Community updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update community');
    } finally {
      setEditing(false);
    }
  };

  // Update Member Role (Admin permission action)
  const handleUpdateMemberRole = async (memberId, newRole) => {
    const commId = activeCommunity._id || activeCommunity.id;
    try {
      if (isAuth) {
        await communitiesAPI.updateMemberRole(commId, memberId, { role: newRole });
      }
      setCommunityMembers(prev => prev.map(m => m._id === memberId ? { ...m, role: newRole } : m));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this community?`)) return;
    const commId = activeCommunity._id || activeCommunity.id;

    try {
      if (isAuth) {
        await communitiesAPI.updateMemberRole(commId, memberId, { action: 'remove' });
      }
      setCommunityMembers(prev => prev.filter(m => m._id !== memberId));
      setActiveCommunity(prev => ({ ...prev, membersCount: Math.max(1, prev.membersCount - 1) }));
      toast.success(`${memberName} removed from community`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // Create Post inside Community
  const handleCreateCommunityPost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const commId = activeCommunity._id || activeCommunity.id;
    try {
      if (isAuth) {
        const res = await postsAPI.create({
          content: newPostContent.trim(),
          community: commId,
          postType: 'text'
        });
        setCommunityPosts([res.data, ...communityPosts]);
      } else {
        const mockPost = {
          _id: `post-${Date.now()}`,
          author: { name: user?.name || 'You', username: user?.username || 'you' },
          content: newPostContent.trim(),
          createdAt: new Date().toISOString(),
          reactionsCount: { like: 1 }
        };
        setCommunityPosts([mockPost, ...communityPosts]);
      }
      setNewPostContent('');
      toast.success('Discussion posted in community!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit post');
    }
  };

  // Submit Content Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    const commId = activeCommunity._id || activeCommunity.id;

    try {
      if (isAuth) {
        await communitiesAPI.report(commId, {
          reason: reportReason,
          details: reportDetails
        });
      }
      toast.success('Report submitted. Our moderation team will investigate.');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const isCurrentCommunityAdmin = activeCommunity && (
    activeCommunity.memberRole === 'admin' ||
    activeCommunity.creator?._id === user?._id ||
    activeCommunity.creator?.username === user?.username ||
    user?.role === 'admin'
  );

  return (
    <div className="space-y-6">
      {/* Communities Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full border border-primary-500/20">
            Student & Builder Guilds
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <FiUsers className="text-primary-600" /> Student & Technical Communities
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Join domain-specific engineering hubs to collaborate on architectures, publish community discussions, review code, and elect student leaders.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-2 self-start sm:self-auto shadow-xs transition-all shrink-0"
        >
          <FiPlus size={15} /> Create Community
        </button>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search communities by topic, domain, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Community Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-3">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
              <div className="w-48 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-full h-12 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <FiFolder size={32} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No communities match your search</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching for a different keyword or create the first community for your student guild!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {communities.map(comm => {
            const commId = comm._id || comm.id;
            return (
              <div
                key={commId}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-xs shrink-0">
                      {comm.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                      {comm.category}
                    </span>
                  </div>

                  <div>
                    <h3 
                      onClick={() => openCommunityDetail(comm)}
                      className="font-bold text-base text-slate-900 dark:text-white hover:text-primary-600 cursor-pointer transition-colors"
                    >
                      {comm.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {comm.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <FiUsers size={12} className="text-primary-600" /> {comm.membersCount.toLocaleString()} builders
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMessageSquare size={12} /> {comm.postsCount || 0} discussions
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openCommunityDetail(comm)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    View Hub
                  </button>

                  <button
                    onClick={() => toggleJoin(comm)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                      comm.isMember
                        ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    {comm.isMember ? (
                      <>
                        <FiCheck size={13} className="text-emerald-500" /> Joined
                      </>
                    ) : (
                      <>
                        <FiPlus size={13} /> Join Guild
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Community Detail Modal (Discussions, Member Permissions, About) ─── */}
      {showDetailModal && activeCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-xs shrink-0">
                  {activeCommunity.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{activeCommunity.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                      {activeCommunity.category}
                    </span>
                    {isCurrentCommunityAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                        <FiShield size={10} /> Admin Access
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeCommunity.membersCount} members • Created by {activeCommunity.creator?.name || activeCommunity.creator?.username || 'Founder'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isCurrentCommunityAdmin && (
                  <button
                    onClick={() => handleOpenEdit(activeCommunity)}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Edit Community"
                  >
                    <FiEdit3 size={15} />
                  </button>
                )}
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Report Content"
                >
                  <FiFlag size={15} />
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 text-xs font-bold">
              <button
                onClick={() => setDetailTab('posts')}
                className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  detailTab === 'posts'
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiMessageSquare size={13} /> Discussions ({communityPosts.length})
              </button>
              <button
                onClick={() => setDetailTab('members')}
                className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  detailTab === 'members'
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiUsers size={13} /> Member Roster ({activeCommunity.membersCount})
              </button>
              <button
                onClick={() => setDetailTab('about')}
                className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  detailTab === 'about'
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiShield size={13} /> Rules & Governance
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: COMMUNITY POSTS */}
              {detailTab === 'posts' && (
                <div className="space-y-4">
                  {/* Community Post Creator */}
                  <form onSubmit={handleCreateCommunityPost} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <textarea
                      rows={2}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`Share code, ask an architecture question, or start a discussion in ${activeCommunity.name}...`}
                      className="w-full text-xs sm:text-sm bg-transparent outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400">Posts in this guild are visible to all members</span>
                      <button
                        type="submit"
                        disabled={!newPostContent.trim()}
                        className="px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                      >
                        <FiSend size={12} /> Post
                      </button>
                    </div>
                  </form>

                  {/* Discussions list */}
                  {communityPosts.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No discussions in this community yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {communityPosts.map(p => (
                        <div key={p._id || p.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold flex items-center justify-center text-xs">
                              {p.author?.name ? p.author.name.slice(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-900 dark:text-white">{p.author?.name || p.author?.username}</p>
                              <p className="text-[10px] text-slate-400">{p.author?.headline || 'Engineer'}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {p.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MEMBERS & MODERATOR PERMISSIONS */}
              {detailTab === 'members' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">Guild Members & Leaders</span>
                    <span className="text-slate-400">Admins and moderators uphold technical standards</span>
                  </div>

                  {communityMembers.map(m => {
                    const mUser = m.user || {};
                    const isCreator = activeCommunity.creator?.username === mUser.username || activeCommunity.creator?._id === mUser.id;
                    return (
                      <div 
                        key={m._id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {mUser.name ? mUser.name.slice(0, 2).toUpperCase() : 'MB'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{mUser.name || mUser.username}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                m.role === 'admin' 
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                  : m.role === 'moderator'
                                    ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                                    : 'bg-slate-200/50 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                              }`}>
                                {isCreator ? 'Creator & Admin' : m.role.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{mUser.headline || 'Software Engineer'}</p>
                          </div>
                        </div>

                        {/* Admin Controls */}
                        {isCurrentCommunityAdmin && !isCreator && (
                          <div className="flex items-center gap-2">
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateMemberRole(m._id, e.target.value)}
                              className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                            >
                              <option value="member">Member</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(m._id, mUser.name || mUser.username)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Remove Member"
                            >
                              <FiUserX size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: ABOUT & COMMUNITY RULES */}
              {detailTab === 'about' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Community Description</h4>
                    <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {activeCommunity.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Community Guidelines & Rules</h4>
                    {activeCommunity.rules && activeCommunity.rules.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300">
                        {activeCommunity.rules.map((rule, idx) => (
                          <li key={idx} className="leading-relaxed">{rule}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 mt-1 italic">Standard NEXORA Builder Code of Conduct applies.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
              <button
                onClick={() => toggleJoin(activeCommunity)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  activeCommunity.isMember
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                {activeCommunity.isMember ? 'Leave Guild' : 'Join Guild'}
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Community Modal ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Create New Community</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Community Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Distributed Database Architecture Guild"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Domain Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="What is the mission of this community? What technical topics are explored?"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
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
                  {creating ? 'Establishing...' : 'Establish Community (+20 Pts)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Community Modal (Admin Only) ─── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FiEdit3 className="text-primary-600" /> Edit Community Settings
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Community Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Report Inappropriate Content Modal ─── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-red-600 flex items-center gap-2">
                <FiAlertCircle /> Report Inappropriate Content
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
                  <option value="spam">Spam or commercial advertisement</option>
                  <option value="harassment">Harassment or personal attack</option>
                  <option value="inappropriate_content">Inappropriate or adult content</option>
                  <option value="hate_speech">Hate speech or discrimination</option>
                  <option value="misleading">Misleading or fraudulent code/claims</option>
                  <option value="other">Other policy violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Additional Context (Optional)</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional details for our safety reviewers..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
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

export default Communities;
