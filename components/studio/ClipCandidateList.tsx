"use client";

import { formatMs, type ClipCandidate } from "@/lib/reelifyApi";

export interface ClipCandidateListProps {
  candidates: ClipCandidate[];
}

export function ClipCandidateList({ candidates }: ClipCandidateListProps) {
  if (candidates.length === 0) {
    return <p className="text-sm text-gray-500">No clip candidates returned.</p>;
  }

  return (
    <ul className="space-y-2">
      {candidates.map((clip) => (
        <li
          key={clip.id}
          className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
            {clip.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{clip.title}</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                score {clip.score.toFixed(2)}
              </span>
              {clip.category && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  {clip.category}
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-xs text-gray-500">
              {formatMs(clip.startMs)}–{formatMs(clip.endMs)}
              <span className="ml-2 text-gray-400">({Math.round(clip.durationMs / 1000)}s)</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
