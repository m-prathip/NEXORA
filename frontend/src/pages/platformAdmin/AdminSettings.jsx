import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import {
  FiSettings,
  FiShield,
  FiSave,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/common/Spinner';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    requireEmailVerification: true,
    maxDailyConnectionRequests: 50,
    enableAIProfileAssistance: true,
    allowDirectMessagesWithoutConnection: false,
    autoFlagReportsThreshold: 3
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSettings();
      setSettings(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success('Platform security & moderation parameters saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update platform settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <FiSettings className="text-primary-600" /> Platform Trust, Safety & System Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Adjust platform-wide safety thresholds, anti-spam heuristics, and verification requirements.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Security & Verification Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiShield className="text-primary-500" /> User Verification & Spam Safeguards
            </h2>

            <div className="space-y-4">
              {/* Require Email Verification */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    Mandatory Email Verification
                  </div>
                  <div className="text-xs text-slate-500">
                    Require builders to verify email via single-use link or code before publishing posts or portfolio sections.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireEmailVerification}
                  onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                />
              </div>

              {/* Max Daily Connection Requests */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    Max Connection Requests per Day
                  </div>
                  <div className="text-xs text-slate-500">
                    Anti-spam rate limit per user account every 24 hours.
                  </div>
                </div>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={settings.maxDailyConnectionRequests}
                  onChange={(e) => setSettings({ ...settings, maxDailyConnectionRequests: parseInt(e.target.value, 10) || 50 })}
                  className="w-24 px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Auto Flag Report Threshold */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    Automatic Flagging Report Threshold
                  </div>
                  <div className="text-xs text-slate-500">
                    Number of independent student reports required to automatically hide a post for review.
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.autoFlagReportsThreshold}
                  onChange={(e) => setSettings({ ...settings, autoFlagReportsThreshold: parseInt(e.target.value, 10) || 3 })}
                  className="w-24 px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Allow Direct Messages Without Connection */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    Allow Direct Messages Without Prior Connection
                  </div>
                  <div className="text-xs text-slate-500">
                    Permit 1-on-1 direct messaging between non-connected builders who are both active students.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowDirectMessagesWithoutConnection}
                  onChange={(e) => setSettings({ ...settings, allowDirectMessagesWithoutConnection: e.target.checked })}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* AI Features Governance */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              AI Intelligence Governance (Gemini 2.5)
            </h2>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  Enable AI Career Assistant & Profile Polishing
                </div>
                <div className="text-xs text-slate-500">
                  Allow students to generate professional summaries and improve headlines via backend Gemini integration.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAIProfileAssistance}
                onChange={(e) => setSettings({ ...settings, enableAIProfileAssistance: e.target.checked })}
                className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold shadow-md disabled:opacity-50"
            >
              <FiSave size={16} />
              <span>{saving ? 'Saving System Changes…' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
