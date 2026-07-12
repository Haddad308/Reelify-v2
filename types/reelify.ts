// ---------------------------------------------------------------------------
// Real backend types (https://api.reelify.cc) — shapes are owned by that
// service; keep these 1:1 with the documented contract, never extended here.
// ---------------------------------------------------------------------------

export type ProcessingJobStatus =
  | "QUEUED"
  | "PROCESSING_AUDIO"
  | "TRANSCRIBING"
  | "SCORING_CLIPS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type VideoStatus =
  | "UPLOADING"
  | "UPLOADED"
  | "PROCESSING"
  | "READY"
  | "FAILED";

export interface Video {
  id: string;
  status: VideoStatus;
  sizeBytes: number;
  durationMs: number | null;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  videoId: string;
  status: ProcessingJobStatus;
  pipelineVersion: string;
  cancellationRequested: boolean;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClipCandidate {
  id: string;
  rank: number;
  score: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  title: string;
  category: string;
}

export interface Transcript {
  id: string;
  provider: string;
  model: string;
  language: string;
  durationMs: number;
  wordCount: number;
  text: string;
}

// ---------------------------------------------------------------------------
// App-domain types — everything the real backend doesn't have yet. Persisted
// locally (zustand + persist) and seeded with mockup-realistic sample data.
// See the implementation plan's "Data architecture" section for the
// reconciliation rules between ClipCandidate and Reel.
// ---------------------------------------------------------------------------

export type Platform = "tiktok" | "instagram_reels" | "youtube_shorts";

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  youtube_shorts: "YT Shorts",
};

export type ReelStatus = "draft" | "ready" | "published";

export type ProjectStatus = "uploading" | "processing" | "completed" | "failed";

export type ReelCountMode = "auto" | "5" | "10" | "15" | "20";

export type WorkspacePlan = "Starter" | "Pro" | "Business";

export interface Workspace {
  id: string;
  name: string;
  initials: string;
  gradientFrom: string;
  gradientTo: string;
  plan: WorkspacePlan;
  /** true only for the single pilot workspace real API calls are scoped to. */
  isReal: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  targetPlatforms: Platform[];
  reelCountMode: ReelCountMode;
  /** Set once the upload session completes; absent for seeded demo projects. */
  videoId?: string;
  processingJobId?: string;
  status: ProjectStatus;
  /** Cosmetic upload progress (0-100) before a processing job exists. */
  uploadProgress?: number;
  /** Cosmetic processing progress (0-100) for demo/seed projects with no real ProcessingJob to poll. */
  processingProgress?: number;
  sourceDurationMs?: number;
  sourceSizeBytes?: number;
  thumbnailGradient: [string, string];
  errorMessage?: string;
  createdAt: string;
}

export interface CaptionStyle {
  size: "M" | "L" | "XL";
  position: "top" | "mid" | "bot";
  color: string;
  background: "box" | "none";
}

export interface Caption {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  style: CaptionStyle;
}

export const MUSIC_TRACKS = [
  { id: "none", name: "No music" },
  { id: "upbeat-pop", name: "Upbeat Pop" },
  { id: "chill-lofi", name: "Chill Lo-Fi" },
  { id: "cinematic", name: "Cinematic Build" },
  { id: "corporate", name: "Corporate Bright" },
] as const;
export type MusicTrackId = (typeof MUSIC_TRACKS)[number]["id"];

export type ReelEffect = "none" | "bw" | "warm" | "cool" | "vignette";

export interface Reel {
  /** Equal to the source ClipCandidate id — the join key between real and local data. */
  id: string;
  projectId: string;
  source: {
    videoId: string;
    startMs: number;
    endMs: number;
  };
  /** Trim range within [source.startMs, source.endMs]; defaults to the full range. */
  trim: { startMs: number; endMs: number };
  title: string;
  score: number;
  durationMs: number;
  status: ReelStatus;
  platform: Platform | null;
  captions: Caption[];
  music: { trackId: MusicTrackId; volume: number };
  effect: ReelEffect;
  thumbnailGradient: [string, string];
  publishedAt?: string;
  createdAt: string;
}

export type CommentStatus = "open" | "resolved";

export interface CommentAuthor {
  name: string;
  initials: string;
  gradientFrom: string;
  gradientTo: string;
  isClient: boolean;
}

export interface Comment {
  id: string;
  reelId: string;
  author: CommentAuthor;
  timestampMs: number;
  body: string;
  status: CommentStatus;
  createdAt: string;
  parentId?: string;
}

export type ShareScope = "reel" | "project";
export type ShareExpiry = "1 day" | "7 days" | "30 days" | "Never";

export interface Share {
  id: string;
  token: string;
  scope: ShareScope;
  projectId: string;
  reelIds: string[];
  invitedEmails: string[];
  message: string;
  expiresIn: ShareExpiry;
  allowDownload: boolean;
  createdAt: string;
  inviterName: string;
}

export interface ReviewerIdentity {
  shareToken: string;
  email: string;
  name: string;
}
