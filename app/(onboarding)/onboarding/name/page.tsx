"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import {
  OnboardingTopNav,
  OnboardingProgress,
} from "@/components/onboarding/onboarding-step";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/stores/useProfileStore";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jobTitle: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function OnboardingNamePage() {
  const router = useRouter();
  const setProfile = useProfileStore((s) => s.setProfile);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    setProfile({
      firstName: values.firstName,
      lastName: values.lastName,
      jobTitle: values.jobTitle ?? "",
    });
    router.push("/onboarding/workspace");
  }

  return (
    <>
      <OnboardingTopNav />
      <AuthCard width={480}>
        <OnboardingProgress step={1} total={3} label="Account setup" />
        <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-ink">
          What&apos;s your name?
        </h1>
        <p className="mb-6.5 text-[13.5px] font-medium text-ink-tertiary">
          How you&apos;d like to be known in Reelify
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" autoFocus {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs font-medium text-danger">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs font-medium text-danger">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">
              Job title{" "}
              <span className="font-medium text-muted-1">(optional)</span>
            </Label>
            <Input
              id="jobTitle"
              placeholder="e.g. Marketing Manager"
              {...register("jobTitle")}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-1.5 w-full gap-2 rounded-xl py-5.5 text-[15px] font-extrabold"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </AuthCard>
    </>
  );
}
