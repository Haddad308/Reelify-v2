"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

/** Calls initAuth() once on app boot to restore a session from the Cognito SDK's own storage. */
export function AuthInit() {
  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  return null;
}
