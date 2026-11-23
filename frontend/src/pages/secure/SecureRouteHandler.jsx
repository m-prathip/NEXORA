import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiShield, FiAlertTriangle, FiClock, FiLock, FiCheckCircle, FiArrowRight, FiSlash } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { secureRouteAPI } from '../../services/api';
import { PageLoader, Spinner } from '../../components/common/Spinner';

// Lazy-load sensitive destination components
const AdminDashboardLayout = lazy(() => import('../../components/admin/AdminDashboardLayout'));
const PlatformAdminOverview = lazy(() => import('../platformAdmin/AdminOverview'));
const PlatformAdminUsers = lazy(() => import('../platformAdmin/AdminUsers'));
const PlatformAdminPosts = lazy(() => import('../platformAdmin/AdminPosts'));
const PlatformAdminCommunities = lazy(() => import('../platformAdmin/AdminCommunities'));
const PlatformAdminReports = lazy(() => import('../platformAdmin/AdminReports'));
const PlatformAdminOpportunities = lazy(() => import('../platformAdmin/AdminOpportunities'));
const PlatformAdminAnalytics = lazy(() => import('../platformAdmin/AdminAnalytics'));
const PlatformAdminAuditLogs = lazy(() => import('../platformAdmin/AdminAuditLogs'));
const PlatformAdminSettings = lazy(() => import('../platformAdmin/AdminSettings'));
const Settings = lazy(() => import('../settings/Settings'));
const AdminProfile = lazy(() => import('../admin/Profile'));
const ProjectHub = lazy(() => import('../projects/ProjectHub'));
const ProjectShowcase = lazy(() => import('../projects/ProjectShowcase'));

// Route mapping registry
const COMPONENT_MAP = {
  'admin_overview': PlatformAdminOverview,
  'admin_users': PlatformAdminUsers,
  'admin_posts': PlatformAdminPosts,
  'admin_communities': PlatformAdminCommunities,
  'admin_reports': PlatformAdminReports,
  'admin_opportunities': PlatformAdminOpportunities,
  'admin_analytics': PlatformAdminAnalytics,
  'admin_audit_logs': PlatformAdminAuditLogs,
  'admin_settings': PlatformAdminSettings,
  'user_settings': Settings,
  'user_dashboard': AdminProfile,
  'project_hub': ProjectHub,
  'private_project': ProjectShowcase,
  'vault_documents': ProjectHub
};

const SecureRouteHandler = () => {
  const { encryptedToken } = useParams();
  const { isAuth, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const resolveSecureRoute = async () => {
      if (authLoading) return;

      if (!isAuth) {
        // Redirect to login preserving the encrypted token in navigation state
        navigate('/auth/login', {
          replace: true,
          state: { from: { pathname: `/secure/${encryptedToken}` } }
        });
        return;
      }

      setLoading(true);
      setErrorInfo(null);

      try {
        const { data } = await secureRouteAPI.decryptToken(encryptedToken);
        if (isMounted) {
          if (data && data.success) {
            setRouteInfo(data);
          } else {
            setErrorInfo({
              code: data?.code || 'INVALID_TOKEN',
              message: data?.message || 'Unable to decrypt route token'
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          const res = err.response?.data;
          setErrorInfo({
            code: res?.code || 'DECRYPTION_ERROR',
            message: res?.message || 'Secure link validation failed. Token may be invalid or tampered with.',
            status: err.response?.status || 500
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    resolveSecureRoute();

    return () => {
      isMounted = false;
    };
  }, [encryptedToken, isAuth, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="p-4 bg-primary-50 dark:bg-primary-950/40 rounded-2xl mb-4 border border-primary-200/50 dark:border-primary-800/40 animate-pulse">
            <FiLock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Verifying Encrypted Route
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Performing AES-256-GCM authentication tag verification and server-side authorization checks...
          </p>
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  // Handle Validation and Authorization Errors
  if (errorInfo) {
    const isExpired = errorInfo.code === 'TOKEN_EXPIRED';
    const isRevoked = errorInfo.code === 'TOKEN_REVOKED';
    const isReplayed = errorInfo.code === 'TOKEN_ALREADY_USED';
    const isForbidden = errorInfo.code === 'INSUFFICIENT_PRIVILEGES' || errorInfo.code === 'FORBIDDEN_RESOURCE';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xl p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400">
            {isExpired ? (
              <FiClock className="w-7 h-7" />
            ) : isRevoked ? (
              <FiSlash className="w-7 h-7" />
            ) : isForbidden ? (
              <FiLock className="w-7 h-7" />
            ) : (
              <FiAlertTriangle className="w-7 h-7" />
            )}
          </div>

          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 mb-3">
            {errorInfo.code}
          </span>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isExpired
              ? 'Secure Link Expired'
              : isRevoked
              ? 'Secure Link Revoked'
              : isReplayed
              ? 'Single-Use Link Already Consumed'
              : isForbidden
              ? 'Access Prohibited'
              : 'Invalid Encrypted Link'}
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {errorInfo.message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Return to Dashboard
            </Link>
            <Link
              to="/feed"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Explore Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Authorized Destination Component In-Place
  const TargetComponent = COMPONENT_MAP[routeInfo?.routeId] || PlatformAdminOverview;
  const isPlatformAdmin = routeInfo?.routeId?.startsWith('admin_');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Encrypted Route Security Bar (indicates AES-256-GCM verification active) */}
      <div className="bg-emerald-600/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <FiShield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="font-semibold tracking-wide">
            AES-256-GCM Authenticated Route
          </span>
          <span className="hidden sm:inline text-emerald-600/80 dark:text-emerald-400/80">
            • Route ID: <code className="font-mono bg-emerald-500/10 px-1 py-0.5 rounded">{routeInfo.routeId}</code>
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-800/80 dark:text-emerald-200/80">
          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Integrity Verified</span>
        </div>
      </div>

      {/* Render Component */}
      <Suspense fallback={<PageLoader />}>
        {isPlatformAdmin ? (
          <AdminDashboardLayout>
            <TargetComponent />
          </AdminDashboardLayout>
        ) : (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <TargetComponent />
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default SecureRouteHandler;
