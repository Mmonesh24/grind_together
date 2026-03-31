import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  register: async (email, password, role) => {
    const { data } = await api.post('/auth/register', { email, password, role });
    localStorage.setItem('accessToken', data.data.accessToken);
    set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    return data.data;
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    return data.data;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/profile/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  completeOnboarding: async (profileData) => {
    const { data } = await api.put('/profile/onboarding', profileData);
    set({ user: data.data });
    return data.data;
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/profile/me', profileData);
    set({ user: data.data });
    return data.data;
  },
}));

export default useAuthStore;
