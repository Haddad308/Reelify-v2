"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";

/** Bounces an already-authenticated user away from the (auth) shell to /projects. */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/projects");
    }
  }, [status, router]);

  if (status === "authenticated") return null;
  return <>{children}</>;
}
