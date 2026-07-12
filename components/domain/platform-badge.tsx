import { cn } from "@/lib/utils";
import { PLATFORM_LABEL, type Platform } from "@/types/reelify";

const PLATFORM_DOT_STYLE: Record<Platform, React.CSSProperties> = {
  tiktok: { backgroundColor: "#FF0050" },
  instagram_reels: {
    backgroundImage: "linear-gradient(135deg, #E1306C, #833AB4)",
  },
  youtube_shorts: { backgroundColor: "#FF0000" },
};

export function PlatformDot({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={PLATFORM_DOT_STYLE[platform]}
    />
  );
}

interface PlatformBadgeProps {
  platform: Platform;
  /** "dark" for the translucent pill used over a video thumbnail; "plain" for inline list use. */
  variant?: "dark" | "plain";
  className?: string;
}

export function PlatformBadge({
  platform,
  variant = "plain",
  className,
}: PlatformBadgeProps) {
  const dark = variant === "dark";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold",
        dark
          ? "bg-black/38 px-2 py-1 text-white/90"
          : "px-0 py-0 text-ink-secondary",
        className,
      )}
    >
      <PlatformDot platform={platform} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}
