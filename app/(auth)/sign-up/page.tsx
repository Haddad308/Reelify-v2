"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthTopNav } from "@/components/nav/auth-top-nav";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthDivider } from "@/components/auth/auth-divider";
import { PasswordInput } from "@/components/auth/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp, buildHostedUiGoogleUrl } from "@/lib/auth/cognito";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await signUp(values.email, values.password, values.fullName);
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    }
  }

  return (
    <>
      <AuthTopNav>
        <div className="flex items-center gap-3">
          <span className="text-[13.5px] font-medium text-ink-tertiary">
            Already a member?
          </span>
          <Link href="/sign-in" className="text-[13.5px] font-bold text-brand">
            Sign in
          </Link>
        </div>
      </AuthTopNav>

      <AuthCard>
        <h1 className="mb-1.5 text-center text-[23px] font-extrabold tracking-tight text-ink">
          Create your account
        </h1>
        <p className="mb-6.5 text-center text-[13.5px] font-medium text-ink-tertiary">
          Start generating reels in minutes
        </p>

        <GoogleButton onClick={() => (window.location.href = buildHostedUiGoogleUrl())} />
        <AuthDivider />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" placeholder="Sarah Kim" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-xs font-medium text-danger">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
            {errors.email && (
              <p className="text-xs font-medium text-danger">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="At least 8 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs font-medium text-danger">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-xl py-5.5 text-[15px] font-extrabold"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-1">
          By continuing you agree to our{" "}
          <span className="font-semibold text-brand">Terms</span> and{" "}
          <span className="font-semibold text-brand">Privacy Policy</span>
        </p>
      </AuthCard>
    </>
  );
}
