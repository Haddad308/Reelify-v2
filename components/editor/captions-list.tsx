import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { SectionLabel } from "@/components/domain/section-label";
import type { Caption } from "@/types/reelify";

export function CaptionsList({
  captions,
  selectedCaptionId,
  onSelect,
  onDelete,
  onAdd,
}: {
  captions: Caption[];
  selectedCaptionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <SectionLabel className="mb-2.5">Captions</SectionLabel>
      <div className="flex flex-col gap-2">
        {captions.map((c) => {
          const selected = c.id === selectedCaptionId;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "cursor-pointer rounded-xl border p-3",
                selected
                  ? "border-[1.5px] border-brand/45 bg-brand/10"
                  : "border-white/7 bg-white/5",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold tabular-nums",
                    selected ? "text-[#FB7185]" : "text-white/32",
                  )}
                >
                  {formatDuration(c.startMs)} – {formatDuration(c.endMs)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className={cn(
                    "flex size-5 items-center justify-center rounded-md",
                    selected ? "bg-brand/20" : "bg-white/7",
                  )}
                >
                  <X className={cn("size-2.5", selected ? "text-brand" : "text-white/35")} />
                </button>
              </div>
              <div className={cn("text-sm", selected ? "font-bold text-white" : "font-semibold text-white/70")}>
                {c.text}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-white/14 py-3 text-[13.5px] font-semibold text-white/38"
        >
          <Plus className="size-3.5" />
          Add caption
        </button>
      </div>
    </div>
  );
}
