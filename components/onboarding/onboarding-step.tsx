import { Logo } from "@/components/nav/logo";

export function OnboardingTopNav() {
  return (
    <nav className="flex h-[58px] shrink-0 items-center justify-between border-b border-border-subtle bg-white px-6">
      <Logo />
      <span className="text-[12.5px] font-semibold text-muted-1">
        Setting up your account…
      </span>
    </nav>
  );
}

export function OnboardingProgress({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label: string;
}) {
  const pct = (step / total) * 100;
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-1">
          Step {step} of {total}
        </span>
        <span className="text-xs font-semibold text-muted-1">{label}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
