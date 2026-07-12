"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import {
  OnboardingTopNav,
  OnboardingProgress,
} from "@/components/onboarding/onboarding-step";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { WorkspacePlan } from "@/types/reelify";
import { cn } from "@/lib/utils";

interface PlanOption {
  id: WorkspacePlan;
  name: string;
  price: string;
  priceSuffix?: string;
  description: string;
  badge?: string;
}

const PLANS: PlanOption[] = [
  {
    id: "Starter",
    name: "Starter",
    price: "Free",
    description: "3 projects · 10 reels / month · 720p export",
  },
  {
    id: "Pro",
    name: "Pro",
    price: "$29",
    priceSuffix: "/ mo",
    description: "Unlimited projects · 50 reels / month · 1080p · Priority processing",
    badge: "Most popular",
  },
  {
    id: "Business",
    name: "Business",
    price: "$79",
    priceSuffix: "/ mo",
    description: "Everything in Pro · Team workspaces · Custom branding · Analytics",
  },
];

export default function OnboardingPlanPage() {
  const router = useRouter();
  const activeWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const [selected, setSelected] = useState<WorkspacePlan>("Pro");

  function handleContinue() {
    if (activeWorkspace) {
      updateWorkspace(activeWorkspace.id, { plan: selected === "Starter" ? "Starter" : selected });
    }
    router.push("/projects");
  }

  return (
    <>
      <OnboardingTopNav />
      <AuthCard width={540}>
        <OnboardingProgress step={3} total={3} label="Choose a plan" />
        <h1 className="mb-1.5 text-[22px] font-extrabold tracking-tight text-ink">
          Choose your plan
        </h1>
        <p className="mb-5.5 text-[13.5px] font-medium text-ink-tertiary">
          All plans include a{" "}
          <span className="font-bold text-ink">14-day free trial</span> — no
          credit card required.
        </p>

        <div className="mb-5.5 flex flex-col gap-2.5">
          {PLANS.map((plan) => {
            const active = plan.id === selected;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border-[1.5px] p-4 text-left",
                  active
                    ? "border-2 border-brand bg-brand-tint"
                    : "border-border-input bg-fill-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-brand bg-brand" : "border-muted-3 bg-white",
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-white" />}
                </span>
                <span className="flex-1">
                  <span className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-ink">{plan.name}</span>
                      {plan.badge && (
                        <span className="rounded-md bg-[#FFE4EA] px-2 py-0.5 text-[10.5px] font-bold text-danger">
                          {plan.badge}
                        </span>
                      )}
                    </span>
                    <span>
                      <span className="text-base font-extrabold text-ink">{plan.price}</span>
                      {plan.priceSuffix && (
                        <span className="text-xs font-medium text-ink-tertiary">
                          {" "}
                          {plan.priceSuffix}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-[12.5px] font-medium text-ink-tertiary">
                    {plan.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleContinue}
          className="mb-3 w-full rounded-xl py-5.5 text-[15px] font-extrabold"
        >
          Start 14-day free trial — {selected}
        </Button>
        <p className="text-center text-xs font-medium text-muted-1">
          Cancel any time · No credit card needed to start
        </p>
      </AuthCard>
    </>
  );
}
