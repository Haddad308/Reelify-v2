"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClipCandidates } from "@/lib/reelifyApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { useReelStore } from "@/stores/useReelStore";
import { gradientForIndex } from "@/lib/gradients";
import type { ClipCandidate, Project, Reel } from "@/types/reelify";

function clipCandidateToReel(candidate: ClipCandidate, project: Project, index: number): Reel {
  return {
    id: candidate.id,
    projectId: project.id,
    source: {
      videoId: project.videoId!,
      startMs: candidate.startMs,
      endMs: candidate.endMs,
    },
    trim: { startMs: candidate.startMs, endMs: candidate.endMs },
    title: candidate.title,
    score: candidate.score,
    durationMs: candidate.durationMs,
    status: "draft",
    platform: project.targetPlatforms[0] ?? null,
    captions: [],
    music: { trackId: "none", volume: 70 },
    effect: "none",
    thumbnailGradient: gradientForIndex(index),
    createdAt: new Date().toISOString(),
  };
}

/**
 * The single reconciliation point between the real backend's ClipCandidate
 * shape and this app's richer local Reel shape. Once a real project's job is
 * COMPLETED, fetches clip-candidates and merges any not already present into
 * useReelStore (keyed by candidate id, so repeated visits/reloads don't
 * duplicate). Returns the project's reels from the store either way — demo
 * projects (no videoId) just read whatever was seeded.
 */
export function useReelsForProject(project: Project | undefined): Reel[] {
  const token = useAuthStore((s) => s.session?.accessToken);
  const reels = useReelStore((s) => s.reels);
  const addReels = useReelStore((s) => s.addReels);

  const canFetchReal = Boolean(project?.status === "completed" && project?.videoId && token);

  const { data: candidates } = useQuery({
    queryKey: ["clipCandidates", project?.videoId],
    queryFn: () => getClipCandidates(project!.videoId!, token!),
    enabled: canFetchReal,
  });

  useEffect(() => {
    if (!candidates || !project) return;
    const existingIds = new Set(
      reels.filter((r) => r.projectId === project.id).map((r) => r.id),
    );
    const missing = candidates.filter((c) => !existingIds.has(c.id));
    if (missing.length > 0) {
      addReels(missing.map((c, i) => clipCandidateToReel(c, project, i)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, project?.id]);

  return project ? reels.filter((r) => r.projectId === project.id) : [];
}
