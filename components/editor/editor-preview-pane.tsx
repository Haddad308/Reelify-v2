import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { PlatformDot } from "@/components/domain/platform-badge";
import { PLATFORM_LABEL, type Platform } from "@/types/reelify";
import { formatDuration } from "@/lib/format";

export function EditorPreviewPane({
  gradient,
  platform,
  captionText,
  currentTimeMs,
  totalMs,
  isPlaying,
  onTogglePlay,
  onSeek,
}: {
  gradient: [string, string];
  platform: Platform | null;
  captionText: string | null;
  currentTimeMs: number;
  totalMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (deltaMs: number) => void;
}) {
  const [from, to] = gradient;
  const pct = totalMs > 0 ? Math.min(100, (currentTimeMs / totalMs) * 100) : 0;

  return (
    <div className="flex w-[296px] shrink-0 flex-col items-center justify-center gap-3.5 border-r border-white/7 bg-[#111218] p-5">
      <div
        className="relative h-[348px] w-[196px] overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
        style={{ backgroundImage: `linear-gradient(180deg, ${from}, ${to})` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-58deg, rgba(255,255,255,0) 0, rgba(255,255,255,0) 6px, rgba(255,255,255,.025) 6px, rgba(255,255,255,.025) 12px)",
          }}
        />
        {platform && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1">
            <PlatformDot platform={platform} />
            <span className="text-[10px] font-bold text-white">{PLATFORM_LABEL[platform]}</span>
          </div>
        )}
        {captionText && (
          <div className="absolute right-0 bottom-7 left-0 z-20 px-3 text-center">
            <div className="inline-block rounded-md bg-black/72 px-2.5 py-1.5">
              <span className="text-xs leading-snug font-bold text-white whitespace-pre-line">
                {captionText}
              </span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onTogglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-white/15">
            {isPlaying ? (
              <Pause className="size-4 fill-white/90 text-white/90" />
            ) : (
              <Play className="size-4 fill-white/90 text-white/90" />
            )}
          </div>
        </button>
        <div className="absolute right-0 bottom-0 left-0 z-20 h-[3px] bg-white/10">
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onSeek(-5000)}
          className="flex size-7 items-center justify-center rounded-lg bg-white/8"
        >
          <SkipBack className="size-3 text-white/70" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex size-8.5 items-center justify-center rounded-full bg-brand"
        >
          {isPlaying ? (
            <Pause className="size-3.5 fill-white text-white" />
          ) : (
            <Play className="size-3.5 fill-white text-white" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSeek(5000)}
          className="flex size-7 items-center justify-center rounded-lg bg-white/8"
        >
          <SkipForward className="size-3 text-white/70" />
        </button>
      </div>
      <div className="font-mono text-xs font-semibold tabular-nums text-white/40">
        {formatDuration(currentTimeMs)} / {formatDuration(totalMs)}
      </div>
    </div>
  );
}
