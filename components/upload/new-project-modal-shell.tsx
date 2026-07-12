import Link from "next/link";
import { X } from "lucide-react";

export function NewProjectModalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-[560px] max-w-full rounded-[20px] bg-white p-8 shadow-[0_4px_28px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mb-1 text-xl font-extrabold tracking-tight text-ink">{title}</div>
            <p className="text-[13.5px] font-medium text-ink-tertiary">{subtitle}</p>
          </div>
          <Link
            href="/projects"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-fill-subtle text-ink-tertiary"
          >
            <X className="size-4" />
          </Link>
        </div>
        <div className="mb-5 h-px bg-border-subtle" />
        {children}
      </div>
    </div>
  );
}
