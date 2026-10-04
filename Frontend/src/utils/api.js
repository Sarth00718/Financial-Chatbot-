/**
 * API Client
 * Handles all HTTP requests to the backend
 */

import axios from 'axios';

const DEFAULT_API_BASE = '/api/v1';

const normalizeUrl = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_BASE;
// BACKEND_ORIGIN: used for Socket.IO direct WS connection (bypasses Vite proxy)
const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || normalizeUrl(import.meta.env.VITE_API_URL) || '';
const googleAuthUrl = backendOrigin ? `${backendOrigin}/api/v1/auth/google` : '/api/v1/auth/google';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for authentication
  timeout: 10000, // 10 second timeout
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    // Skip refresh for auth endpoints and if skipRefresh flag is set
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.skipRefresh &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      originalRequest._retry = true;

      try {
        // Try to refresh the access token
        await api.post('/auth/refresh');
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - only redirect if not on public pages
        const publicPaths = ['/login', '/register'];
        const currentPath = window.location.pathname;
        
        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTHENTICATION API
// ============================================

export const authAPI = {
  // Register new user
  register: (data) => api.post('/auth/register', data),

  // Login user
  login: (data) => api.post('/auth/login', data),

  // Logout user
  logout: () => api.post('/auth/logout'),

  // Get current user profile
  getProfile: (config = {}) => api.get('/auth/me', config),

  // Update user profile
  updateProfile: (data) => api.patch('/auth/profile', data),

  // Change password
  changePassword: (data) => api.post('/auth/change-password', data),

  // Refresh access token
  refreshToken: () => api.post('/auth/refresh'),
};

// ============================================
// CONVERSATION API
// ============================================

export const BACKEND_ORIGIN = backendOrigin;
export const GOOGLE_AUTH_URL = googleAuthUrl;

export const conversationAPI = {
  // Get all conversations
  getAll: () => api.get('/conversations'),

  // Search conversations
  search: (query, params = {}) => 
    api.get('/conversations/search', { params: { q: query, ...params } }),

  // Get single conversation with messages
  getById: (id) => api.get(`/conversations/${id}`),

  // Create new conversation
  create: (data = {}) => api.post('/conversations', data),

  // Update conversation
  update: (id, data) => api.patch(`/conversations/${id}`, data),

  // Delete conversation
  delete: (id) => api.delete(`/conversations/${id}`),

  // Send message
  sendMessage: (id, content) =>
    api.post(`/conversations/${id}/messages`, { content }),
};

// ============================================
// DOCUMENT API
// ============================================

export const documentAPI = {
  // Upload documents
  upload: (conversationId, files) => {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    
    // Append each file
    files.forEach((file) => {
      formData.append('documents', file);
    });

    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get documents for a conversation
  getByConversation: (conversationId) =>
    api.get(`/documents/conversation/${conversationId}`),

  // Delete document
  delete: (id) => api.delete(`/documents/${id}`),
};

// ============================================
// MESSAGE API
// ============================================

export const messageAPI = {
  // Update message
  update: (messageId, content) =>
    api.patch(`/messages/${messageId}`, { content }),

  // Delete message
  delete: (messageId) => api.delete(`/messages/${messageId}`),

  // Edit message and regenerate AI response
  editAndRegenerate: (messageId, content) =>
    api.post(`/messages/${messageId}/regenerate`, { content }),
};

// ============================================
// ANALYTICS API
// ============================================

export const analyticsAPI = {
  // Get user analytics
  getUserAnalytics: () => api.get('/analytics/user'),

  // Get admin analytics
  getAdminAnalytics: () => api.get('/analytics/admin'),

  // Export analytics
  exportAnalytics: (format = 'json') =>
    api.get('/analytics/export', { 
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json'
    }),
};

// ============================================
// ADMIN API
// ============================================

export const adminAPI = {
  // Get dashboard statistics
  getStatistics: () => api.get('/admin/statistics'),

  // Get all users
  getUsers: (params) => api.get('/admin/users', { params }),

  // Get user details
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),

  // Update user role
  updateUserRole: (userId, role) =>
    api.patch(`/admin/users/${userId}/role`, { role }),

  // Block/unblock user
  toggleUserStatus: (userId, isActive) =>
    api.patch(`/admin/users/${userId}/status`, { isActive }),

  // Delete user
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  // Get system logs
  getLogs: (params) => api.get('/admin/logs', { params }),

  // Get system health
  getHealth: () => api.get('/admin/health'),
};

// ============================================
// ENTERPRISE API
// ============================================

export const enterpriseAPI = {
  getAnalysisTypes: () => api.get('/enterprise/analysis-types'),

  analyze: (data) => api.post('/enterprise/analyze', data, { timeout: 90000 }),

  getCharts: (data) => api.post('/enterprise/charts', data, { timeout: 90000 }),

  getAuditSummary: (data) => api.post('/enterprise/audit-summary', data, { timeout: 90000 }),

  advancedSearch: (q, type = 'all') =>
    api.get('/enterprise/search', { params: { q, type } }),


};

// Export default api instance for custom requests
export default api;
