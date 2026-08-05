import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setAuth: (user: User, token: string) => set({ user, token }),

      logout: () => set({ user: null, token: null }),

      isAuthenticated: () => !!get().token,

      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "auth-storage",
      storage: {
        getItem: (key) => {
          const val = sessionStorage.getItem(key);
          return val ? JSON.parse(val) : null;
        },
        setItem: (key, value) =>
          sessionStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
    },
  ),
);
