import { cn } from "@/lib/utils";

export function AuthCard({
  children,
  className,
  width = 440,
}: {
  children: React.ReactNode;
  className?: string;
  width?: number;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div
        className={cn(
          "rounded-[20px] bg-white p-10 shadow-[0_4px_28px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]",
          className,
        )}
        style={{ width, maxWidth: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}
