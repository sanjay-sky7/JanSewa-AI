/**
 * Axios API client — central HTTP layer.
 */
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ||"";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});



// ── Interceptor: attach JWT ────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jansewa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor: handle 401 ────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jansewa_token');
      localStorage.removeItem('jansewa_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

// ── Complaints ──────────────────────────────────────────
export const complaintsAPI = {
  create: (data) => api.post('/complaints', data),
  categories: () => api.get('/complaints/categories'),
  list: (params) => api.get('/complaints', { params }),
  myNotifications: (params) => api.get('/complaints/citizen/notifications', { params }),
  markNotificationsSeen: () => api.post('/complaints/citizen/notifications/mark-seen'),
  get: (id) => api.get(`/complaints/${id}`),
  latestFeedback: (id) => api.get(`/complaints/${id}/feedback`),
  priorityQueue: (params) => api.get('/complaints/priority-queue', { params }),
  stats: () => api.get('/complaints/stats'),
  byWard: (wardId, params) => api.get(`/complaints/ward/${wardId}`, { params }),
  assign: (id, data) => api.put(`/complaints/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),
};

// ── Verification ────────────────────────────────────────
export const verificationAPI = {
  submit: (complaintId, data) => api.post(`/verification/${complaintId}`, data),
  get: (complaintId) => api.get(`/verification/${complaintId}`),
  approve: (verificationId, data) => api.post(`/verification/${verificationId}/approve`, data),
};

// ── Social Media ────────────────────────────────────────
export const socialAPI = {
  feed: (params) => api.get('/social/feed', { params }),
  sentiment: () => api.get('/social/sentiment'),
  alerts: () => api.get('/social/alerts'),
  scan: () => api.post('/social/scan'),
};

// ── Communications ──────────────────────────────────────
export const communicationsAPI = {
  generate: (data) => api.post('/communications/generate', data),
  list: (params) => api.get('/communications', { params }),
  approve: (id) => api.put(`/communications/${id}/approve`),
  publish: (id) => api.post(`/communications/${id}/publish`),
};

// ── Dashboard ───────────────────────────────────────────
export const dashboardAPI = {
  overview: () => api.get('/dashboard/overview'),
  wardHeatmap: () => api.get('/dashboard/ward-heatmap'),
  sentimentTrend: (days) => api.get('/dashboard/sentiment-trend', { params: { days } }),
  trustScores: () => api.get('/dashboard/trust-scores'),
};

// ── Public Portal ───────────────────────────────────────
export const publicAPI = {
  wardMap: () => api.get('/public/wards/map'),
  wardScorecard: (wardId) => api.get(`/public/ward/${wardId}/scorecard`),
  recentActions: (wardId) => api.get(`/public/ward/${wardId}/actions`),
  wardTrust: (wardId) => api.get(`/public/ward/${wardId}/trust`),
  submitComplaint: (data) => api.post('/public/complaint', data),
  helpCenter: (params) => api.get('/public/help-center', { params }),
};

export default api;
