import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Comment, CommentAuthor } from "@/types/reelify";

interface AddCommentInput {
  reelId: string;
  author: CommentAuthor;
  timestampMs: number;
  body: string;
  parentId?: string;
}

interface CommentState {
  comments: Comment[];
  addComment: (input: AddCommentInput) => Comment;
  resolveComment: (id: string) => void;
  listByReel: (reelId: string) => Comment[];
  listByReels: (reelIds: string[]) => Comment[];
  /** A reel is "reviewed" once it has at least one client-authored comment — derived, not a stored flag. */
  isReelReviewed: (reelId: string) => boolean;
}

export const useCommentStore = create<CommentState>()(
  persist(
    (set, get) => ({
      comments: [],

      addComment: (input) => {
        const comment: Comment = {
          id: `comment_${nanoid(8)}`,
          status: "open",
          createdAt: new Date().toISOString(),
          ...input,
        };
        set((state) => ({ comments: [...state.comments, comment] }));
        return comment;
      },

      resolveComment: (id) =>
        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === id ? { ...c, status: "resolved" } : c,
          ),
        })),

      listByReel: (reelId) => get().comments.filter((c) => c.reelId === reelId),

      listByReels: (reelIds) =>
        get().comments.filter((c) => reelIds.includes(c.reelId)),

      isReelReviewed: (reelId) =>
        get().comments.some((c) => c.reelId === reelId && c.author.isClient),
    }),
    { name: "reelify-comments" },
  ),
);
