import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, AuthResponse, AccessRequestFormData } from '@/types';
import api from '@/lib/api';
import { mutate } from 'swr';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  logoVersion: number;
  avatarVersion: number;

  login: (credentials: LoginCredentials) => Promise<void>;
  requestAccess: (data: AccessRequestFormData) => Promise<string>;
  logout: () => void;
  setError: (error: string | null) => void;
  bumpLogoVersion: () => void;
  bumpAvatarVersion: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      logoVersion: Date.now(),
      avatarVersion: Date.now(),

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<AuthResponse>('/auth/login', credentials);
          const { accessToken, user } = response.data;
          
          set({ 
            user, 
            token: accessToken, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          localStorage.setItem('accessToken', accessToken);
        } catch (error: any) {
          const message = error.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      requestAccess: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/request-access', data);
          set({ isLoading: false });
          return response.data?.message || 'Your access request has been submitted successfully!';
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to submit request';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('theme'); // Clear global theme fallback so next user defaults to dark
        mutate(() => true, undefined, { revalidate: false });
      },
      
      setError: (error) => set({ error }),
      bumpLogoVersion: () => set({ logoVersion: Date.now() }),
      bumpAvatarVersion: () => set({ avatarVersion: Date.now() }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
