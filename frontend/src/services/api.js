import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;

if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

export const setAuthToken = (token) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    window.localStorage.setItem('token', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    window.localStorage.removeItem('token');
    delete api.defaults.headers.common.Authorization;
  }
};

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/password', data),
};

// Portfolio APIs
export const portfolioAPI = {
  getCurrent: () => api.get('/portfolio/current'),
  getHistory: () => api.get('/portfolio/history'),
  create: (data) => api.post('/portfolio', data),
  update: (id, data) => api.put(`/portfolio/${id}`, data),
  delete: (id) => api.delete(`/portfolio/${id}`),
};

// Returns APIs
export const returnsAPI = {
  getMonthlyReturns: (months = 12) => api.get(`/returns?months=${months}`),
  getSummary: () => api.get('/returns/summary'),
  create: (data) => api.post('/returns', data),
  update: (id, data) => api.put(`/returns/${id}`, data),
};

// Ratios APIs (userId = email in backend)
export const ratiosAPI = {
  getAll: () => api.get('/ratios'),
  create: (data) => api.post('/ratios', data),
  delete: (id) => api.delete(`/ratios/${id}`),
  updateAlert: (id, data) => api.put(`/ratios/${id}/alert`, data),
};

// Allocator / salary allocation APIs
export const allocatorAPI = {
  getYear: (year) => api.get(`/allocations?year=${year}`),
  saveMonth: (year, month, data) => api.post(`/allocations/${year}/${month}`, data),
};

// Chat API
export const chatAPI = {
  getConversations: () => api.get('/chat'),
  sendMessage: (message, conversationId) => api.post('/chat', { message, conversationId }),
  deleteConversation: (conversationId) => api.delete(`/chat/${conversationId}`),
};

export default api;


