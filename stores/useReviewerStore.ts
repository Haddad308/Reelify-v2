import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReviewerIdentity } from "@/types/reelify";

interface ReviewerState {
  identities: ReviewerIdentity[];
  setIdentity: (identity: ReviewerIdentity) => void;
  getIdentity: (shareToken: string) => ReviewerIdentity | undefined;
}

/** Once a client passes the identity gate for a share token, they aren't asked again on that device. */
export const useReviewerStore = create<ReviewerState>()(
  persist(
    (set, get) => ({
      identities: [],

      setIdentity: (identity) =>
        set((state) => ({
          identities: [
            ...state.identities.filter((i) => i.shareToken !== identity.shareToken),
            identity,
          ],
        })),

      getIdentity: (shareToken) =>
        get().identities.find((i) => i.shareToken === shareToken),
    }),
    { name: "reelify-reviewer-identity" },
  ),
);
