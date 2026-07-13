"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Share2, MessageSquare, Loader2 } from "lucide-react";
import { AppTopNav } from "@/components/nav/app-top-nav";
import { ProjectStatusBadge } from "@/components/domain/status-badge";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { ReelCard } from "@/components/domain/reel-card";
import { FilterTabs } from "@/components/domain/filter-tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareProjectDialog } from "@/components/share/share-project-dialog";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCommentStore } from "@/stores/useCommentStore";
import { useReelsForProject } from "@/hooks/useReelsForProject";
import { useSyncProcessingJobToProject } from "@/hooks/useSyncProcessingJobToProject";
import { createProcessingJob } from "@/lib/reelifyApi";
import { formatDuration, formatShortDate } from "@/lib/format";
import type { ReelStatus } from "@/types/reelify";

type Filter = "all" | ReelStatus;
type Sort = "newest" | "oldest";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const project = useProjectStore((s) => s.getProject(projectId));
  const updateProject = useProjectStore((s) => s.updateProject);
  const session = useAuthStore((s) => s.session);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [shareProjectOpen, setShareProjectOpen] = useState(false);

  useSyncProcessingJobToProject(project);
  const reels = useReelsForProject(project);
  const comments = useCommentStore((s) => s.comments);
  const openCommentCount = comments.filter(
    (c) => reels.some((r) => r.id === c.reelId) && c.status === "open",
  ).length;

  const counts = useMemo(
    () => ({
      all: reels.length,
      draft: reels.filter((r) => r.status === "draft" || r.status === "ready").length,
      published: reels.filter((r) => r.status === "published").length,
    }),
    [reels],
  );

  const visibleReels = useMemo(() => {
    let list = reels;
    if (filter === "draft") list = list.filter((r) => r.status !== "published");
    else if (filter === "published") list = list.filter((r) => r.status === "published");
    return [...list].sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
  }, [reels, filter, sort]);

  async function handleRetry() {
    if (!project?.videoId || !session) return;
    try {
      const { processingJobId } = await createProcessingJob(
        project.videoId,
        session.accessToken,
        crypto.randomUUID(),
      );
      updateProject(project.id, {
        processingJobId,
        status: "processing",
        errorMessage: undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    }
  }

  if (!project) {
    return (
      <>
        <AppTopNav breadcrumb="Project" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm font-semibold text-ink-tertiary">Project not found.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppTopNav breadcrumb={project.name} />

      <div className="flex items-center gap-5 border-b border-border-subtle bg-white px-7 py-4">
        <VideoThumbnail
          gradient={project.thumbnailGradient}
          className="h-12 w-19 shrink-0 rounded-lg"
          playButtonSize="sm"
        />
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              {project.name}
            </span>
            <ProjectStatusBadge status={project.status} variant="soft" />
          </div>
          <div className="flex items-center gap-3 text-[13px] font-medium text-ink-tertiary">
            {project.sourceDurationMs && <span>{formatDuration(project.sourceDurationMs)} source</span>}
            <span>· Uploaded {formatShortDate(project.createdAt)}</span>
            <span className="size-0.75 rounded-full bg-border-input" />
            <span className="font-bold text-ink">{reels.length} reels</span>
            <span className="size-0.75 rounded-full bg-border-input" />
            <span className="font-semibold text-[#7C3AED]">{counts.published} published</span>
            <span className="size-0.75 rounded-full bg-border-input" />
            <span className="text-muted-1">{counts.draft} drafts</span>
          </div>
        </div>
        {reels.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<Link href={`/projects/${project.id}/feedback`} />}
            >
              <MessageSquare className="size-3.5" />
              Feedback
              {openCommentCount > 0 && (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {openCommentCount}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 font-bold"
              onClick={() => setShareProjectOpen(true)}
            >
              <Share2 className="size-3.5" />
              Share project
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden p-7">
        {project.status === "uploading" && (
          <div className="mb-4 flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
            <span className="shrink-0 text-xs font-semibold text-ink">
              Uploading{project.uploadProgress ? ` — ${project.uploadProgress}%` : "…"}
            </span>
            <Progress value={project.uploadProgress ?? 0} className="max-w-xs flex-1" />
          </div>
        )}
        {project.status === "processing" && (
          <div className="mb-4 flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
            <span className="shrink-0 text-xs font-semibold text-ink">
              Processing — {project.processingProgress ?? 0}%
            </span>
            <Progress value={project.processingProgress ?? 0} className="max-w-xs flex-1" />
          </div>
        )}
        {project.status === "failed" && (
          <div className="mb-4 flex items-center gap-3">
            <p className="text-xs font-medium text-danger">
              {project.errorMessage ?? "Something went wrong"}
            </p>
            {project.videoId && (
              <Button size="sm" variant="outline" onClick={handleRetry}>
                Retry processing
              </Button>
            )}
          </div>
        )}

        {reels.length > 0 && (
          <div className="mb-4.5 flex items-center justify-between">
            <FilterTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All ${counts.all}` },
                { value: "draft", label: `Draft ${counts.draft}` },
                { value: "published", label: `Published ${counts.published}` },
              ]}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-border-input bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink"
                  >
                    {sort === "newest" ? "Newest first" : "Oldest first"}
                    <ChevronDown className="size-3" />
                  </button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSort("newest")}>Newest first</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort("oldest")}>Oldest first</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3.5 overflow-y-auto">
          {visibleReels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>

        {reels.length === 0 && project.status === "completed" && (
          <p className="text-sm font-semibold text-ink-tertiary">
            No reels yet for this project.
          </p>
        )}
      </div>

      <ShareProjectDialog
        project={project}
        reels={reels}
        open={shareProjectOpen}
        onOpenChange={setShareProjectOpen}
      />
    </>
  );
}
