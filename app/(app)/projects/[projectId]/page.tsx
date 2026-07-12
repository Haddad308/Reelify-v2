"use client";

import { use } from "react";
import { AppTopNav } from "@/components/nav/app-top-nav";
import { ProjectStatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSyncProcessingJobToProject } from "@/hooks/useSyncProcessingJobToProject";
import { createProcessingJob } from "@/lib/reelifyApi";
import { toast } from "sonner";

// Placeholder — the real Project Detail / Reels grid lands in Phase 5. For
// now this just reflects live upload/processing state for real projects.
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const project = useProjectStore((s) => s.getProject(projectId));
  const updateProject = useProjectStore((s) => s.updateProject);
  const session = useAuthStore((s) => s.session);

  if (project) useSyncProcessingJobToProject(project);

  async function handleRetry() {
    if (!project?.videoId || !session) return;
    try {
      const { processingJobId } = await createProcessingJob(
        project.videoId,
        session.accessToken,
        crypto.randomUUID(),
      );
      updateProject(project.id, { processingJobId, status: "processing", errorMessage: undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    }
  }

  return (
    <>
      <AppTopNav breadcrumb={project?.name ?? "Project"} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        {project ? (
          <>
            <ProjectStatusBadge status={project.status} variant="soft" />
            <p className="text-sm font-semibold text-ink-tertiary">
              &quot;{project.name}&quot; — full reels grid + editor land in Phase 5.
            </p>
            {project.status === "processing" && (
              <p className="text-xs font-medium text-muted-1">
                {project.processingProgress ?? 0}% — this updates live via the real
                processing-job poll.
              </p>
            )}
            {project.status === "failed" && project.videoId && (
              <>
                <p className="text-xs font-medium text-danger">{project.errorMessage}</p>
                <Button variant="outline" onClick={handleRetry}>
                  Retry processing
                </Button>
              </>
            )}
          </>
        ) : (
          <p className="text-sm font-semibold text-ink-tertiary">Project not found.</p>
        )}
      </div>
    </>
  );
}
