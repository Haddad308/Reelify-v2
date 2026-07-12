import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types/reelify";

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
  addProjects: (projects: Project[]) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  listByWorkspace: (workspaceId: string) => Project[];
  getProject: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),

      addProjects: (projects) =>
        set((state) => ({ projects: [...projects, ...state.projects] })),

      updateProject: (id, patch) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),

      listByWorkspace: (workspaceId) =>
        get().projects.filter((p) => p.workspaceId === workspaceId),

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    { name: "reelify-projects" },
  ),
);
