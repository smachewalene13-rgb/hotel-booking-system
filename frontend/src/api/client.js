import axios from 'axios';

// In production, fallback directly to the live Render backend if VITE_API_URL is unset
const prodApiUrl = 'https://hotel-booking-api-qs5a.onrender.com/api/v1';
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? prodApiUrl : '/api/v1');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('grand_horizon_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to catch 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
