import axios from 'axios';

// Detect if we are behind a reverse proxy (Caddy) on standard ports
const isBehindProxy = () => {
    const port = window.location.port;
    // Standard ports (80, 443, or empty string) mean Caddy is in front
    return port === '' || port === '80' || port === '443';
};

export const getBaseUrl = () => {
    // 1. Explicit override (used by E2E tests)
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    // 2. Docker internal (E2E Playwright container)
    if (window.location.hostname === 'host.docker.internal') {
        return 'http://host.docker.internal:8000';
    }
    // 3. Behind Caddy reverse proxy — same origin, no port needed
    if (isBehindProxy()) {
        return window.location.origin;
    }
    // 4. Direct dev access (e.g. localhost:5173 hitting localhost:8000)
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
};

export const getWsUrl = () => {
    if (isBehindProxy()) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${window.location.host}`;
    }
    const baseUrl = getBaseUrl();
    if (baseUrl.startsWith('https://')) {
        return baseUrl.replace('https://', 'wss://');
    }
    return baseUrl.replace('http://', 'ws://');
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
