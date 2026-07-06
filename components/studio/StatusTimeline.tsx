"use client";

import type { ProcessingStatus } from "@/lib/reelifyApi";

const PIPELINE_STAGES: { key: ProcessingStatus; label: string }[] = [
  { key: "QUEUED", label: "Queued" },
  { key: "PROCESSING_AUDIO", label: "Processing audio" },
  { key: "TRANSCRIBING", label: "Transcribing" },
  { key: "SCORING_CLIPS", label: "Scoring clips" },
  { key: "COMPLETED", label: "Completed" },
];

const TERMINAL_FAILURE = new Set<string>(["FAILED", "CANCELLED"]);

export interface StatusTimelineProps {
  status: string | null;
  updatedAt?: string;
}

export function StatusTimeline({ status, updatedAt }: StatusTimelineProps) {
  const failed = status !== null && TERMINAL_FAILURE.has(status);
  const currentIndex = status ? PIPELINE_STAGES.findIndex((s) => s.key === status) : -1;

  return (
    <ol className="space-y-2">
      {PIPELINE_STAGES.map((stage, index) => {
        const reached = currentIndex >= 0 && index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={stage.key} className="flex items-center gap-3">
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                reached
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-gray-300 bg-white text-gray-400",
                isCurrent ? "ring-2 ring-emerald-300" : "",
              ].join(" ")}
            >
              {reached ? "✓" : index + 1}
            </span>
            <span
              className={[
                "text-sm",
                isCurrent ? "font-semibold text-gray-900" : reached ? "text-gray-700" : "text-gray-400",
              ].join(" ")}
            >
              {stage.label}
              {isCurrent && (
                <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 align-middle" />
              )}
            </span>
          </li>
        );
      })}

      {failed && (
        <li className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-500 bg-red-500 text-xs font-bold text-white">
            !
          </span>
          <span className="text-sm font-semibold text-red-600">{status}</span>
        </li>
      )}

      {updatedAt && (
        <li className="pt-1 text-xs text-gray-400">
          Last update: {new Date(updatedAt).toLocaleTimeString()}
        </li>
      )}
    </ol>
  );
}
