"use client";

import { useQuery } from "@tanstack/react-query";
import { getProcessingJob } from "@/lib/reelifyApi";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ProcessingJobStatus } from "@/types/reelify";

const TERMINAL: ProcessingJobStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

/** Polls a real processing job every ~3s until it reaches a terminal status. */
export function useProcessingJob(jobId: string | undefined) {
  const token = useAuthStore((s) => s.session?.accessToken);

  return useQuery({
    queryKey: ["processingJob", jobId],
    queryFn: () => getProcessingJob(jobId!, token!),
    enabled: Boolean(jobId && token),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL.includes(status)) return false;
      return 3000;
    },
  });
}

export const PROCESSING_STATUS_LABEL: Record<ProcessingJobStatus, string> = {
  QUEUED: "Queued",
  PROCESSING_AUDIO: "Processing audio",
  TRANSCRIBING: "Transcribing",
  SCORING_CLIPS: "Scoring clips",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

/** Rough cosmetic progress percentage for the QUEUED -> COMPLETED pipeline. */
export const PROCESSING_STATUS_PERCENT: Record<ProcessingJobStatus, number> = {
  QUEUED: 5,
  PROCESSING_AUDIO: 30,
  TRANSCRIBING: 55,
  SCORING_CLIPS: 80,
  COMPLETED: 100,
  FAILED: 0,
  CANCELLED: 0,
};
