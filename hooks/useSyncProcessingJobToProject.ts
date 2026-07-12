"use client";

import { useEffect } from "react";
import { useProcessingJob, PROCESSING_STATUS_PERCENT } from "@/hooks/useProcessingJob";
import { useProjectStore } from "@/stores/useProjectStore";
import type { Project } from "@/types/reelify";

/**
 * Keeps a real (non-seeded) project's status/processingProgress in the
 * shared store synced to its live ProcessingJob — a no-op for projects
 * without a processingJobId (seeded demo data, or one still uploading).
 * Reused wherever a project is rendered so every screen sees the same state.
 */
export function useSyncProcessingJobToProject(project: Project | undefined) {
  const { data: job } = useProcessingJob(project?.processingJobId);
  const updateProject = useProjectStore((s) => s.updateProject);

  useEffect(() => {
    if (!job || !project) return;

    if (job.status === "COMPLETED" && project.status !== "completed") {
      updateProject(project.id, { status: "completed", processingProgress: 100 });
    } else if (job.status === "FAILED" && project.status !== "failed") {
      updateProject(project.id, {
        status: "failed",
        errorMessage: job.lastError ?? "Processing failed",
      });
    } else if (
      job.status !== "COMPLETED" &&
      job.status !== "FAILED" &&
      job.status !== "CANCELLED"
    ) {
      const percent = PROCESSING_STATUS_PERCENT[job.status];
      if (project.status !== "processing" || project.processingProgress !== percent) {
        updateProject(project.id, { status: "processing", processingProgress: percent });
      }
    }
  }, [job, project, updateProject]);
}
