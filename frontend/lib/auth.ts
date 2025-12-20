
import axios from 'axios';

// ✅ Correct Practice: Centralized Configuration
// NEXT_PUBLIC_API_URL should be the HOST (e.g. https://backend.render.com), NOT including /api/v1
// If user included /api/v1 in env var, we strip it to avoid duplication, or we just advise user.
// Safest: Assume env var is HOST.
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '');
export const API_URL = `${BASE_URL}/api/v1`;

export const auth = {
    login: async (email: string, password: string) => {
        const formData = new URLSearchParams();
        // API expects UserCreate JSON, wait auth.py: login(login_data: schemas.UserCreate)
        // So JSON is correct.
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        if (res.data.access_token) {
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('user_email', email); // simple storage
        }
        return res.data;
    },

    register: async (email: string, password: string) => {
        const res = await axios.post(`${API_URL}/auth/register`, { email, password });
        return res.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_email');
        window.location.href = '/login';
    },

    getToken: () => localStorage.getItem('token'),
    getUserEmail: () => localStorage.getItem('user_email'),
    isAuthenticated: () => !!localStorage.getItem('token')
};

const handleAuthError = (error: any) => {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        console.warn("Authentication failed, logging out...");
        auth.logout();
    }
    throw error;
};

export const watchlist = {
    get: async () => {
        const token = auth.getToken();
        if (!token) return [];
        try {
            const res = await axios.get(`${API_URL}/stocks/watchlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data; // List[str]
        } catch (e) {
            handleAuthError(e);
            return [];
        }
    },

    add: async (ticker: string) => {
        const token = auth.getToken();
        if (!token) return;
        try {
            await axios.post(`${API_URL}/stocks/watchlist`, { ticker }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) {
            handleAuthError(e);
        }
    },

    remove: async (ticker: string) => {
        const token = auth.getToken();
        if (!token) return;
        try {
            await axios.delete(`${API_URL}/stocks/watchlist/${ticker}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) {
            handleAuthError(e);
        }
    }
};
