import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiShield,
  FiServer,
  FiUsers,
  FiActivity,
  FiLock,
  FiAlertTriangle,
  FiSettings,
  FiRefreshCw,
  FiCheckCircle,
  FiSlash,
  FiDatabase,
  FiCpu,
  FiExternalLink,
  FiKey
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { ownerAPI } from '../../services/api';
import { PageLoader, Spinner } from '../../components/common/Spinner';

const TABS = [
  { id: 'overview', name: 'Platform Vitals', icon: FiActivity },
  { id: 'health', name: 'System & DB Health', icon: FiServer },
  { id: 'staff', name: 'Admin & Moderator Governance', icon: FiUsers },
  { id: 'security', name: 'Security & Threat Forensics', icon: FiShield },
  { id: 'settings', name: 'Global Platform Settings', icon: FiSettings }
];

const OwnerControlDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [staffData, setStaffData] = useState([]);
  const [securityData, setSecurityData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);

  // Modal & Re-Auth states
  const [reauthModal, setReauthModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    actionType: '',
    targetId: null,
    payload: null
  });
  const [adminPassword, setAdminPassword] = useState('');
  const [submittingReauth, setSubmittingReauth] = useState(false);

  // Fetch initial telemetry
  const loadData = async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, healthRes, staffRes, securityRes, settingsRes] = await Promise.all([
        ownerAPI.getOverview().catch(() => ({ data: null })),
        ownerAPI.getSystemHealth().catch(() => ({ data: null })),
        ownerAPI.getAdministrators().catch(() => ({ data: { administrators: [] } })),
        ownerAPI.getSecurityMonitoring().catch(() => ({ data: null })),
        ownerAPI.getPlatformSettings().catch(() => ({ data: { settings: {} } }))
      ]);

      if (overviewRes.data) setOverviewData(overviewRes.data);
      if (healthRes.data) setHealthData(healthRes.data);
      if (staffRes.data?.administrators) setStaffData(staffRes.data.administrators);
      if (securityRes.data) setSecurityData(securityRes.data);
      if (settingsRes.data?.settings) setSettingsData(settingsRes.data.settings);
    } catch (err) {
      toast.error('Failed to load Super Admin metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle critical action confirmation
  const handleConfirmReauth = async (e) => {
    e.preventDefault();
    if (!adminPassword) {
      toast.error('Password is required for confirmation');
      return;
    }

    setSubmittingReauth(true);
    try {
      if (reauthModal.actionType === 'REVOKE_STAFF') {
        await ownerAPI.revokeAdministrator(reauthModal.targetId, {
          adminPassword,
          reason: reauthModal.payload?.reason || 'Revocation by Platform Owner'
        });
        toast.success('Administrator privileges revoked and sessions terminated');
      } else if (reauthModal.actionType === 'UPDATE_ROLE') {
        await ownerAPI.assignRole(reauthModal.targetId, {
          role: reauthModal.payload.role,
          adminPassword,
          reason: 'Role updated from Developer Console'
        });
        toast.success(`Role updated to ${reauthModal.payload.role}`);
      } else if (reauthModal.actionType === 'UPDATE_SETTINGS') {
        await ownerAPI.updatePlatformSettings({
          ...reauthModal.payload,
          adminPassword
        });
        toast.success('Platform configuration saved successfully');
      }

      setReauthModal({ isOpen: false, title: '', description: '', actionType: '', targetId: null, payload: null });
      setAdminPassword('');
      loadData(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed: Authentication verification error';
      toast.error(msg);
    } finally {
      setSubmittingReauth(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 👑 Sovereign Developer Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-amber-500/30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-white">NEXORA</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                Developer Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">Sovereign Platform Owner Control Console</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition border border-slate-700/60"
            title="Refresh Real-Time Telemetry"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <Link
            to="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition border border-slate-700"
          >
            <span>Admin Center</span>
            <FiExternalLink size={13} />
          </Link>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition border border-amber-500/30"
          >
            <span>Exit to App</span>
            <FiExternalLink size={13} />
          </Link>

          <div className="pl-3 border-l border-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-xs">
              {user?.username?.[0]?.toUpperCase() || 'O'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-white">@{user?.username}</p>
              <p className="text-[10px] text-amber-400 font-mono">SUPER_ADMIN</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 flex overflow-x-auto gap-2 py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* ── TAB 1: Platform Overview ────────────────────────────────────────── */}
        {activeTab === 'overview' && overviewData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-xs text-slate-400 font-medium">Total Registered Builders</span>
                <p className="text-2xl font-black text-white mt-1">{overviewData.counts.users.total}</p>
                <span className="text-[11px] text-emerald-400 mt-1 inline-block">
                  ✓ {overviewData.counts.users.verified} Verified Accounts
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-xs text-slate-400 font-medium">Active Communities</span>
                <p className="text-2xl font-black text-white mt-1">{overviewData.counts.communities.total}</p>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">Student Chapters</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-xs text-slate-400 font-medium">Pending Trust & Safety</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{overviewData.counts.reports.pending}</p>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">
                  {overviewData.counts.reports.total} Total Reports
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                <span className="text-xs text-slate-400 font-medium">Platform Opportunities</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">{overviewData.counts.opportunities.total}</p>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">Jobs & Hackathons</span>
              </div>
            </div>

            {/* Staff Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <FiUsers className="text-amber-400" />
                <span>Privileged Staff Distribution</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30">
                  <span className="text-xs text-purple-300 font-semibold uppercase">Super Admins</span>
                  <p className="text-xl font-bold text-white mt-1">{overviewData.counts.staff.superAdmins}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Platform Sovereign Owners</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30">
                  <span className="text-xs text-blue-300 font-semibold uppercase">Administrators</span>
                  <p className="text-xl font-bold text-white mt-1">{overviewData.counts.staff.admins}</p>
                  <p className="text-[11px] text-slate-400 mt-1">User & Community Governance</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
                  <span className="text-xs text-emerald-300 font-semibold uppercase">Moderators</span>
                  <p className="text-xl font-bold text-white mt-1">{overviewData.counts.staff.moderators}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Content & Report Triage</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: System & DB Health ───────────────────────────────────────── */}
        {activeTab === 'health' && healthData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Process Vitals */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <FiCpu className="text-amber-400" />
                  <span>Node.js Process Telemetry</span>
                </h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <dt className="text-slate-400">Node Runtime Version</dt>
                    <dd className="font-mono text-white">{healthData.process.nodeVersion}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <dt className="text-slate-400">Process PID</dt>
                    <dd className="font-mono text-white">{healthData.process.pid}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <dt className="text-slate-400">Platform & Architecture</dt>
                    <dd className="font-mono text-white">{healthData.process.platform} ({healthData.process.arch})</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <dt className="text-slate-400">Server Continuous Uptime</dt>
                    <dd className="font-mono text-emerald-400 font-semibold">{healthData.process.uptimeFormatted}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <dt className="text-slate-400">V8 Heap Used / Total</dt>
                    <dd className="font-mono text-white">
                      {healthData.process.memoryMb.heapUsed} MB / {healthData.process.memoryMb.heapTotal} MB
                    </dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-slate-400">Resident Set Size (RSS)</dt>
                    <dd className="font-mono text-white">{healthData.process.memoryMb.rss} MB</dd>
                  </div>
                </dl>
              </div>

              {/* Database State */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <FiDatabase className="text-emerald-400" />
                  <span>MongoDB Connection & Collections</span>
                </h3>
                <div className="flex items-center gap-2 mb-4 p-3 bg-slate-950 rounded-xl border border-emerald-500/20">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400">
                    Status: {healthData.database.state} ({healthData.database.name})
                  </span>
                </div>
                <div className="space-y-2">
                  {healthData.database.collections.map((col) => (
                    <div key={col.name} className="flex justify-between text-xs py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">{col.name} Collection</span>
                      <span className="font-mono font-semibold text-slate-200">{col.count} documents</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: Staff Governance & Emergency Revocation ──────────────────── */}
        {activeTab === 'staff' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FiUsers className="text-amber-400" />
                  <span>Administrator & Moderator Roster</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage privileged personnel. Demoting an administrator terminates all active sessions across all devices.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Emergency Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {staffData.map((staff) => {
                    const isSelf = staff.username === user?.username;
                    return (
                      <tr key={staff._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-white">@{staff.username}</p>
                          <p className="text-slate-400 text-[11px]">{staff.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border ${
                            staff.role === 'SUPER_ADMIN'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                              : staff.role === 'ADMIN'
                              ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <FiCheckCircle size={12} />
                            <span>Active</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(staff.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {!isSelf && (
                            <button
                              onClick={() => {
                                setReauthModal({
                                  isOpen: true,
                                  title: `Revoke Privileges for @${staff.username}`,
                                  description: `This will immediately demote @${staff.username} to standard USER, revoke all access tokens, and terminate their active sessions across all devices.`,
                                  actionType: 'REVOKE_STAFF',
                                  targetId: staff._id,
                                  payload: { username: staff.username }
                                });
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-950/50 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition"
                            >
                              Revoke Access
                            </button>
                          )}
                          {isSelf && (
                            <span className="text-slate-500 italic text-[11px]">Primary Owner</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: Security & Threat Forensics ──────────────────────────────── */}
        {activeTab === 'security' && securityData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">Active Suspensions</span>
                <p className="text-2xl font-bold text-amber-400 mt-1">{securityData.activeSuspensions}</p>
                <p className="text-[11px] text-slate-500 mt-1">Enforced by Trust & Safety</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">Locked Accounts</span>
                <p className="text-2xl font-bold text-red-400 mt-1">{securityData.lockedAccounts}</p>
                <p className="text-[11px] text-slate-500 mt-1">Pending Investigation</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <FiShield className="text-red-400" />
                <span>Recent Threat & Access Control Telemetry</span>
              </h3>
              <div className="space-y-2.5">
                {securityData.recentAlerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-4 text-xs"
                  >
                    <div>
                      <span className="font-mono text-amber-400 font-bold">{alert.action}</span>
                      <p className="text-slate-300 mt-0.5">{alert.reason || 'Security event logged'}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Actor: @{alert.actor?.username || 'ANONYMOUS'} ({alert.actorRole || 'UNAUTH'}) • IP: {alert.ip || 'Local'}
                      </p>
                    </div>
                    <span className="text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: Global Platform Settings ─────────────────────────────────── */}
        {activeTab === 'settings' && settingsData && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FiSettings className="text-amber-400" />
              <span>Global Sovereign Parameters</span>
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setReauthModal({
                  isOpen: true,
                  title: 'Save Global Platform Settings',
                  description: 'Modifying platform parameters affects all registered users and API behavior. Please confirm your password.',
                  actionType: 'UPDATE_SETTINGS',
                  targetId: null,
                  payload: settingsData
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <p className="font-bold text-white">Maintenance Mode</p>
                  <p className="text-slate-400">Lock non-admin traffic for system upgrades</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settingsData.maintenanceMode)}
                  onChange={(e) => setSettingsData({ ...settingsData, maintenanceMode: e.target.checked })}
                  className="w-5 h-5 accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <p className="font-bold text-white">Public Registration</p>
                  <p className="text-slate-400">Allow new students to register accounts</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsData.allowPublicRegistration !== false}
                  onChange={(e) => setSettingsData({ ...settingsData, allowPublicRegistration: e.target.checked })}
                  className="w-5 h-5 accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <p className="font-bold text-white">AI Profile Assistance</p>
                  <p className="text-slate-400">Enable Gemini AI profile enhancement</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settingsData.enableAIProfileAssistance)}
                  onChange={(e) => setSettingsData({ ...settingsData, enableAIProfileAssistance: e.target.checked })}
                  className="w-5 h-5 accent-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="block font-bold text-white mb-1">Auto-Flag Report Threshold</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settingsData.autoFlagReportsThreshold || 3}
                  onChange={(e) => setSettingsData({ ...settingsData, autoFlagReportsThreshold: parseInt(e.target.value, 10) || 3 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold rounded-xl hover:opacity-90 transition shadow-lg"
              >
                Save Configuration
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 🔐 Re-Authentication Modal */}
      {reauthModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <FiKey size={20} />
              </div>
              <h3 className="text-base font-bold text-white">{reauthModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">{reauthModal.description}</p>

            <form onSubmit={handleConfirmReauth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Super Admin Password Confirmation
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your current password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReauthModal({ isOpen: false, title: '', description: '', actionType: '', targetId: null, payload: null });
                    setAdminPassword('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReauth}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-2"
                >
                  {submittingReauth && <Spinner size="sm" />}
                  <span>Confirm Operation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerControlDashboard;
