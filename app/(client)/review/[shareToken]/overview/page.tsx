"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/nav/logo";
import { GradientAvatar } from "@/components/domain/gradient-avatar";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { PlatformBadge } from "@/components/domain/platform-badge";
import { useShareStore } from "@/stores/useShareStore";
import { useReviewerStore } from "@/stores/useReviewerStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useReelStore } from "@/stores/useReelStore";
import { useCommentStore } from "@/stores/useCommentStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { initialsFromName } from "@/lib/gradients";
import { cn } from "@/lib/utils";

export default function ClientProjectOverviewPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = use(params);
  const router = useRouter();
  const hydrated = useHasHydrated();
  const share = useShareStore((s) => s.getShareByToken(shareToken));
  const identity = useReviewerStore((s) => s.getIdentity(shareToken));
  const project = useProjectStore((s) => (share ? s.getProject(share.projectId) : undefined));
  const reels = useReelStore((s) => s.reels);
  const isReelReviewed = useCommentStore((s) => s.isReelReviewed);
  const comments = useCommentStore((s) => s.comments);

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

  if (!share || !project || !identity) return null;

  const sharedReels = share.reelIds
    .map((id) => reels.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const reviewedCount = sharedReels.filter((r) => isReelReviewed(r.id)).length;
  const firstUnreviewedIndex = sharedReels.findIndex((r) => !isReelReviewed(r.id));
  const progressPct = sharedReels.length > 0 ? (reviewedCount / sharedReels.length) * 100 : 0;

  return (
    <>
      <nav className="flex h-[58px] shrink-0 items-center gap-3 border-b border-black/5 bg-white/60 px-6">
        <Logo />
        <div className="h-5 w-px bg-black/10" />
        <span className="text-[13px] font-medium text-ink-tertiary">
          Reviewing <span className="font-bold text-ink">{project.name}</span> · shared by{" "}
          <span className="font-bold text-ink">{share.inviterName}</span>
        </span>
        <div className="flex-1" />
        <GradientAvatar
          initials={initialsFromName(identity.name)}
          from="#818CF8"
          to="#6366F1"
          size="sm"
        />
        <span className="text-[13px] font-semibold text-ink">{identity.name}</span>
      </nav>

      <div className="border-b border-black/5 bg-white/60 px-7 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-[22px] font-extrabold tracking-tight text-ink">
              {project.name}
            </h1>
            <p className="text-[13.5px] font-medium text-ink-tertiary">
              {sharedReels.length} reels to review · leave feedback on each one
            </p>
          </div>
          <div className="text-right">
            <div className="mb-1.5 text-[13px] font-bold text-ink">
              {reviewedCount} of {sharedReels.length} reviewed
            </div>
            <div className="h-1.5 w-45 overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-5 gap-4 overflow-y-auto p-7">
        {sharedReels.map((reel, i) => {
          const reviewed = isReelReviewed(reel.id);
          const isActive = !reviewed && i === firstUnreviewedIndex;
          const commentCount = comments.filter((c) => c.reelId === reel.id).length;

          return (
            <div
              key={reel.id}
              className={cn(
                "overflow-hidden rounded-2xl border-[1.5px] bg-white",
                reviewed && "border-success-border",
                isActive && "border-2 border-brand shadow-[0_0_0_4px_rgba(244,63,94,.1)]",
                !reviewed && !isActive && "border-border-subtle opacity-70",
              )}
            >
              <VideoThumbnail
                gradient={reel.thumbnailGradient}
                className="h-45 w-full"
                playButtonSize={isActive ? "md" : "sm"}
                topRight={
                  reviewed ? (
                    <span className="flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white">
                      <Check className="size-2.5" /> Reviewed
                    </span>
                  ) : isActive ? (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-brand">
                      Up next
                    </span>
                  ) : undefined
                }
                bottomLeft={reel.platform && <PlatformBadge platform={reel.platform} variant="dark" />}
              />
              <div className="p-3">
                <div
                  className={cn(
                    "mb-2 truncate text-[13px]",
                    reviewed || isActive ? "font-bold text-ink" : "font-semibold text-muted-1",
                  )}
                >
                  {reel.title}
                </div>
                {reviewed ? (
                  <div className="rounded-lg bg-success-bg px-2.5 py-1.5 text-center text-xs font-bold text-success">
                    ✓ {commentCount} comment{commentCount === 1 ? "" : "s"} left
                  </div>
                ) : isActive ? (
                  <Link
                    href={`/review/${shareToken}/reels/${reel.id}`}
                    className="block rounded-lg bg-brand py-1.5 text-center text-xs font-bold text-white"
                  >
                    Review now →
                  </Link>
                ) : (
                  <div className="rounded-lg bg-fill-3 px-2.5 py-1.5 text-center text-xs font-semibold text-muted-1">
                    Not yet reviewed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
