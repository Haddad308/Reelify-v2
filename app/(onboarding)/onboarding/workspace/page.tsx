"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/auth-card";
import {
  OnboardingTopNav,
  OnboardingProgress,
} from "@/components/onboarding/onboarding-step";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/domain/gradient-avatar";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useReelStore } from "@/stores/useReelStore";
import { WORKSPACE_GRADIENTS } from "@/lib/gradients";
import { initialsFromName } from "@/lib/gradients";
import { seedWorkspaceDemoData } from "@/lib/mockSeed";
import { cn } from "@/lib/utils";

const schema = z.object({ name: z.string().min(1, "Workspace name is required") });
type FormValues = z.infer<typeof schema>;

export default function OnboardingWorkspacePage() {
  const router = useRouter();
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const addProjects = useProjectStore((s) => s.addProjects);
  const addReels = useReelStore((s) => s.addReels);
  const [gradientIdx, setGradientIdx] = useState(0);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const nameValue = watch("name") ?? "";
  const gradient = WORKSPACE_GRADIENTS[gradientIdx];

  function onSubmit(values: FormValues) {
    const workspace = createWorkspace({
      name: values.name,
      gradientFrom: gradient.from,
      gradientTo: gradient.to,
    });
    const { projects, reels } = seedWorkspaceDemoData(workspace.id);
    addProjects(projects);
    addReels(reels);
    router.push("/onboarding/plan");
  }

  return (
    <>
      <OnboardingTopNav />
      <AuthCard width={480}>
        <OnboardingProgress step={2} total={3} label="Workspace" />
        <h1 className="mb-2 text-[22px] font-extrabold tracking-tight text-ink">
          Create your workspace
        </h1>
        <p className="mb-6.5 text-[13.5px] leading-relaxed font-medium text-ink-tertiary">
          A workspace holds all your projects and reels for a brand or team.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5">
          <div className="flex items-end gap-4.5">
            <div className="shrink-0">
              <Label>Logo</Label>
              <div className="relative mt-1.5">
                <GradientAvatar
                  initials={nameValue ? initialsFromName(nameValue) : "?"}
                  from={gradient.from}
                  to={gradient.to}
                  shape="square"
                  size="lg"
                />
                <div className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-md border-[1.5px] border-border-subtle bg-white">
                  <Pencil className="size-2.5 text-ink-tertiary" />
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                {WORKSPACE_GRADIENTS.map((g, i) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => setGradientIdx(i)}
                    className={cn(
                      "size-4.5 shrink-0 cursor-pointer rounded-md",
                      i === gradientIdx && "outline-2 outline-offset-1.5 outline-brand",
                    )}
                    style={{ backgroundImage: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                    aria-label={`Use ${g.name} color`}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" autoFocus placeholder="Nova Beverages" {...register("name")} />
              {errors.name ? (
                <p className="text-xs font-medium text-danger">{errors.name.message}</p>
              ) : (
                <p className="text-[11.5px] font-medium text-muted-1">
                  Initials generated automatically
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite">
              Invite teammates{" "}
              <span className="font-medium text-muted-1">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input id="invite" placeholder="colleague@company.com" className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.info("Invites aren't available in this preview yet")}
              >
                Add
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full gap-2 rounded-xl py-5.5 text-[15px] font-extrabold"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </AuthCard>
    </>
  );
}
