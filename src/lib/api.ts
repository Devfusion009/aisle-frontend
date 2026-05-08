import axios from 'axios';

const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling (optional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        // We might want to trigger a redirection here or via a global event
        // window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);

export default api;
