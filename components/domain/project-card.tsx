"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VideoThumbnail } from "./video-thumbnail";
import { ProjectStatusBadge } from "./status-badge";
import type { Project } from "@/types/reelify";
import { formatDuration, formatShortDate } from "@/lib/format";
import { useSyncProcessingJobToProject } from "@/hooks/useSyncProcessingJobToProject";

interface ProjectCardProps {
  project: Project;
  reelCount: number;
  publishedCount: number;
}

export function ProjectCard({ project, reelCount, publishedCount }: ProjectCardProps) {
  useSyncProcessingJobToProject(project);
  const [from, to] = project.thumbnailGradient;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block overflow-hidden rounded-2xl border border-border-subtle bg-white"
    >
      <VideoThumbnail
        gradient={[from, to]}
        className="h-[188px] w-full"
        topRight={<ProjectStatusBadge status={project.status} variant="solid" />}
        bottomRight={
          project.sourceDurationMs ? (
            <span className="rounded-md bg-black/38 px-1.5 py-0.5 text-[11px] font-semibold text-white/85">
              {formatDuration(project.sourceDurationMs)}
            </span>
          ) : undefined
        }
      />
      <div className="p-4 pt-3.5">
        <div className="mb-0.5 text-[15px] font-bold tracking-tight text-ink">
          {project.name}
        </div>

        {project.status === "completed" && (
          <>
            <div className="mb-3.5 text-xs font-medium text-muted-1">
              Uploaded {formatShortDate(project.createdAt)}
              {project.sourceDurationMs && ` · ${formatDuration(project.sourceDurationMs)} source`}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-ink">{reelCount} reels</span>
                <span className="size-0.75 rounded-full bg-border-input" />
                <span className="text-[12.5px] font-semibold text-[#7C3AED]">
                  {publishedCount} published
                </span>
              </div>
              <span className="flex items-center gap-1 text-[12.5px] font-bold text-danger">
                Open
                <ArrowRight className="size-3" />
              </span>
            </div>
          </>
        )}

        {project.status === "processing" && (
          <>
            <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-fill-3">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${project.processingProgress ?? 0}%`,
                  backgroundImage: "linear-gradient(90deg, #F43F5E, #FF7C8A)",
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#D97706]">
                Generating reels… {project.processingProgress ?? 0}%
              </span>
            </div>
          </>
        )}

        {project.status === "uploading" && (
          <>
            <div className="mb-2 text-xs font-medium text-muted-1">
              {formatShortDate(project.createdAt)}
              {project.sourceDurationMs && ` · ${formatDuration(project.sourceDurationMs)} source`}
              {project.sourceSizeBytes && ` · ${Math.round(project.sourceSizeBytes / (1024 * 1024))} MB`}
            </div>
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-fill-3">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${project.uploadProgress ?? 0}%`,
                  backgroundImage: "linear-gradient(90deg, #2563EB, #60A5FA)",
                }}
              />
            </div>
            <span className="text-xs font-bold text-[#2563EB]">
              {project.uploadProgress ?? 0}% uploaded
            </span>
          </>
        )}

        {project.status === "failed" && (
          <div className="text-xs font-semibold text-danger">
            {project.errorMessage ?? "Processing failed"}
          </div>
        )}
      </div>
    </Link>
  );
}
