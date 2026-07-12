import { nanoid } from "nanoid";
import type { Caption, Platform, Project, Reel, ReelStatus } from "@/types/reelify";
import { THUMBNAIL_GRADIENTS } from "@/lib/gradients";

const SAMPLE_CAPTION_TEXTS = [
  "Meet our summer sensation",
  "Refreshing. Bold. Zero calories.",
  "Try it now ↓",
];

function makeSampleCaptions(durationMs: number): Caption[] {
  const third = Math.round(durationMs / 3);
  return [
    {
      id: `cap_${nanoid(6)}`,
      startMs: 0,
      endMs: third,
      text: SAMPLE_CAPTION_TEXTS[0],
      style: { size: "M", position: "bot", color: "#FFFFFF", background: "box" },
    },
    {
      id: `cap_${nanoid(6)}`,
      startMs: third,
      endMs: third * 2,
      text: SAMPLE_CAPTION_TEXTS[1],
      style: { size: "M", position: "bot", color: "#FFFFFF", background: "box" },
    },
    {
      id: `cap_${nanoid(6)}`,
      startMs: third * 2,
      endMs: durationMs,
      text: SAMPLE_CAPTION_TEXTS[2],
      style: { size: "M", position: "bot", color: "#FFFFFF", background: "box" },
    },
  ];
}

const PLATFORM_CYCLE: Platform[] = ["tiktok", "instagram_reels", "youtube_shorts"];

const REEL_TITLE_POOL = [
  "Opening hook",
  "Product close-up",
  "Brand moment",
  "Testimonial",
  "Call to action",
  "Behind the scenes",
  "Founder story",
  "Customer reaction",
  "Product in use",
  "Quick tip",
  "Before & after",
  "Team spotlight",
  "Unboxing moment",
  "Feature highlight",
  "Closing shot",
];

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeReels(
  projectId: string,
  count: number,
  publishedCount: number,
): Reel[] {
  return Array.from({ length: count }, (_, i) => {
    const status: ReelStatus =
      i < publishedCount ? "published" : i === publishedCount ? "ready" : "draft";
    const durationMs = 12_000 + (i % 4) * 6_000;
    const clipStartMs = i * 15_000;
    const clipEndMs = clipStartMs + durationMs;
    return {
      id: `reel_${nanoid(8)}`,
      projectId,
      source: { videoId: "", startMs: clipStartMs, endMs: clipEndMs },
      trim: { startMs: clipStartMs, endMs: clipEndMs },
      title: REEL_TITLE_POOL[i % REEL_TITLE_POOL.length],
      score: 0.7 + (i % 5) * 0.05,
      durationMs,
      status,
      platform: PLATFORM_CYCLE[i % PLATFORM_CYCLE.length],
      captions: makeSampleCaptions(durationMs),
      music: { trackId: "none", volume: 70 },
      effect: "none",
      thumbnailGradient: THUMBNAIL_GRADIENTS[i % THUMBNAIL_GRADIENTS.length],
      createdAt: daysAgo(count - i),
    };
  });
}

interface DemoProjectSpec {
  name: string;
  status: Project["status"];
  reelCount: number;
  publishedCount: number;
  sourceDurationMs: number;
  uploadedDaysAgo: number;
  uploadProgress?: number;
  processingProgress?: number;
  sourceSizeBytes?: number;
}

const DEMO_PROJECTS: DemoProjectSpec[] = [
  {
    name: "Summer Launch 2025",
    status: "completed",
    reelCount: 12,
    publishedCount: 4,
    sourceDurationMs: 48_000,
    uploadedDaysAgo: 24,
  },
  {
    name: "Product Demo Q3",
    status: "processing",
    reelCount: 0,
    publishedCount: 0,
    sourceDurationMs: 72_000,
    uploadedDaysAgo: 22,
    processingProgress: 45,
  },
  {
    name: "Brand Story Film",
    status: "uploading",
    reelCount: 0,
    publishedCount: 0,
    sourceDurationMs: 154_000,
    uploadedDaysAgo: 21,
    uploadProgress: 67,
    sourceSizeBytes: 486 * 1024 * 1024,
  },
  {
    name: "Founder Interview",
    status: "completed",
    reelCount: 8,
    publishedCount: 2,
    sourceDurationMs: 208_000,
    uploadedDaysAgo: 27,
  },
  {
    name: "Holiday Campaign",
    status: "completed",
    reelCount: 15,
    publishedCount: 8,
    sourceDurationMs: 115_000,
    uploadedDaysAgo: 30,
  },
];

/** Seeds a handful of mockup-realistic demo projects/reels for a freshly created workspace. */
export function seedWorkspaceDemoData(workspaceId: string): {
  projects: Project[];
  reels: Reel[];
} {
  const projects: Project[] = [];
  const reels: Reel[] = [];

  DEMO_PROJECTS.forEach((spec, i) => {
    const projectId = `proj_${nanoid(8)}`;
    projects.push({
      id: projectId,
      workspaceId,
      name: spec.name,
      targetPlatforms: ["tiktok", "instagram_reels"],
      reelCountMode: "auto",
      status: spec.status,
      uploadProgress: spec.uploadProgress,
      processingProgress: spec.processingProgress,
      sourceDurationMs: spec.sourceDurationMs,
      sourceSizeBytes: spec.sourceSizeBytes,
      thumbnailGradient: THUMBNAIL_GRADIENTS[i % THUMBNAIL_GRADIENTS.length],
      createdAt: daysAgo(spec.uploadedDaysAgo),
    });

    if (spec.reelCount > 0) {
      reels.push(...makeReels(projectId, spec.reelCount, spec.publishedCount));
    }
  });

  return { projects, reels };
}
