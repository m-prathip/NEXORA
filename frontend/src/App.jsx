import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { BackgroundProvider } from './context/BackgroundContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import { PageLoader } from './components/common/Spinner';

// Landing & General
const Landing = lazy(() => import('./pages/Landing'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

// NEXORA Platform App Layout & Core Modules
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const MainDashboard = lazy(() => import('./pages/dashboard/MainDashboard'));
const Feed = lazy(() => import('./pages/feed/Feed'));
const Network = lazy(() => import('./pages/network/Network'));
const Discover = lazy(() => import('./pages/discover/Discover'));
const Communities = lazy(() => import('./pages/communities/Communities'));
const ProjectShowcase = lazy(() => import('./pages/projects/ProjectShowcase'));
const ProjectHub = lazy(() => import('./pages/projects/ProjectHub'));
const Opportunities = lazy(() => import('./pages/opportunities/Opportunities'));
const Events = lazy(() => import('./pages/events/Events'));
const Messages = lazy(() => import('./pages/messages/Messages'));
const Notifications = lazy(() => import('./pages/notifications/Notifications'));
const BuilderProfile = lazy(() => import('./pages/profile/BuilderProfile'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const Onboarding = lazy(() => import('./pages/onboarding/Onboarding'));

// Public Portfolios
const PortfolioLayout = lazy(() => import('./pages/PortfolioLayout'));
const Home = lazy(() => import('./pages/Home'));
const Education = lazy(() => import('./pages/Education'));
const Projects = lazy(() => import('./pages/Projects'));
const Certificates = lazy(() => import('./pages/Certificates'));
const Experience = lazy(() => import('./pages/Experience'));
const Activities = lazy(() => import('./pages/Activities'));

// Auth Pages
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminSignup = lazy(() => import('./pages/admin/Signup'));
const VerifyEmail = lazy(() => import('./pages/admin/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/admin/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/admin/ResetPassword'));

// AES-256-GCM Encrypted Route Handler
const SecureRouteHandler = lazy(() => import('./pages/secure/SecureRouteHandler'));

// User Portfolio CMS Dashboard
const AdminLayout = lazy(() => import('./pages/admin/Dashboard'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const AdminShare = lazy(() => import('./pages/admin/Share'));

// NEXORA Platform Command Center & Administration
const AdminRoute = lazy(() => import('./components/admin/AdminRoute'));
const SuperAdminRoute = lazy(() => import('./components/admin/SuperAdminRoute'));
const OwnerControlDashboard = lazy(() => import('./pages/owner/OwnerControlDashboard'));
const AdminDashboardLayout = lazy(() => import('./components/admin/AdminDashboardLayout'));
const PlatformAdminOverview = lazy(() => import('./pages/platformAdmin/AdminOverview'));
const PlatformAdminUsers = lazy(() => import('./pages/platformAdmin/AdminUsers'));
const PlatformAdminPosts = lazy(() => import('./pages/platformAdmin/AdminPosts'));
const PlatformAdminCommunities = lazy(() => import('./pages/platformAdmin/AdminCommunities'));
const PlatformAdminReports = lazy(() => import('./pages/platformAdmin/AdminReports'));
const PlatformAdminOpportunities = lazy(() => import('./pages/platformAdmin/AdminOpportunities'));
const PlatformAdminAnalytics = lazy(() => import('./pages/platformAdmin/AdminAnalytics'));
const PlatformAdminAuditLogs = lazy(() => import('./pages/platformAdmin/AdminAuditLogs'));
const PlatformAdminSettings = lazy(() => import('./pages/platformAdmin/AdminSettings'));

const pick = (name) => lazy(() => import('./pages/admin/Sections').then((m) => ({ default: m[name] })));
const AdminEducation = pick('AdminEducation');
const AdminExperience = pick('AdminExperience');
const AdminSkills = pick('AdminSkills');
const AdminProjects = pick('AdminProjects');
const AdminAchievements = pick('AdminAchievements');
const AdminActivities = pick('AdminActivities');
const AdminCertificates = pick('AdminCertificates');
const AdminWhyHire = pick('AdminWhyHire');

const App = () => (
  <ThemeProvider>
    <BackgroundProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px' } }} />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Marketing Landing & Public Pages */}
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Authentication */}
              <Route path="/auth/login" element={<AdminLogin />} />
              <Route path="/auth/signup" element={<AdminSignup />} />
              <Route path="/auth/verify-email" element={<VerifyEmail />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              {/* AES-256-GCM Encrypted Generic Route */}
              <Route path="/secure/:encryptedToken" element={<SecureRouteHandler />} />

              {/* NEXORA Platform Core Modules (14 Navigation Views & Command Center) */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<MainDashboard />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/network" element={<Network />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/communities" element={<Communities />} />
                <Route path="/projects" element={<ProjectShowcase />} />
                <Route path="/projects/showcase" element={<ProjectShowcase />} />
                <Route path="/collaborations" element={<ProjectHub />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/events" element={<Events />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:conversationId" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/account/settings" element={<Navigate to="/settings" replace />} />
                <Route path="/profile" element={<Navigate to="/profile/me" replace />} />
                <Route path="/profile/me" element={<BuilderProfile />} />
                <Route path="/profile/:username" element={<BuilderProfile />} />
              </Route>

              <Route path="/app" element={<Navigate to="/feed" replace />} />

              {/* NEXORA Moderator Console */}
              <Route
                path="/moderator"
                element={
                  <AdminRoute allowedRoles={['MODERATOR', 'ADMIN', 'SUPER_ADMIN']}>
                    <AdminDashboardLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<PlatformAdminReports />} />
                <Route path="reports" element={<PlatformAdminReports />} />
                <Route path="content" element={<PlatformAdminPosts />} />
                <Route path="communities" element={<PlatformAdminCommunities />} />
              </Route>

              {/* NEXORA Platform Command Center & Administration */}
              <Route
                path="/admin"
                element={
                  <AdminRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                    <AdminDashboardLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<PlatformAdminOverview />} />
                <Route path="users" element={<PlatformAdminUsers />} />
                <Route path="posts" element={<PlatformAdminPosts />} />
                <Route path="communities" element={<PlatformAdminCommunities />} />
                <Route path="reports" element={<PlatformAdminReports />} />
                <Route path="opportunities" element={<PlatformAdminOpportunities />} />
                <Route path="analytics" element={<PlatformAdminAnalytics />} />
                <Route path="audit-logs" element={<PlatformAdminAuditLogs />} />
                <Route path="settings" element={<PlatformAdminSettings />} />
                {/* Super Admin specific paths */}
                <Route path="security" element={<PlatformAdminSettings />} />
                <Route path="roles" element={<PlatformAdminUsers />} />
                <Route path="administrators" element={<PlatformAdminUsers />} />
                <Route path="platform-settings" element={<PlatformAdminSettings />} />
              </Route>

              {/* Sovereign Developer Super Admin Console */}
              <Route
                path="/owner-control"
                element={
                  <SuperAdminRoute>
                    <OwnerControlDashboard />
                  </SuperAdminRoute>
                }
              />

              {/* Standalone 3D Public Portfolios */}
              <Route path="/u/:username" element={<PortfolioLayout />}>
                <Route index element={<Home />} />
                <Route path="education" element={<Education />} />
                <Route path="projects" element={<Projects />} />
                <Route path="certificates" element={<Certificates />} />
                <Route path="experience" element={<Experience />} />
                <Route path="activities" element={<Activities />} />
                <Route path="*" element={<Navigate to="." replace />} />
              </Route>

              {/* User Dashboard / Portfolio CMS */}
              <Route path="/:dashboardId" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="dashboard" element={<Navigate to="profile" replace />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="share" element={<AdminShare />} />
                <Route path="education" element={<AdminEducation />} />
                <Route path="experience" element={<AdminExperience />} />
                <Route path="skills" element={<AdminSkills />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="achievements" element={<AdminAchievements />} />
                <Route path="activities" element={<AdminActivities />} />
                <Route path="certificates" element={<AdminCertificates />} />
                <Route path="whyhire" element={<AdminWhyHire />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </BackgroundProvider>
  </ThemeProvider>
);

export default App;
