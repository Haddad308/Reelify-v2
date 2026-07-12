import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { SectionLabel } from "@/components/domain/section-label";
import type { Caption } from "@/types/reelify";

export function CaptionsTimeline({
  captions,
  totalMs,
  currentTimeMs,
  selectedCaptionId,
  onSelectCaption,
}: {
  captions: Caption[];
  totalMs: number;
  currentTimeMs: number;
  selectedCaptionId: string | null;
  onSelectCaption: (id: string) => void;
}) {
  const playheadPct = totalMs > 0 ? Math.min(100, (currentTimeMs / totalMs) * 100) : 0;

  return (
    <div>
      <SectionLabel className="mb-2.5">Timeline</SectionLabel>
      <div className="relative h-11 overflow-hidden rounded-[10px] bg-white/5">
        <div className="absolute top-1.5 right-2 left-2 flex justify-between">
          <span className="text-[9.5px] font-semibold text-white/28">0:00</span>
          <span className="text-[9.5px] font-semibold text-white/28">
            {formatDuration(totalMs / 2)}
          </span>
          <span className="text-[9.5px] font-semibold text-white/28">{formatDuration(totalMs)}</span>
        </div>
        <div className="absolute right-2 bottom-2 left-2 flex h-3.5 items-center gap-0.5">
          {captions.map((c) => {
            const widthPct = totalMs > 0 ? ((c.endMs - c.startMs) / totalMs) * 100 : 0;
            const selected = c.id === selectedCaptionId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCaption(c.id)}
                style={{ width: `${widthPct}%` }}
                className={cn(
                  "h-3 rounded-sm",
                  selected
                    ? "bg-brand shadow-[0_0_6px_rgba(244,63,94,.5)]"
                    : "border border-brand/35 bg-brand/28",
                )}
              />
            );
          })}
        </div>
        <div
          className="absolute top-0 bottom-0 w-0.5 rounded-sm bg-white/80"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="absolute -top-px -left-[3px] size-2 rounded-sm bg-white" />
        </div>
      </div>
    </div>
  );
}
