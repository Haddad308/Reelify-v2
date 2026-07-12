"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AppTopNav } from "@/components/nav/app-top-nav";
import { ProjectCard } from "@/components/domain/project-card";
import { FilterTabs } from "@/components/domain/filter-tabs";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useReelStore } from "@/stores/useReelStore";
import type { ProjectStatus } from "@/types/reelify";

type FilterValue = "all" | ProjectStatus;

export default function ProjectsPage() {
  const router = useRouter();
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const projects = useProjectStore((s) => s.projects);
  const reels = useReelStore((s) => s.reels);
  const [filter, setFilter] = useState<FilterValue>("all");

  const workspaceProjects = useMemo(
    () => projects.filter((p) => p.workspaceId === workspace?.id),
    [projects, workspace?.id],
  );

  const counts = useMemo(() => {
    return {
      all: workspaceProjects.length,
      uploading: workspaceProjects.filter((p) => p.status === "uploading").length,
      processing: workspaceProjects.filter((p) => p.status === "processing").length,
      completed: workspaceProjects.filter((p) => p.status === "completed").length,
    };
  }, [workspaceProjects]);

  const visibleProjects = workspaceProjects.filter(
    (p) => filter === "all" || p.status === filter,
  );

  return (
    <>
      <AppTopNav breadcrumb="Projects" onNewProject={() => router.push("/projects/new/upload")} />

      <div className="flex flex-1 flex-col overflow-hidden p-7">
        <div className="mb-5.5 flex items-center justify-between">
          <div>
            <div className="mb-0.5 text-[22px] font-extrabold tracking-tight text-ink">
              Projects
            </div>
            <div className="text-[13px] font-medium text-muted-1">
              {counts.all} project{counts.all === 1 ? "" : "s"} · {counts.completed} completed ·{" "}
              {counts.processing} in progress · {counts.uploading} uploading
            </div>
          </div>
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All ${counts.all}` },
              { value: "uploading", label: "Uploading" },
              { value: "processing", label: "Processing" },
              { value: "completed", label: "Completed" },
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 overflow-y-auto">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              reelCount={reels.filter((r) => r.projectId === project.id).length}
              publishedCount={
                reels.filter((r) => r.projectId === project.id && r.status === "published")
                  .length
              }
            />
          ))}

          <button
            type="button"
            onClick={() => router.push("/projects/new/upload")}
            className="flex min-h-[270px] flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed border-border-input bg-fill-subtle p-7 text-center"
          >
            <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl bg-fill-3">
              <Plus className="size-5.5 text-muted-1" />
            </div>
            <div className="mb-1.5 text-[15px] font-bold text-ink-secondary">New project</div>
            <div className="text-[12.5px] leading-relaxed font-medium text-muted-1">
              Upload a video and Reelify
              <br />
              generates your clips automatically
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
