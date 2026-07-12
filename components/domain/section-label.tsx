import { cn } from "@/lib/utils";

/** Small uppercase section heading reused across the editor, switcher, and inbox panels. */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[10.5px] font-bold tracking-wide text-ink-tertiary uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}
