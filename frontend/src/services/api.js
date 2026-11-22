import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || 'https://student-portfolio-ckpc.onrender.com';

// ── Access token lives in MEMORY only ──────────────────
// The audit flagged storing the JWT in localStorage (XSS-stealable).
// The long-lived session now lives in an httpOnly refresh cookie; the
// short-lived (15m) access token is kept in a module variable and
// silently refreshed on 401. A reload simply calls /auth/refresh.
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send/receive the refresh cookie
  timeout: 10000 // 10 second timeout
});

// Bare client for refresh (avoids the interceptor loop below).
const refreshClient = axios.create({ baseURL: `${BASE_URL}/api`, withCredentials: true });

// Simple memory cache for GET requests (1-minute TTL)
const apiCache = new Map();

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  if (config.method === 'get') {
    const key = config.url;
    if (apiCache.has(key)) {
      const cached = apiCache.get(key);
      if (Date.now() - cached.timestamp < 60000) {
        config.adapter = () => Promise.resolve({ data: cached.data, status: 200, statusText: 'OK', headers: {}, config, request: {} });
      }
    }
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On 401, try a single silent refresh, then replay the original request.
let refreshing = null;
api.interceptors.response.use(
  (res) => {
    if (res.config.method === 'get') {
      apiCache.set(res.config.url, { data: res.data, timestamp: Date.now() });
    } else if (['post', 'put', 'patch', 'delete'].includes(res.config.method)) {
      apiCache.clear();
    }
    return res;
  },
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    const isAuthCall = original?.url?.includes('/auth/login') ||
                       original?.url?.includes('/auth/refresh') ||
                       original?.url?.includes('/auth/register');

    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing = refreshing || refreshClient.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        setAccessToken(data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        setAccessToken(null);
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/auth/login' && 
            !window.location.pathname.startsWith('/u/')) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

// We don't manually set multipart/form-data because it drops the boundary.
// The interceptor deletes Content-Type for FormData, letting the browser set it.
const mp = {};

// ── Auth ────────────────────────────────────────────────
export const authAPI = {
  register: (d) => api.post('/auth/register', d),
  verifyEmail: (d) => api.post('/auth/verify-email', d),
  resendOtp: (d) => api.post('/auth/resend-otp', d),
  login: (d) => api.post('/auth/login', d),
  refresh: () => refreshClient.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
  verifyResetOtp: (d) => api.post('/auth/verify-reset-otp', d),
  resetPassword: (d) => api.post('/auth/reset-password', d),
  verify: () => api.get('/auth/verify'),
  activity: () => api.get('/auth/activity'),
  checkUsername: (u) => api.get(`/auth/check-username/${encodeURIComponent(u)}`)
};

// ── Content resources (unchanged) ───────────────────────
export const profileAPI = {
  getMine: () => api.get('/profile/me'),
  updateMine: (d) => api.put('/profile/me', d, mp),
  onboard: (d) => api.post('/profile/onboard', d, mp),
  updatePrivacy: (d) => api.put('/profile/privacy', d),
  getPublic: (u) => api.get(`/profile/public/${u}`)
};

// ── NEXORA Networking API ───────────────────────────────
export const networkAPI = {
  sendRequest: (userId, d = {}) => api.post(`/network/connect/${userId}`, d),
  respondRequest: (requestId, action) => api.patch(`/network/requests/${requestId}`, { action }),
  getRequests: () => api.get('/network/requests'),
  getConnections: () => api.get('/network/connections'),
  getMutual: (userId) => api.get(`/network/mutual/${userId}`),
  toggleFollow: (userId) => api.post(`/network/follow/${userId}`),
  getSuggested: () => api.get('/network/suggested'),
  search: (params) => api.get('/network/search', { params }),
  discover: (params) => api.get('/network/discover', { params })
};

// ── NEXORA Social Feed & Posts API ───────────────────────
export const postsAPI = {
  getFeed: (params) => api.get('/posts', { params }),
  getById: (id) => api.get(`/posts/${id}`),
  create: (d) => api.post('/posts', d, mp),
  update: (id, d) => api.put(`/posts/${id}`, d, mp),
  delete: (id) => api.delete(`/posts/${id}`),
  react: (id, type) => api.post(`/posts/${id}/react`, { type }),
  toggleBookmark: (id) => api.post(`/posts/${id}/bookmark`),
  getBookmarks: () => api.get('/posts/bookmarks'),
  getComments: (id) => api.get(`/posts/${id}/comments`),
  addComment: (id, d) => api.post(`/posts/${id}/comments`, d),
  deleteComment: (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`),
  getTrendingHashtags: () => api.get('/posts/trending/hashtags')
};

// ── NEXORA Communities API ──────────────────────────────
export const communitiesAPI = {
  getAll: (params) => api.get('/communities', { params }),
  getBySlug: (slug) => api.get(`/communities/${slug}`),
  create: (d) => api.post('/communities', d),
  update: (id, d) => api.put(`/communities/${id}`, d),
  toggleJoin: (communityId) => api.post(`/communities/${communityId}/join`),
  getMembers: (communityId, params) => api.get(`/communities/${communityId}/members`, { params }),
  updateMemberRole: (communityId, memberId, d) => api.patch(`/communities/${communityId}/members/${memberId}`, d),
  getPosts: (communityId, params) => api.get(`/communities/${communityId}/posts`, { params }),
  report: (communityId, d) => api.post(`/communities/${communityId}/report`, d)
};

// ── NEXORA Collaboration / "Find My Teammate" API ────────
export const collabAPI = {
  getAll: (params) => api.get('/collaborations', { params }),
  getById: (id) => api.get(`/collaborations/${id}`),
  create: (d) => api.post('/collaborations', d, mp),
  update: (id, d) => api.put(`/collaborations/${id}`, d, mp),
  delete: (id) => api.delete(`/collaborations/${id}`),
  apply: (collabId, d) => api.post(`/collaborations/${collabId}/apply`, d),
  respond: (collabId, appId, action) => api.patch(`/collaborations/${collabId}/applications/${appId}`, { action }),
  getMyApplications: () => api.get('/collaborations/my/applications'),
  matchTeammates: (params) => api.get('/collaborations/teammates/match', { params }),
  report: (collabId, d) => api.post(`/collaborations/${collabId}/report`, d)
};

// ── NEXORA Content Reporting API ─────────────────────────
export const reportsAPI = {
  submit: (d) => api.post('/reports', d),
  getAll: (params) => api.get('/reports', { params }),
  resolve: (id, d) => api.patch(`/reports/${id}/resolve`, d),
  assign: (id, moderatorId) => api.patch(`/reports/${id}/assign`, { moderatorId })
};

// ── NEXORA Email Verification API ─────────────────────────
export const verificationAPI = {
  verifyLink: (token) => api.post('/verification/verify', { token }),
  resend: (email) => api.post('/verification/resend', { email }),
  getStatus: (email) => api.get('/verification/status', { params: { email } })
};

// ── NEXORA User Blocking API ─────────────────────────────
export const blocksAPI = {
  block: (userId, reason = '') => api.post(`/blocks/${userId}`, { reason }),
  unblock: (userId) => api.delete(`/blocks/${userId}`),
  getBlocked: () => api.get('/blocks')
};

// ── NEXORA Admin & Trust/Safety API ───────────────────────
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  suspendUser: (id, d) => api.patch(`/admin/users/${id}/suspend`, d),
  restoreUser: (id, d) => api.patch(`/admin/users/${id}/restore`, d),
  updateUserRole: (id, d) => api.patch(`/admin/users/${id}/role`, d),
  getPosts: (params) => api.get('/admin/posts', { params }),
  moderatePost: (id, d) => api.patch(`/admin/posts/${id}/moderate`, d),
  getCommunities: (params) => api.get('/admin/communities', { params }),
  moderateCommunity: (id, d) => api.patch(`/admin/communities/${id}/moderate`, d),
  getReports: (params) => api.get('/admin/reports', { params }),
  resolveReport: (id, d) => api.patch(`/admin/reports/${id}/resolve`, d),
  getOpportunities: (params) => api.get('/admin/opportunities', { params }),
  moderateOpportunity: (id, d) => api.patch(`/admin/opportunities/${id}/moderate`, d),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (d) => api.put('/admin/settings', d)
};

// ── NEXORA Opportunities API ─────────────────────────────
export const opportunitiesAPI = {
  getAll: (params) => api.get('/opportunities', { params }),
  create: (d) => api.post('/opportunities', d),
  toggleSave: (id) => api.post(`/opportunities/${id}/save`),
  track: (id, d) => api.post(`/opportunities/${id}/track`, d),
  apply: (id, d) => api.post(`/opportunities/${id}/track`, d),
  getMyTracked: () => api.get('/opportunities/my/tracked')
};

// ── NEXORA Events & Hackathons API ───────────────────────
export const eventsAPI = {
  getAll: (params) => api.get('/events', { params }),
  create: (d) => api.post('/events', d),
  rsvp: (id, status) => api.post(`/events/${id}/rsvp`, { status })
};

// ── NEXORA Notifications API ────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (notificationId) => api.patch('/notifications/read', { notificationId }),
  markAllRead: () => api.patch('/notifications/read-all'),
  markSingleRead: (id) => api.patch(`/notifications/${id}/read`)
};

// ── NEXORA Direct Messaging API ──────────────────────────
export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (conversationId) => api.get(`/messages/${conversationId}`),
  send: (d) => api.post('/messages', d),
  start: (recipientId) => api.post(`/messages/start/${recipientId}`)
};

// ── NEXORA Gemini AI Suite API ───────────────────────────
export const aiAPI = {
  profileImprove: () => api.post('/ai/profile-improve'),
  headlineSummary: () => api.post('/ai/headline-summary'),
  profileSummary: () => api.post('/ai/headline-summary'),
  projectDescription: (d) => api.post('/ai/project-description', d),
  polishPost: (draft, postType) => api.post('/ai/polish-post', { draft, postType }),
  skillSuggestions: (d) => api.post('/ai/skill-suggestions', d)
};
export const educationAPI = {
  getMine: () => api.get('/education/me'),
  getPublic: (u) => api.get(`/education/public/${u}`),
  create: (d) => api.post('/education', d),
  update: (id, d) => api.put(`/education/${id}`, d),
  delete: (id) => api.delete(`/education/${id}`)
};
export const experienceAPI = {
  getMine: () => api.get('/experience/me'),
  getPublic: (u) => api.get(`/experience/public/${u}`),
  create: (d) => api.post('/experience', d),
  update: (id, d) => api.put(`/experience/${id}`, d),
  delete: (id) => api.delete(`/experience/${id}`)
};
export const projectsAPI = {
  getMine: () => api.get('/projects/me'),
  getPublic: (u) => api.get(`/projects/public/${u}`),
  create: (d) => api.post('/projects', d, mp),
  update: (id, d) => api.put(`/projects/${id}`, d, mp),
  delete: (id) => api.delete(`/projects/${id}`)
};
export const skillsAPI = {
  getMine: () => api.get('/skills/me'),
  getPublic: (u) => api.get(`/skills/public/${u}`),
  create: (d) => api.post('/skills', d),
  update: (id, d) => api.put(`/skills/${id}`, d),
  delete: (id) => api.delete(`/skills/${id}`)
};
export const achievementsAPI = {
  getMine: () => api.get('/achievements/me'),
  getPublic: (u) => api.get(`/achievements/public/${u}`),
  create: (d) => api.post('/achievements', d),
  update: (id, d) => api.put(`/achievements/${id}`, d),
  delete: (id) => api.delete(`/achievements/${id}`)
};
export const activitiesAPI = {
  getMine: () => api.get('/activities/me'),
  getPublic: (u) => api.get(`/activities/public/${u}`),
  create: (d) => api.post('/activities', d),
  update: (id, d) => api.put(`/activities/${id}`, d),
  delete: (id) => api.delete(`/activities/${id}`)
};
export const certificatesAPI = {
  getMine: () => api.get('/certificates/me'),
  getPublic: (u) => api.get(`/certificates/public/${u}`),
  create: (d) => api.post('/certificates', d),
  update: (id, d) => api.put(`/certificates/${id}`, d),
  delete: (id) => api.delete(`/certificates/${id}`)
};
export const whyHireAPI = {
  getMine: () => api.get('/whyhire/me'),
  getPublic: (u) => api.get(`/whyhire/public/${u}`),
  create: (d) => api.post('/whyhire', d),
  update: (id, d) => api.put(`/whyhire/${id}`, d),
  delete: (id) => api.delete(`/whyhire/${id}`)
};
export const portfolioAPI = {
  getMyLink: () => api.get('/portfolio/me/link'),
  qrCodeUrl: (u) => `${BASE_URL}/api/portfolio/${encodeURIComponent(u)}/qrcode`,
  // public tracking (best-effort, never blocks the UI)
  contact: (u, d) => api.post(`/portfolio/${encodeURIComponent(u)}/contact`, d),
  ask: (u, d) => api.post(`/portfolio/${encodeURIComponent(u)}/assistant`, d)
};

// ── Public Portfolio Fetch with Retry (Cold-Start Resilience) ──
export const portfolioPublicAPI = {
  get: async (u, attempt = 1) => {
    const maxAttempts = 3;
    try {
      // Use a custom axios instance just for this call to increase the timeout to 25s
      const response = await axios.get(`${BASE_URL}/api/portfolio/public/${encodeURIComponent(u)}`, {
        timeout: 25000, 
        headers: { 'Content-Type': 'application/json' }
      });
      return response;
    } catch (error) {
      const isNetworkError = !error.response;
      const is5xxError = error.response && error.response.status >= 500;
      const isTimeout = error.code === 'ECONNABORTED';

      if ((isNetworkError || is5xxError || isTimeout) && attempt < maxAttempts) {
        // Exponential backoff: 2s, then 4s...
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
        console.warn(`Attempt ${attempt} failed for /public/${u}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return portfolioPublicAPI.get(u, attempt + 1);
      }
      throw error;
    }
  }
};



export default api;
