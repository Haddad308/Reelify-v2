"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Client-side route protection for the (app) and (onboarding) shells. The
 * access token lives only in memory (zustand, not persisted), so a
 * server-side proxy/middleware guard isn't possible — this is the guard.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/sign-in");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-border-input border-t-brand" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
