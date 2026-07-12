"use client";

import { Scissors, Captions, Music2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type EditorTab = "trim" | "captions" | "music" | "effects";

const TABS: { value: EditorTab; label: string; icon: typeof Scissors }[] = [
  { value: "trim", label: "Trim", icon: Scissors },
  { value: "captions", label: "Captions", icon: Captions },
  { value: "music", label: "Music", icon: Music2 },
  { value: "effects", label: "Effects", icon: Sparkles },
];

export function EditorTabs({
  value,
  onChange,
}: {
  value: EditorTab;
  onChange: (tab: EditorTab) => void;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-white/7 px-5">
      {TABS.map((tab) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold",
              active ? "bg-brand/15 text-brand font-bold" : "bg-white/6 text-white/50",
            )}
          >
            <Icon className="size-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
