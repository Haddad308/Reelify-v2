"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export default function RootPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const hasWorkspace = useWorkspaceStore((s) => s.workspaces.length > 0);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/sign-in");
    } else if (!hasWorkspace) {
      router.replace("/onboarding/name");
    } else {
      router.replace("/projects");
    }
  }, [status, hasWorkspace, router]);

  return (
    <div className="flex flex-1 items-center justify-center bg-fill-subtle">
      <div className="size-6 animate-spin rounded-full border-2 border-border-input border-t-brand" />
    </div>
  );
}
