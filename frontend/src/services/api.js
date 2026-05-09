import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
};

export const logsAPI = {
  upload: (formData) => API.post('/logs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => API.get('/logs'),
  delete: (id) => API.delete(`/logs/${id}`),
};

export const errorsAPI = {
  getAll: () => API.get('/errors'),
  generateFix: (id) => API.post(`/errors/${id}/fix`),
  ingest: (payload) => API.post('/errors/ingest', payload),
  getTrends: (days = 14) => API.get(`/errors/trends?days=${days}`),
};

export const fixesAPI = {
  getAll: () => API.get('/fixes'),
  delete: (id) => API.delete(`/fixes/${id}`),
  regenerate: (errorEntryId) => API.post(`/errors/${errorEntryId}/fix`),
};

export const analyticsAPI = {
  getOverview: (timeRange = '7d') => API.get(`/analytics/overview?timeRange=${timeRange}`),
  getTrends: (timeRange = '7d', granularity = 'daily') => 
    API.get(`/analytics/trends?timeRange=${timeRange}&granularity=${granularity}`),
  getPerformance: (timeRange = '7d') => API.get(`/analytics/performance?timeRange=${timeRange}`),
};

export const connectErrorStream = (token, { onMessage, onOpen, onClose, onError } = {}) => {
  const ws = new WebSocket(`ws://localhost:5000/ws/errors?token=${encodeURIComponent(token)}`);

  ws.onopen = () => onOpen && onOpen();
  ws.onclose = () => onClose && onClose();
  ws.onerror = (event) => onError && onError(event);
  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (onMessage) onMessage(payload);
    } catch (err) {
      // Ignore malformed events from the stream.
    }
  };

  return ws;
};

export default API;
