import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
});

// Attach Authorization header on every request if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swms_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// On 401 response: clear token + redirect to /login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('swms_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
