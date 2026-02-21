import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('catts_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    if (status === 401) {
      const requestUrl: string | undefined = originalRequest.url;
      const isLoginAttempt = requestUrl?.includes('/auth/login');
      const hadToken = !!originalRequest.headers?.Authorization || !!localStorage.getItem('catts_token');
      // Only clear tokens and force redirect when a token existed (not a fresh login attempt)
      if (hadToken && !isLoginAttempt) {
        localStorage.removeItem('catts_token');
        localStorage.removeItem('catts_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
