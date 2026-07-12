"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Calls initAuth() once on app boot to restore a session from the Cognito
 * SDK's own storage. Dev-only escape hatch: `?mockAuth=1` sets a fake
 * authenticated session instead, synchronously before the first render, so
 * browser-driven QA of onboarding/app screens doesn't need a real Cognito
 * round trip (there's no test framework in this project — see the plan's
 * "Testing" decision — this is a manual-QA aid, not a suite).
 */
export function AuthInit() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("mockAuth") === "1"
    ) {
      useAuthStore.setState({
        status: "authenticated",
        session: {
          accessToken: "dev-mock",
          idToken: "dev-mock",
          refreshToken: "dev-mock",
          expiresAt: Date.now() + 3600_000,
          email: "dev@example.com",
          name: "Dev User",
        },
      });
      return;
    }
    useAuthStore.getState().initAuth();
  }, []);

  return null;
}
