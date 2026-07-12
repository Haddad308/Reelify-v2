"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { AuthTopNav } from "@/components/nav/auth-top-nav";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { confirmSignUp, resendConfirmationCode } from "@/lib/auth/cognito";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    setSubmitting(true);
    try {
      await confirmSignUp(email, code);
      toast.success("Email verified — you can sign in now");
      router.push("/sign-in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendConfirmationCode(email);
      toast.success("Verification code resent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <AuthTopNav />
      <AuthCard>
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-18 items-center justify-center rounded-[20px] bg-brand-tint">
            <Mail className="size-8 text-brand" strokeWidth={1.6} />
          </div>
          <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-ink">
            Check your inbox
          </h1>
          <p className="mb-5 text-[13.5px] leading-relaxed font-medium text-ink-tertiary">
            We sent a verification code to
            <br />
            <span className="font-bold text-ink">{email || "your email"}</span>
          </p>
        </div>

        <div className="mb-5 space-y-1.5 text-left">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={submitting || code.length === 0}
          className="mb-3.5 w-full rounded-xl py-5.5 text-[15px] font-extrabold"
        >
          {submitting ? "Verifying…" : "Verify email"}
        </Button>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-[13px] font-semibold text-ink-tertiary"
          >
            {resending ? "Resending…" : "Resend email"}
          </button>
        </div>
      </AuthCard>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
