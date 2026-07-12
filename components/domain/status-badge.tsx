import { cn } from "@/lib/utils";
import type { ProjectStatus, ReelStatus } from "@/types/reelify";
import { Check, RotateCw, ArrowUp, X } from "lucide-react";

type Variant = "solid" | "soft";

const badgeBase =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none";

interface ToneConfig {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  solidBg: string;
  softBg: string;
  softText: string;
}

const REEL_STATUS: Record<ReelStatus, ToneConfig> = {
  draft: {
    label: "Draft",
    solidBg: "rgba(244,244,246,.93)",
    softBg: "var(--color-fill-3)",
    softText: "var(--color-ink-tertiary)",
  },
  ready: {
    label: "Ready",
    icon: Check,
    solidBg: "rgba(20,150,102,.88)",
    softBg: "var(--color-success-bg)",
    softText: "var(--color-success)",
  },
  published: {
    label: "Published",
    solidBg: "rgba(124,58,237,.86)",
    softBg: "rgba(124,58,237,.12)",
    softText: "#7c3aed",
  },
};

const PROJECT_STATUS: Record<ProjectStatus, ToneConfig> = {
  uploading: {
    label: "Uploading",
    icon: ArrowUp,
    solidBg: "rgba(37,99,235,.9)",
    softBg: "rgba(37,99,235,.1)",
    softText: "#2563eb",
  },
  processing: {
    label: "Processing",
    icon: RotateCw,
    solidBg: "rgba(214,117,4,.9)",
    softBg: "rgba(214,117,4,.1)",
    softText: "#d67604",
  },
  completed: {
    label: "Completed",
    icon: Check,
    solidBg: "rgba(20,152,102,.88)",
    softBg: "var(--color-success-bg)",
    softText: "var(--color-success)",
  },
  failed: {
    label: "Failed",
    icon: X,
    solidBg: "rgba(225,29,72,.9)",
    softBg: "rgba(225,29,72,.1)",
    softText: "var(--color-danger)",
  },
};

function renderBadge(tone: ToneConfig, variant: Variant, className?: string) {
  const Icon = tone.icon;
  const solid = variant === "solid";
  return (
    <span
      className={cn(badgeBase, className)}
      style={
        solid
          ? { backgroundColor: tone.solidBg, color: "#fff" }
          : { backgroundColor: tone.softBg, color: tone.softText }
      }
    >
      {Icon && <Icon className="size-2.5" />}
      {tone.label}
    </span>
  );
}

export function ReelStatusBadge({
  status,
  variant = "soft",
  className,
}: {
  status: ReelStatus;
  variant?: Variant;
  className?: string;
}) {
  return renderBadge(REEL_STATUS[status], variant, className);
}

export function ProjectStatusBadge({
  status,
  variant = "soft",
  className,
}: {
  status: ProjectStatus;
  variant?: Variant;
  className?: string;
}) {
  return renderBadge(PROJECT_STATUS[status], variant, className);
}
