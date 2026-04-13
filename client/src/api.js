import axios from 'axios';

const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (!envUrl) return 'http://localhost:5000/api';
    
    // If it doesn't end with /api, append it (handles common deployment config mistakes)
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// ─── Request interceptor — attach JWT token ───
api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (e) { }
    return config;
});

// ─── Response interceptor — handle expired token ───
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid — clear storage and reload to force login
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
