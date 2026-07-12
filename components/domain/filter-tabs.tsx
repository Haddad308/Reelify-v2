"use client";

import { cn } from "@/lib/utils";

export interface FilterTabOption<T extends string> {
  value: T;
  label: string;
}

interface FilterTabsProps<T extends string> {
  options: FilterTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** The segmented pill tab control reused by Projects and Project Detail filters. */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl bg-[#EFEFEF] p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              active
                ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.06)]"
                : "bg-transparent text-ink-secondary hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
