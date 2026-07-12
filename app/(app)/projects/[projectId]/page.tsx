"use client";

import { use } from "react";
import { AppTopNav } from "@/components/nav/app-top-nav";
import { useProjectStore } from "@/stores/useProjectStore";

// Placeholder — the real Project Detail / Reels grid lands in Phase 5.
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const project = useProjectStore((s) => s.getProject(projectId));

  return (
    <>
      <AppTopNav breadcrumb={project?.name ?? "Project"} />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-ink-tertiary">
          Project detail for &quot;{project?.name ?? projectId}&quot; — full
          reels grid lands in Phase 5.
        </p>
      </div>
    </>
  );
}
