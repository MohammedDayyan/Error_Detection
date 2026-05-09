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
};

export const fixesAPI = {
  getAll: () => API.get('/fixes'),
  delete: (id) => API.delete(`/fixes/${id}`),
  regenerate: (errorEntryId) => API.post(`/errors/${errorEntryId}/fix`),
};

export default API;
