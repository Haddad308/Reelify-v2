"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Logo } from "@/components/nav/logo";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { PlatformDot } from "@/components/domain/platform-badge";
import { GradientAvatar } from "@/components/domain/gradient-avatar";
import { Button } from "@/components/ui/button";
import { useShareStore } from "@/stores/useShareStore";
import { useReviewerStore } from "@/stores/useReviewerStore";
import { useReelStore } from "@/stores/useReelStore";
import { useCommentStore } from "@/stores/useCommentStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { PLATFORM_LABEL, type Reel, type ReviewerIdentity, type Share } from "@/types/reelify";
import { formatDuration } from "@/lib/format";
import { initialsFromName } from "@/lib/gradients";
import { cn } from "@/lib/utils";

const CLIENT_AVATAR_GRADIENTS = [
  ["#818CF8", "#8B5CF6"],
  ["#F59E0B", "#EF4444"],
  ["#34D399", "#059669"],
] as const;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Today · ${new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return new Date(iso).toLocaleDateString();
}

export default function ClientReviewViewPage({
  params,
}: {
  params: Promise<{ shareToken: string; reelId: string }>;
}) {
  const { shareToken, reelId } = use(params);
  const router = useRouter();
  const hydrated = useHasHydrated();
  const share = useShareStore((s) => s.getShareByToken(shareToken));
  const identity = useReviewerStore((s) => s.getIdentity(shareToken));
  const reels = useReelStore((s) => s.reels);

  useEffect(() => {
    if (hydrated && share && !identity) router.replace(`/review/${shareToken}`);
  }, [hydrated, share, identity, router, shareToken]);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-border-input border-t-brand" />
      </div>
    );
  }

  if (!share || !identity) return null;

  const reel = reels.find((r) => r.id === reelId);
  if (!reel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-ink-tertiary">Reel not found.</p>
      </div>
    );
  }

  const sharedReels = share.reelIds
    .map((id) => reels.find((r) => r.id === id))
    .filter((r): r is Reel => Boolean(r));

  return (
    // Keyed by reel.id so navigating between shared reels remounts (and
    // resets) the player state fresh, instead of syncing it via an effect.
    <ReviewBody
      key={reel.id}
      reel={reel}
      share={share}
      identity={identity}
      sharedReels={sharedReels}
      shareToken={shareToken}
    />
  );
}

function ReviewBody({
  reel,
  share,
  identity,
  sharedReels,
  shareToken,
}: {
  reel: Reel;
  share: Share;
  identity: ReviewerIdentity;
  sharedReels: Reel[];
  shareToken: string;
}) {
  const router = useRouter();
  const comments = useCommentStore((s) => s.comments);
  const addComment = useCommentStore((s) => s.addComment);
  const isReelReviewed = useCommentStore((s) => s.isReelReviewed);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [draft, setDraft] = useState("");

  const totalMs = reel.trim.endMs - reel.trim.startMs;

  useEffect(() => {
    if (!isPlaying || totalMs === 0) return;
    const interval = setInterval(() => {
      setCurrentTimeMs((t) => {
        const next = t + 200;
        if (next >= totalMs) {
          setIsPlaying(false);
          return totalMs;
        }
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, totalMs]);

  const currentIndex = sharedReels.findIndex((r) => r.id === reel.id);
  const reelComments = comments
    .filter((c) => c.reelId === reel.id)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  const expiresLabel =
    share.expiresIn === "Never" ? "No expiry" : `Expires in ${share.expiresIn}`;

  const activeCaptionComment = reelComments.find(
    (c) => currentTimeMs >= c.timestampMs && currentTimeMs < c.timestampMs + 3000,
  );

  function handlePost() {
    if (!draft.trim()) return;
    addComment({
      reelId: reel.id,
      author: {
        name: identity.name,
        initials: initialsFromName(identity.name),
        gradientFrom: CLIENT_AVATAR_GRADIENTS[0][0],
        gradientTo: CLIENT_AVATAR_GRADIENTS[0][1],
        isClient: true,
      },
      timestampMs: currentTimeMs,
      body: draft.trim(),
    });
    setDraft("");
    toast.success("Feedback posted");
  }

  function handleSeekFromClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setCurrentTimeMs(Math.round(pct * totalMs));
  }

  return (
    <>
      <nav className="flex h-[58px] shrink-0 items-center gap-3 border-b border-black/5 bg-white/60 px-6">
        <Logo />
        <div className="h-5 w-px bg-black/10" />
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-tertiary">
          <Clock className="size-3.5" />
          Review requested by <span className="font-bold text-ink">{share.inviterName}</span>
        </span>
        <div className="flex-1" />
        <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand">
          {expiresLabel}
        </span>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto p-7">
          {sharedReels.length > 1 && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/70 p-3">
              <button
                type="button"
                disabled={currentIndex <= 0}
                onClick={() =>
                  router.push(`/review/${shareToken}/reels/${sharedReels[currentIndex - 1].id}`)
                }
                aria-label="Previous reel"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border-input bg-white disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <div className="flex flex-1 gap-2 overflow-x-auto">
                {sharedReels.map((r) => {
                  const reviewed = isReelReviewed(r.id);
                  const active = r.id === reel.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => router.push(`/review/${shareToken}/reels/${r.id}`)}
                      className="flex shrink-0 flex-col items-center gap-1"
                    >
                      <div className="relative">
                        <VideoThumbnail
                          gradient={r.thumbnailGradient}
                          className={cn(
                            "h-13.5 w-9.5 rounded-md border-2",
                            active ? "border-brand" : reviewed ? "border-success" : "border-border-subtle",
                          )}
                          playButtonSize="sm"
                        />
                        {reviewed && (
                          <div className="absolute right-0.5 bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-success">
                            <Check className="size-2 text-white" />
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "max-w-14 truncate text-[10.5px] font-semibold",
                          active ? "text-brand" : "text-muted-1",
                        )}
                      >
                        {r.title}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="shrink-0 text-xs font-bold text-ink">
                {currentIndex + 1} / {sharedReels.length}
              </span>
              <button
                type="button"
                disabled={currentIndex >= sharedReels.length - 1}
                onClick={() =>
                  router.push(`/review/${shareToken}/reels/${sharedReels[currentIndex + 1].id}`)
                }
                aria-label="Next reel"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand disabled:opacity-40"
              >
                <ChevronRight className="size-3.5 text-white" />
              </button>
            </div>
          )}

          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="mb-4 flex w-[200px] items-center justify-between">
              <span className="text-lg font-extrabold tracking-tight text-ink">{reel.title}</span>
            </div>
            {reel.platform && (
              <div className="mb-4 flex items-center gap-1.5 rounded-full border border-border-input bg-white px-3 py-1">
                <PlatformDot platform={reel.platform} />
                <span className="text-xs font-semibold text-ink-secondary">
                  {PLATFORM_LABEL[reel.platform]} · {formatDuration(reel.durationMs)}
                </span>
              </div>
            )}

            <div
              className="relative h-89 w-50 overflow-hidden rounded-[18px] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
              style={{
                backgroundImage: `linear-gradient(180deg, ${reel.thumbnailGradient[0]}, ${reel.thumbnailGradient[1]})`,
              }}
            >
              {activeCaptionComment && (
                <div className="absolute right-0 bottom-8 left-0 z-20 px-3 text-center">
                  <div className="inline-block rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-bold text-white">
                    {activeCaptionComment.body}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="absolute inset-0 z-10 flex items-center justify-center"
              >
                <div className="flex size-13 items-center justify-center rounded-full bg-white/15">
                  {isPlaying ? (
                    <Pause className="size-5 fill-white/90 text-white/90" />
                  ) : (
                    <Play className="size-5 fill-white/90 text-white/90" />
                  )}
                </div>
              </button>
              <div className="absolute right-2.5 bottom-2.5 z-20 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold text-white/80">
                {formatDuration(currentTimeMs)} / {formatDuration(totalMs)}
              </div>
              <div
                onClick={handleSeekFromClick}
                className="absolute right-0 bottom-0 left-0 z-20 h-2 cursor-pointer bg-white/15"
              >
                <div
                  className="h-full bg-brand"
                  style={{ width: `${totalMs > 0 ? (currentTimeMs / totalMs) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCurrentTimeMs((t) => Math.max(0, t - 5000))}
                aria-label="Rewind 5 seconds"
                className="flex size-8 items-center justify-center rounded-lg bg-white"
              >
                <SkipBack className="size-3.5 text-ink-tertiary" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex size-10 items-center justify-center rounded-full bg-brand"
              >
                {isPlaying ? (
                  <Pause className="size-4 fill-white text-white" />
                ) : (
                  <Play className="size-4 fill-white text-white" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setCurrentTimeMs((t) => Math.min(totalMs, t + 5000))}
                aria-label="Skip forward 5 seconds"
                className="flex size-8 items-center justify-center rounded-lg bg-white"
              >
                <SkipForward className="size-3.5 text-ink-tertiary" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-95 shrink-0 flex-col border-l border-black/5 bg-white">
          <div className="border-b border-border-subtle p-5">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[15px] font-extrabold text-ink">Feedback</span>
              <span className="rounded-full bg-fill-3 px-2 py-0.5 text-[11px] font-bold text-ink-tertiary">
                {reelComments.length} comments
              </span>
            </div>
            <p className="text-xs font-medium text-muted-1">
              Click anywhere on the timeline to pin feedback to that moment
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {reelComments.map((comment) => (
              <div key={comment.id} className="rounded-2xl bg-fill-subtle p-3.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <GradientAvatar
                    initials={comment.author.initials}
                    from={comment.author.gradientFrom}
                    to={comment.author.gradientTo}
                    size="sm"
                  />
                  <span className="text-[13px] font-bold text-ink">{comment.author.name}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentTimeMs(comment.timestampMs)}
                    className="flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand"
                  >
                    <Clock className="size-2.5" />
                    {formatDuration(comment.timestampMs)}
                  </button>
                  <span className="ml-auto text-[11px] font-medium text-muted-1">
                    {relativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed font-medium text-ink-secondary">
                  {comment.body}
                </p>
              </div>
            ))}
            {reelComments.length === 0 && (
              <p className="p-2 text-center text-xs font-medium text-muted-1">
                No feedback yet — be the first to comment.
              </p>
            )}
          </div>

          <div className="border-t border-border-subtle p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand">
                <Clock className="size-2.5" />
                {formatDuration(currentTimeMs)}
              </span>
              <span className="text-[11px] font-medium text-muted-1">pinned to current time</span>
            </div>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePost()}
                placeholder="Add feedback…"
                className="flex-1 rounded-lg border border-border-input px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <Button size="sm" className="font-bold" onClick={handlePost} disabled={!draft.trim()}>
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
