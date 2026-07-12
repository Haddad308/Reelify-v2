"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { AuthTopNav } from "@/components/nav/auth-top-nav";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { confirmPassword } from "@/lib/auth/cognito";

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    code: z.string().min(6, "Enter the 6-digit code from your email"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromQuery },
  });

  async function onSubmit(values: FormValues) {
    try {
      await confirmPassword(values.email, values.code, values.newPassword);
      toast.success("Password updated — sign in with your new password");
      router.push("/sign-in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
    }
  }

  return (
    <>
      <AuthTopNav />
      <AuthCard>
        <div className="mb-5 flex size-13 items-center justify-center rounded-2xl bg-success-bg">
          <ShieldCheck className="size-6 text-success" strokeWidth={1.8} />
        </div>
        <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-ink">
          Set a new password
        </h1>
        <p className="mb-6.5 text-[13.5px] leading-relaxed font-medium text-ink-tertiary">
          Enter the code we emailed you, then choose a new password (at least 8
          characters).
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs font-medium text-danger">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Reset code</Label>
            <Input id="code" placeholder="123456" {...register("code")} />
            {errors.code && (
              <p className="text-xs font-medium text-danger">{errors.code.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput id="newPassword" {...register("newPassword")} />
            {errors.newPassword && (
              <p className="text-xs font-medium text-danger">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput id="confirmPassword" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-danger">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl py-5.5 text-[15px] font-extrabold"
          >
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] font-medium text-ink-tertiary">
          <Link href="/sign-in" className="font-bold text-brand">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
