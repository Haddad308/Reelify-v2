"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useReelStore } from "@/stores/useReelStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { seedWorkspaceDemoData } from "@/lib/mockSeed";

/** Dev-only: exposes zustand stores on window for manual/browser-driven QA. No-op in production. */
export function ExposeStores() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    Object.assign(window, {
      useAuthStore,
      useWorkspaceStore,
      useProjectStore,
      useReelStore,
      useProfileStore,
      seedWorkspaceDemoData,
    });
  }, []);

  return null;
}
