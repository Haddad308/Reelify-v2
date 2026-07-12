import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Share, ShareExpiry, ShareScope } from "@/types/reelify";

interface CreateShareInput {
  scope: ShareScope;
  projectId: string;
  reelIds: string[];
  invitedEmails: string[];
  message: string;
  expiresIn: ShareExpiry;
  allowDownload: boolean;
  inviterName: string;
}

interface ShareState {
  shares: Share[];
  createShare: (input: CreateShareInput) => Share;
  getShareByToken: (token: string) => Share | undefined;
  listByProject: (projectId: string) => Share[];
}

export const useShareStore = create<ShareState>()(
  persist(
    (set, get) => ({
      shares: [],

      createShare: (input) => {
        const share: Share = {
          id: `share_${nanoid(8)}`,
          token: nanoid(10),
          createdAt: new Date().toISOString(),
          ...input,
        };
        set((state) => ({ shares: [...state.shares, share] }));
        return share;
      },

      getShareByToken: (token) => get().shares.find((s) => s.token === token),

      listByProject: (projectId) =>
        get().shares.filter((s) => s.projectId === projectId),
    }),
    { name: "reelify-shares" },
  ),
);
