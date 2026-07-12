import { cn } from "@/lib/utils";

export function Logo({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <div className={cn("inline-block leading-none", className)}>
      <div
        className={cn(
          "font-extrabold tracking-tight text-ink",
          size === "md" ? "text-xl" : "text-[15px]",
        )}
      >
        Reelify
      </div>
      <div
        className={cn(
          "mt-0.5 h-[3px] rounded-sm bg-brand",
          size === "md" ? "w-[50px]" : "w-[36px]",
        )}
      />
    </div>
  );
}
