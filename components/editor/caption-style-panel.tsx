"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/domain/section-label";
import type { Caption, CaptionStyle } from "@/types/reelify";

const SIZES: CaptionStyle["size"][] = ["M", "L", "XL"];
const POSITIONS: CaptionStyle["position"][] = ["top", "mid", "bot"];
const POSITION_LABEL: Record<CaptionStyle["position"], string> = {
  top: "Top",
  mid: "Mid",
  bot: "Bot",
};
const COLORS = ["#FFFFFF", "#F43F5E", "#FBBF24", "#34D399", "#111111"];

function segmentButtonClass(active: boolean) {
  return cn(
    "cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold",
    active
      ? "border-[1.5px] border-brand/50 bg-brand/12 font-bold text-white"
      : "border border-white/10 text-white/45",
  );
}

export function CaptionStylePanel({
  caption,
  onApply,
}: {
  caption: Caption;
  onApply: (patch: { text: string; style: CaptionStyle }) => void;
}) {
  // Callers must render this with `key={caption.id}` so switching the
  // selected caption remounts (and re-initializes) this component instead of
  // needing an effect to sync local draft state from the prop.
  const [text, setText] = useState(caption.text);
  const [style, setStyle] = useState<CaptionStyle>(caption.style);

  return (
    <div className="flex w-64 shrink-0 flex-col gap-4.5 overflow-y-auto border-l border-white/7 p-5">
      <SectionLabel>Caption style</SectionLabel>

      <div>
        <label className="mb-1.5 block text-[10.5px] font-bold tracking-wide text-white/35 uppercase">
          Text
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border-[1.5px] border-brand/50 bg-brand/8 p-2.5 text-[13.5px] font-semibold text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[10.5px] font-bold tracking-wide text-white/35 uppercase">
          Size
        </label>
        <div className="flex gap-1.5">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={segmentButtonClass(style.size === size)}
              onClick={() => setStyle((s) => ({ ...s, size }))}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10.5px] font-bold tracking-wide text-white/35 uppercase">
          Position
        </label>
        <div className="flex gap-1.5">
          {POSITIONS.map((position) => (
            <button
              key={position}
              type="button"
              className={segmentButtonClass(style.position === position)}
              onClick={() => setStyle((s) => ({ ...s, position }))}
            >
              {POSITION_LABEL[position]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10.5px] font-bold tracking-wide text-white/35 uppercase">
          Colour
        </label>
        <div className="flex gap-1.5">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setStyle((s) => ({ ...s, color }))}
              style={{ backgroundColor: color }}
              className={cn(
                "size-6.5 rounded-lg border border-white/15",
                style.color === color && "outline-2.5 outline-offset-1.5 outline-white",
              )}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10.5px] font-bold tracking-wide text-white/35 uppercase">
          Background
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={cn(segmentButtonClass(style.background === "box"), "flex items-center gap-1.5")}
            onClick={() => setStyle((s) => ({ ...s, background: "box" }))}
          >
            <span className="h-2.5 w-3.5 rounded-sm bg-black/70" />
            Box
          </button>
          <button
            type="button"
            className={segmentButtonClass(style.background === "none")}
            onClick={() => setStyle((s) => ({ ...s, background: "none" }))}
          >
            None
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply({ text, style })}
        className="mt-auto w-full rounded-lg bg-brand py-2.5 text-[13.5px] font-extrabold text-white"
      >
        Apply changes
      </button>
    </div>
  );
}
