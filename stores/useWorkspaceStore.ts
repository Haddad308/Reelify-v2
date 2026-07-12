import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Workspace, WorkspacePlan } from "@/types/reelify";
import { apiEnv } from "@/lib/auth/env";
import { initialsFromName } from "@/lib/gradients";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  createWorkspace: (input: {
    name: string;
    gradientFrom: string;
    gradientTo: string;
    plan?: WorkspacePlan;
  }) => Workspace;
  setActiveWorkspace: (id: string) => void;
  getActiveWorkspace: () => Workspace | null;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => void;
}

/**
 * The first workspace a user ever creates (onboarding step 2) is minted with
 * the real pilot workspace id (`ws_e2e`) and `isReal: true` — that's the only
 * workspace real API calls are ever scoped to. Every subsequent workspace
 * (via the "create new workspace" switcher) is purely local/decorative.
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,

      createWorkspace: ({ name, gradientFrom, gradientTo, plan = "Pro" }) => {
        const isFirst = get().workspaces.length === 0;
        const workspace: Workspace = {
          id: isFirst ? apiEnv.pilotWorkspaceId : `ws_${nanoid(8)}`,
          name,
          initials: initialsFromName(name),
          gradientFrom,
          gradientTo,
          plan,
          isReal: isFirst,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          activeWorkspaceId: workspace.id,
        }));
        return workspace;
      },

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      getActiveWorkspace: () => {
        const { workspaces, activeWorkspaceId } = get();
        return workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
      },

      updateWorkspace: (id, patch) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...patch } : w,
          ),
        })),
    }),
    { name: "reelify-workspaces" },
  ),
);
