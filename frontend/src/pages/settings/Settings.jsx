import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  FiUser, FiLock, FiEye, FiBell, FiLink2, FiTrash2, 
  FiShield, FiSave, FiCheckCircle, FiExternalLink, FiGithub, 
  FiLinkedin, FiGlobe, FiAlertTriangle, FiSmartphone, FiDownload
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SETTINGS_TABS = [
  { id: 'general', label: 'Account & Profile', icon: <FiUser size={16} /> },
  { id: 'security', label: 'Security & Auth', icon: <FiLock size={16} /> },
  { id: 'privacy', label: 'Privacy & Visibility', icon: <FiEye size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <FiBell size={16} /> },
  { id: 'integrations', label: 'Connected Apps', icon: <FiLink2 size={16} /> },
  { id: 'danger', label: 'Danger Zone', icon: <FiTrash2 size={16} /> },
];

const Settings = () => {
  const { user, isAuth } = useAuth();
  const { dark, toggle } = useTheme();

  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  // General profile state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Alex Rivera',
    username: user?.username || 'alex',
    email: user?.email || 'alex@nexora.network',
    headline: user?.headline || 'Senior AI & Distributed Systems Architect',
    bio: user?.bio || 'Building distributed AI runtime systems and autonomous agents. Passionate about sub-100ms LLM inferences.',
    primaryRole: user?.primaryRole || 'AI / ML Engineer',
    location: 'San Francisco, CA / Remote',
    website: 'https://alexrivera.dev',
    openToWork: true,
    openToCollaborate: true
  });

  // Password state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Privacy preferences
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public', // 'public' | 'network' | 'private'
    showOnlineStatus: true,
    allowDirectMessages: 'everyone', // 'everyone' | 'connections'
    searchEngineIndexing: true,
    showReputationScore: true
  });

  // Notification preferences
  const [notificationSettings, setNotificationSettings] = useState({
    emailConnections: true,
    emailMessages: true,
    emailOpportunities: true,
    emailCommunityDiscussions: false,
    emailWeeklyDigest: true,
    inAppReactions: true,
    inAppComments: true,
    inAppCollabInvites: true
  });

  // Connected accounts
  const [integrations, setIntegrations] = useState({
    githubConnected: true,
    githubUsername: 'alexrivera-builds',
    linkedinConnected: true,
    linkedinUrl: 'https://linkedin.com/in/alexrivera'
  });

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Account profile updated successfully');
    }, 600);
  };

  const handleSaveSecurity = (e) => {
    e.preventDefault();
    if (securityForm.newPassword && securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSecurityForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      toast.success('Security settings and password updated');
    }, 600);
  };

  const handleSavePrivacy = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Privacy preferences saved');
    }, 500);
  };

  const handleSaveNotifications = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Notification preferences updated');
    }, 500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full border border-primary-500/20">
            Account Management
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            Platform Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your builder identity, security authentications, privacy controls, and connected tools.
          </p>
        </div>

        <Link
          to="/profile/me"
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <FiUser size={14} /> View Live Profile
        </Link>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Tabs (Left Sidebar) */}
        <aside className="md:col-span-1 space-y-1.5">
          <div className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeTab === tab.id
                    ? tab.id === 'danger'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      : 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 shadow-2xs'
                    : tab.id === 'danger'
                    ? 'text-red-500 hover:bg-red-500/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FiShield className="text-emerald-500" /> Nexora Security Level: High
            </span>
            <p>Your session tokens are securely encrypted with JWT and strict SameSite cookies.</p>
          </div>
        </aside>

        {/* Tab Content Panel (Right 3 cols) */}
        <div className="md:col-span-3">
          {/* TAB 1: General & Profile */}
          {activeTab === 'general' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Account & Profile Information</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update your public details visible to recruiters and fellow builders.</p>
              </div>

              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Username (Handle)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">@</span>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        className="w-full pl-8 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Professional Headline</label>
                  <input
                    type="text"
                    value={profileForm.headline}
                    onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">About / Bio</label>
                  <textarea
                    rows={4}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Role</label>
                    <select
                      value={profileForm.primaryRole}
                      onChange={(e) => setProfileForm({ ...profileForm, primaryRole: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                    >
                      <option>AI / ML Engineer</option>
                      <option>Full-Stack Developer</option>
                      <option>Frontend Architect</option>
                      <option>Backend & Cloud Engineer</option>
                      <option>UI/UX & Product Designer</option>
                      <option>Data Scientist / Researcher</option>
                      <option>College Student / Fresher</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>

                {/* Intent Toggles */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Networking Badges</span>
                  
                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileForm.openToWork}
                      onChange={(e) => setProfileForm({ ...profileForm, openToWork: e.target.checked })}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-0"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">#OpenToWork Badge</span>
                      <p className="text-slate-500 text-[11px]">Display an indicator on your profile that you are available for hire or contracts.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileForm.openToCollaborate}
                      onChange={(e) => setProfileForm({ ...profileForm, openToCollaborate: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">#OpenToCollaborate Badge</span>
                      <p className="text-slate-500 text-[11px]">Allow builders to send you project co-founder and teammate collaboration invites.</p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-2 transition-all disabled:opacity-60"
                  >
                    <FiSave size={14} /> {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Security & Authentication */}
          {activeTab === 'security' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Password & Authentication</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage your credentials, login verification, and active browser sessions.</p>
              </div>

              <form onSubmit={handleSaveSecurity} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter existing password"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Two-Factor Authentication (2FA)</span>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600">
                        <FiSmartphone size={18} />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">Authenticator App (TOTP)</span>
                        <p className="text-slate-500 text-[11px]">Require a 6-digit TOTP code from Google Authenticator on login.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.success('2FA configuration instructions sent to email')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-primary-500/30 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                    >
                      Enable 2FA
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-2 transition-all disabled:opacity-60"
                  >
                    <FiSave size={14} /> Update Security Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Privacy & Visibility */}
          {activeTab === 'privacy' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Privacy Controls</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose who can view your builder profile, projects, and reach out to you.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Profile Visibility</label>
                  <div className="space-y-2">
                    {[
                      { id: 'public', title: 'Public to Everyone', desc: 'Anyone on the internet can view your portfolio, posts, and projects.' },
                      { id: 'network', title: 'Connections Only', desc: 'Only approved NEXORA connections can view your full work history and contact info.' },
                      { id: 'private', title: 'Private / Stealth Mode', desc: 'Hidden from search and discover. Visible only by direct portfolio link.' }
                    ].map((opt) => (
                      <label key={opt.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="profileVisibility"
                          checked={privacySettings.profileVisibility === opt.id}
                          onChange={() => setPrivacySettings({ ...privacySettings, profileVisibility: opt.id })}
                          className="mt-1 text-primary-600"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">{opt.title}</span>
                          <p className="text-slate-500 text-[11px] mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Discovery & Status</span>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Show Real-Time Online Status</span>
                      <p className="text-slate-500 text-[11px]">Display a green active badge when you are on the platform.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.showOnlineStatus}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, showOnlineStatus: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Allow Search Engine Indexing</span>
                      <p className="text-slate-500 text-[11px]">Let Google and Bing index your public portfolio page (/u/username).</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.searchEngineIndexing}
                      onChange={(e) => setPrivacySettings({ ...privacySettings, searchEngineIndexing: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSavePrivacy}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-2 transition-all"
                  >
                    <FiSave size={14} /> Save Privacy Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Notifications */}
          {activeTab === 'notifications' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Select which activity updates arrive in your inbox and notification bell.</p>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Email Alerts</span>
                <div className="space-y-2">
                  {[
                    { key: 'emailConnections', label: 'Connection Requests & Approvals', desc: 'Receive emails when another builder sends or accepts a connection.' },
                    { key: 'emailMessages', label: 'Direct Messages', desc: 'Receive email alerts for unread chat messages when away.' },
                    { key: 'emailOpportunities', label: 'Matched Opportunity Radar', desc: 'Weekly AI-matched internships, freelance gigs, and hackathons.' },
                    { key: 'emailWeeklyDigest', label: 'NEXORA Weekly Builder Digest', desc: 'Curated trending projects, tech news, and top community threads.' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 cursor-pointer text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                        <p className="text-slate-500 text-[11px]">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings[item.key]}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs flex items-center gap-2 transition-all"
                  >
                    <FiSave size={14} /> Update Notifications
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Connected Apps */}
          {activeTab === 'integrations' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Connected Services & Sync</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Connect third-party developer platforms to automatically verify your skills and repositories.</p>
              </div>

              <div className="space-y-4">
                {/* GitHub */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 text-white">
                      <FiGithub size={20} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">GitHub Integration</span>
                      <p className="text-slate-500 text-[11px]">Sync pinned repositories, contribution graph, and commit proof.</p>
                      {integrations.githubConnected && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          <FiCheckCircle size={11} /> Connected as @{integrations.githubUsername}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIntegrations(prev => ({ ...prev, githubConnected: !prev.githubConnected }));
                      toast.success(integrations.githubConnected ? 'GitHub disconnected' : 'GitHub connected');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      integrations.githubConnected
                        ? 'border border-slate-300 dark:border-slate-700 text-slate-600 hover:text-red-500'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {integrations.githubConnected ? 'Disconnect' : 'Connect GitHub'}
                  </button>
                </div>

                {/* LinkedIn */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-600 text-white">
                      <FiLinkedin size={20} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">LinkedIn Profile</span>
                      <p className="text-slate-500 text-[11px]">Import work experience, education, and career certifications.</p>
                      {integrations.linkedinConnected && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          <FiCheckCircle size={11} /> Profile verified
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIntegrations(prev => ({ ...prev, linkedinConnected: !prev.linkedinConnected }));
                      toast.success(integrations.linkedinConnected ? 'LinkedIn disconnected' : 'LinkedIn connected');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      integrations.linkedinConnected
                        ? 'border border-slate-300 dark:border-slate-700 text-slate-600 hover:text-red-500'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {integrations.linkedinConnected ? 'Disconnect' : 'Connect LinkedIn'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Danger Zone */}
          {activeTab === 'danger' && (
            <div className="p-6 rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 shadow-xs space-y-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <FiAlertTriangle size={20} />
                <h3 className="text-base font-bold">Danger Zone</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Actions in this section are irreversible or affect your public online presence. Proceed with caution.
              </p>

              <div className="space-y-4">
                {/* Data Export */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">Export My NEXORA Data</span>
                    <p className="text-slate-500 text-[11px]">Download all your portfolio projects, posts, comments, and messages in a JSON archive.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Your data export is being generated and will download shortly.')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <FiDownload size={13} /> Export JSON
                  </button>
                </div>

                {/* Account Deletion */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-red-600 dark:text-red-400 block">Permanently Delete Account</span>
                    <p className="text-slate-500 text-[11px]">Remove your account, portfolio, followers, and all associated build posts permanently.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you absolutely sure you want to permanently delete your NEXORA builder account? This cannot be undone.')) {
                        toast.error('Deletion cancelled. Please contact support@nexora.network for security hold removal.');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
