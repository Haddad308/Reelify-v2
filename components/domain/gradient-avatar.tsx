import { cn } from "@/lib/utils";

interface GradientAvatarProps {
  initials: string;
  from: string;
  to: string;
  shape?: "circle" | "square";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<GradientAvatarProps["size"]>, string> = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-15 text-lg",
};

export function GradientAvatar({
  initials,
  from,
  to,
  shape = "circle",
  size = "md",
  className,
}: GradientAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-extrabold text-white",
        shape === "circle" ? "rounded-full" : "rounded-lg",
        SIZE_CLASS[size],
        className,
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {initials}
    </div>
  );
}
