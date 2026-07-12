import { SectionLabel } from "@/components/domain/section-label";
import { formatDuration } from "@/lib/format";

export function TrimTab({
  sourceStartMs,
  sourceEndMs,
  trimStartMs,
  trimEndMs,
  onChange,
}: {
  sourceStartMs: number;
  sourceEndMs: number;
  trimStartMs: number;
  trimEndMs: number;
  onChange: (trim: { startMs: number; endMs: number }) => void;
}) {
  return (
    <div className="max-w-md p-5">
      <SectionLabel className="mb-3">Trim range</SectionLabel>
      <p className="mb-5 text-[13px] font-medium text-white/45">
        Adjust where this reel starts and ends within the source clip.
      </p>

      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-white/50">
          <span>Start: {formatDuration(trimStartMs - sourceStartMs)}</span>
          <span>{formatDuration(trimStartMs)}</span>
        </div>
        <input
          type="range"
          min={sourceStartMs}
          max={trimEndMs - 1000}
          value={trimStartMs}
          onChange={(e) => onChange({ startMs: Number(e.target.value), endMs: trimEndMs })}
          className="w-full accent-[#F43F5E]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-white/50">
          <span>End: {formatDuration(trimEndMs - sourceStartMs)}</span>
          <span>{formatDuration(trimEndMs)}</span>
        </div>
        <input
          type="range"
          min={trimStartMs + 1000}
          max={sourceEndMs}
          value={trimEndMs}
          onChange={(e) => onChange({ startMs: trimStartMs, endMs: Number(e.target.value) })}
          className="w-full accent-[#F43F5E]"
        />
      </div>

      <div className="mt-5 rounded-lg bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/50">
        Trimmed duration: {formatDuration(trimEndMs - trimStartMs)}
      </div>
    </div>
  );
}
