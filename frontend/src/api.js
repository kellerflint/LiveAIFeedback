import axios from 'axios';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (window.location.hostname === 'host.docker.internal') {
        return 'http://host.docker.internal:8000';
    }
    return 'http://localhost:8000';
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

// Add a request interceptor to include the admin token
api.interceptors.request.use(
    (config) => {
        if (!config.url.startsWith('/api')) {
            config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }
        const token = localStorage.getItem('adminToken');
        if (token && config.url.includes('/admin')) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401s globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('adminToken');
            if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
