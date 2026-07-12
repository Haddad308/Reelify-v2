import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Reel } from "@/types/reelify";

interface ReelState {
  reels: Reel[];
  addReels: (reels: Reel[]) => void;
  updateReel: (id: string, patch: Partial<Reel>) => void;
  removeReel: (id: string) => void;
  listByProject: (projectId: string) => Reel[];
  getReel: (id: string) => Reel | undefined;
}

export const useReelStore = create<ReelState>()(
  persist(
    (set, get) => ({
      reels: [],

      addReels: (reels) =>
        set((state) => ({ reels: [...state.reels, ...reels] })),

      updateReel: (id, patch) =>
        set((state) => ({
          reels: state.reels.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      removeReel: (id) =>
        set((state) => ({ reels: state.reels.filter((r) => r.id !== id) })),

      listByProject: (projectId) =>
        get().reels.filter((r) => r.projectId === projectId),

      getReel: (id) => get().reels.find((r) => r.id === id),
    }),
    { name: "reelify-reels" },
  ),
);
