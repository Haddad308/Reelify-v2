import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProfileState {
  firstName: string;
  lastName: string;
  jobTitle: string;
  setProfile: (patch: Partial<Pick<ProfileState, "firstName" | "lastName" | "jobTitle">>) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      firstName: "",
      lastName: "",
      jobTitle: "",
      setProfile: (patch) => set(patch),
    }),
    { name: "reelify-profile" },
  ),
);
