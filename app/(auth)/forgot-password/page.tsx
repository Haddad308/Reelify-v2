"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { AuthTopNav } from "@/components/nav/auth-top-nav";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { forgotPassword } from "@/lib/auth/cognito";

const schema = z.object({ email: z.string().email("Enter a valid email address") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await forgotPassword(values.email);
      toast.success("Reset code sent");
      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link");
    }
  }

  return (
    <>
      <AuthTopNav />
      <AuthCard>
        <Link
          href="/sign-in"
          className="mb-7 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-tertiary"
        >
          <ChevronLeft className="size-3.5" />
          Back to sign in
        </Link>

        <div className="mb-5 flex size-13 items-center justify-center rounded-2xl bg-brand-tint">
          <ShieldCheck className="size-6 text-brand" strokeWidth={1.8} />
        </div>

        <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-ink">
          Forgot your password?
        </h1>
        <p className="mb-6.5 text-[13.5px] leading-relaxed font-medium text-ink-tertiary">
          No worries — enter your email and we&apos;ll send you a reset code right away.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5.5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
            {errors.email && (
              <p className="text-xs font-medium text-danger">{errors.email.message}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl py-5.5 text-[15px] font-extrabold"
          >
            {isSubmitting ? "Sending…" : "Send reset code"}
          </Button>
        </form>
      </AuthCard>
    </>
  );
}
