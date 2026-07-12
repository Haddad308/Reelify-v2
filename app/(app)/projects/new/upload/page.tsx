"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket, CheckCircle2 } from "lucide-react";
import { AppTopNav } from "@/components/nav/app-top-nav";
import { NewProjectModalShell } from "@/components/upload/new-project-modal-shell";
import { DropZone } from "@/components/upload/drop-zone";
import { PlatformSelectChip } from "@/components/upload/platform-select-chip";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { FilterTabs } from "@/components/domain/filter-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { uploadVideo } from "@/hooks/useUploadVideo";
import { apiEnv } from "@/lib/auth/env";
import { validateVideoFile, readVideoDurationMs } from "@/lib/videoValidation";
import { formatBytes, formatDuration } from "@/lib/format";
import { gradientForIndex } from "@/lib/gradients";
import type { Platform, ReelCountMode } from "@/types/reelify";

type Step = "select" | "configure";

const REEL_COUNT_OPTIONS: { value: ReelCountMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "15", label: "15" },
  { value: "20", label: "20" },
];

function nameFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return withoutExt
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NewProjectUploadPage() {
  const router = useRouter();
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const session = useAuthStore((s) => s.session);

  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["tiktok", "instagram_reels"]);
  const [reelCountMode, setReelCountMode] = useState<ReelCountMode>("auto");
  const [submitting, setSubmitting] = useState(false);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleFileSelected(selected: File) {
    const result = validateVideoFile(selected);
    if (!result.valid) {
      toast.error(result.error);
      return;
    }
    setFile(selected);
    setProjectName(nameFromFilename(selected.name));
    setStep("configure");
    const ms = await readVideoDurationMs(selected);
    setDurationMs(ms);
  }

  async function handleStartProcessing() {
    if (!file || !workspace || !session) return;
    setSubmitting(true);

    const project = {
      id: `proj_${crypto.randomUUID().slice(0, 8)}`,
      workspaceId: workspace.id,
      name: projectName || nameFromFilename(file.name),
      targetPlatforms: platforms,
      reelCountMode,
      status: "uploading" as const,
      uploadProgress: 0,
      sourceDurationMs: durationMs ?? undefined,
      sourceSizeBytes: file.size,
      thumbnailGradient: gradientForIndex(projects.length),
      createdAt: new Date().toISOString(),
    };
    addProject(project);
    router.push(`/projects/${project.id}`);

    // Fire-and-forget: continues via the shared store even after this page unmounts.
    uploadVideo(apiEnv.pilotWorkspaceId, session.accessToken, file, (progress) => {
      const percent =
        progress.phase === "uploading" && progress.partsTotal > 0
          ? Math.round((progress.partsDone / progress.partsTotal) * 100)
          : progress.phase === "completing"
            ? 99
            : progress.phase === "creating-session" || progress.phase === "presigning"
              ? 2
              : 0;
      updateProject(project.id, { uploadProgress: percent });
    })
      .then(({ videoId, processingJobId }) => {
        updateProject(project.id, {
          videoId,
          processingJobId,
          status: "processing",
          uploadProgress: 100,
        });
      })
      .catch((err) => {
        updateProject(project.id, {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Upload failed",
        });
      });
  }

  return (
    <>
      <AppTopNav breadcrumb="New project" />

      {step === "select" && (
        <NewProjectModalShell
          title="New project"
          subtitle="Upload a source video and Reelify will automatically generate short clips for you."
        >
          <DropZone onFileSelected={handleFileSelected} />
        </NewProjectModalShell>
      )}

      {step === "configure" && file && (
        <NewProjectModalShell
          title="New project"
          subtitle="Configure your project before processing starts."
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-fill-subtle p-3">
              <VideoThumbnail
                gradient={gradientForIndex(projects.length)}
                className="h-[34px] w-[52px] shrink-0 rounded-md"
                playButtonSize="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-ink">{file.name}</div>
                <div className="text-xs font-medium text-muted-1">
                  {file.type.split("/")[1]?.toUpperCase() ?? "VIDEO"} · {formatBytes(file.size)}
                  {durationMs && ` · ${formatDuration(durationMs)} detected`}
                </div>
              </div>
              <CheckCircle2 className="size-7 shrink-0 text-success" strokeWidth={1.6} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="projectName">Project name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <p className="text-[11.5px] font-medium text-muted-1">
                Auto-filled from filename — edit to rename
              </p>
            </div>

            <div className="space-y-2">
              <Label>Target platforms</Label>
              <div className="flex flex-wrap gap-2">
                {(["tiktok", "instagram_reels", "youtube_shorts"] as Platform[]).map((p) => (
                  <PlatformSelectChip
                    key={p}
                    platform={p}
                    selected={platforms.includes(p)}
                    onToggle={() => togglePlatform(p)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reel count</Label>
              <FilterTabs value={reelCountMode} onChange={setReelCountMode} options={REEL_COUNT_OPTIONS} />
              <p className="text-[11.5px] font-medium text-muted-1">
                Auto picks the optimal count based on video length.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl py-5.5"
                onClick={() => setStep("select")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting || platforms.length === 0}
                onClick={handleStartProcessing}
                className="flex-[2] gap-2 rounded-xl py-5.5 text-[15px] font-extrabold"
              >
                <Rocket className="size-4" />
                Start processing
              </Button>
            </div>
          </div>
        </NewProjectModalShell>
      )}
    </>
  );
}
