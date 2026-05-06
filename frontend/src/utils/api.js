import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
// ✅ FIXED: only clears token on auth-specific errors, not ALL 401s
// (a project returning 403/401 for permissions shouldn't log you out)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || '';
    const isAuthEndpoint = err.config?.url?.includes('/auth/');

    if (
      err.response?.status === 401 &&
      (isAuthEndpoint || message.toLowerCase().includes('token'))
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login only if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  signup: (data) => API.post('/auth/signup', data),
  login:  (data) => API.post('/auth/login', data),
  me:     ()     => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

// Projects
export const projectAPI = {
  list:         ()           => API.get('/projects'),
  get:          (id)         => API.get(`/projects/${id}`),
  create:       (data)       => API.post('/projects', data),
  update:       (id, data)   => API.put(`/projects/${id}`, data),
  delete:       (id)         => API.delete(`/projects/${id}`),
  addMember:    (id, data)   => API.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => API.delete(`/projects/${id}/members/${userId}`),
};

// Tasks
export const taskAPI = {
  list:       (params)     => API.get('/tasks', { params }),
  get:        (id)         => API.get(`/tasks/${id}`),
  create:     (data)       => API.post('/tasks', data),
  update:     (id, data)   => API.put(`/tasks/${id}`, data),
  delete:     (id)         => API.delete(`/tasks/${id}`),
  addComment: (id, data)   => API.post(`/tasks/${id}/comments`, data),
};

// Dashboard
export const dashboardAPI = {
  get: () => API.get('/dashboard'),
};

// Users
export const userAPI = {
  list: (params) => API.get('/users', { params }),
};

export default API;