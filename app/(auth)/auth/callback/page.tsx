"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthTopNav } from "@/components/nav/auth-top-nav";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeHostedUiSignIn = useAuthStore((s) => s.completeHostedUiSignIn);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(searchParams.get("error_description") ?? oauthError);
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setError("Missing authorization code from Google sign-in redirect.");
      return;
    }

    completeHostedUiSignIn(code)
      .then(() => router.replace("/projects"))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Google sign-in failed"),
      );
  }, [searchParams, completeHostedUiSignIn, router]);

  return (
    <>
      <AuthTopNav />
      <AuthCard>
        {error ? (
          <div className="text-center">
            <h1 className="mb-2 text-[20px] font-extrabold text-ink">
              Sign-in failed
            </h1>
            <p className="mb-6 text-[13.5px] font-medium text-ink-tertiary">
              {error}
            </p>
            <Button onClick={() => router.replace("/sign-in")} className="w-full rounded-xl">
              Back to sign in
            </Button>
          </div>
        ) : (
          <p className="text-center text-[13.5px] font-medium text-ink-tertiary">
            Finishing sign in…
          </p>
        )}
      </AuthCard>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}
