import { Check } from "lucide-react";
import { PlatformDot } from "@/components/domain/platform-badge";
import { PLATFORM_LABEL, type Platform } from "@/types/reelify";
import { cn } from "@/lib/utils";

export function PlatformSelectChip({
  platform,
  selected,
  onToggle,
}: {
  platform: Platform;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150",
        selected
          ? "border-brand bg-brand-tint text-ink"
          : "border-border-input bg-white text-ink-tertiary hover:border-ink-tertiary/40 hover:text-ink",
      )}
    >
      <PlatformDot platform={platform} />
      {PLATFORM_LABEL[platform]}
      {selected && <Check className="size-3.5 text-brand" />}
    </button>
  );
}
