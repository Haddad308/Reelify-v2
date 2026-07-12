import { create } from "zustand";
import * as cognito from "@/lib/auth/cognito";
import type { AuthSession } from "@/lib/auth/cognito";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  completeHostedUiSignIn: (code: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Deliberately NOT wrapped in zustand's `persist` — the access token never
 * touches localStorage directly. Reload survival comes from the Cognito
 * SDK's own session storage (see lib/auth/cognito.ts); `initAuth()` re-derives
 * this store's state from that on boot.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  error: null,

  initAuth: async () => {
    try {
      const session = await cognito.getCurrentSession();
      set({
        session,
        status: session ? "authenticated" : "unauthenticated",
      });
    } catch (err) {
      set({
        session: null,
        status: "unauthenticated",
        error: err instanceof Error ? err.message : "Failed to restore session",
      });
    }
  },

  signIn: async (email, password) => {
    set({ error: null });
    try {
      const session = await cognito.signIn(email, password);
      set({ session, status: "authenticated" });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Sign in failed" });
      throw err;
    }
  },

  signOut: () => {
    cognito.signOut();
    set({ session: null, status: "unauthenticated" });
  },

  completeHostedUiSignIn: async (code) => {
    set({ error: null });
    try {
      const session = await cognito.exchangeAuthCodeForTokens(code);
      set({ session, status: "authenticated" });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Google sign-in failed",
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
