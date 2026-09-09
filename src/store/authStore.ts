import create from 'zustand';
import { Profile } from '@/types';

interface AuthStore {
  user: any | null;
  profile: Profile | null;
  setUser: (user: any) => void;
  setProfile: (profile: Profile | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  clearAuth: () => set({ user: null, profile: null }),
}));
