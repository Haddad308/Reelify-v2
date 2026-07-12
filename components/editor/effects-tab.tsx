import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/domain/section-label";
import type { ReelEffect } from "@/types/reelify";

const EFFECTS: { id: ReelEffect; label: string; preview: string }[] = [
  { id: "none", label: "None", preview: "linear-gradient(160deg,#3a3a3a,#1a1a1a)" },
  { id: "bw", label: "B&W", preview: "linear-gradient(160deg,#888,#222)" },
  { id: "warm", label: "Warm", preview: "linear-gradient(160deg,#f59e42,#7c2d12)" },
  { id: "cool", label: "Cool", preview: "linear-gradient(160deg,#38bdf8,#0c4a6e)" },
  { id: "vignette", label: "Vignette", preview: "radial-gradient(circle,#555,#000)" },
];

export function EffectsTab({
  effect,
  onChange,
}: {
  effect: ReelEffect;
  onChange: (effect: ReelEffect) => void;
}) {
  return (
    <div className="max-w-md p-5">
      <SectionLabel className="mb-3">Visual effect</SectionLabel>
      <div className="grid grid-cols-3 gap-2.5">
        {EFFECTS.map((e) => {
          const active = e.id === effect;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onChange(e.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] p-2.5",
                active ? "border-brand/50 bg-brand/10" : "border-white/7 bg-white/5",
              )}
            >
              <div
                className="h-12 w-full rounded-lg"
                style={{ backgroundImage: e.preview }}
              />
              <span className={cn("text-xs", active ? "font-bold text-white" : "font-semibold text-white/55")}>
                {e.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
