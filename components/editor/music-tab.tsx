import { Music2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/domain/section-label";
import { MUSIC_TRACKS, type MusicTrackId } from "@/types/reelify";

export function MusicTab({
  trackId,
  volume,
  onChange,
}: {
  trackId: MusicTrackId;
  volume: number;
  onChange: (patch: { trackId?: MusicTrackId; volume?: number }) => void;
}) {
  return (
    <div className="max-w-md p-5">
      <SectionLabel className="mb-3">Background music</SectionLabel>
      <div className="mb-5 flex flex-col gap-2">
        {MUSIC_TRACKS.map((track) => {
          const active = track.id === trackId;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onChange({ trackId: track.id })}
              className={cn(
                "flex items-center gap-3 rounded-xl border-[1.5px] p-3 text-left",
                active ? "border-brand/45 bg-brand/10" : "border-white/7 bg-white/5",
              )}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/8">
                <Music2 className="size-3.5 text-white/50" />
              </div>
              <span className={cn("flex-1 text-sm", active ? "font-bold text-white" : "font-semibold text-white/60")}>
                {track.name}
              </span>
              {active && <Check className="size-4 text-brand" />}
            </button>
          );
        })}
      </div>

      {trackId !== "none" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-white/50">
            <span>Volume</span>
            <span>{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onChange({ volume: Number(e.target.value) })}
            className="w-full accent-[#F43F5E]"
          />
        </div>
      )}
    </div>
  );
}
