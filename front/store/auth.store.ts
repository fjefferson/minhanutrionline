import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  avatarUrl?: string | null;
  onboardingDone?: boolean;
  emailVerified?: boolean;
  subscription?: {
    status: string;
    cancelScheduledAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    plan: { type: string; name: string };
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasActivePlan: () => boolean;
  planType: () => string | null;
  markOnboardingDone: () => void;
  setAvatar: (url: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("token", token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem("token");
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
      hasActivePlan: () => get().user?.subscription?.status === "ACTIVE",
      planType: () =>
        get().user?.subscription?.status === "ACTIVE"
          ? (get().user?.subscription?.plan?.type ?? null)
          : null,
      markOnboardingDone: () => {
        const u = get().user;
        if (u) set({ user: { ...u, onboardingDone: true } });
      },
      setAvatar: (url: string) => {
        const u = get().user;
        if (u) set({ user: { ...u, avatarUrl: url } });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
