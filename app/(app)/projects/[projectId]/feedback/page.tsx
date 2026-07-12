"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, ExternalLink, Send } from "lucide-react";
import { AppTopNav } from "@/components/nav/app-top-nav";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { GradientAvatar } from "@/components/domain/gradient-avatar";
import { PlatformBadge } from "@/components/domain/platform-badge";
import { ReelStatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/useProjectStore";
import { useReelStore } from "@/stores/useReelStore";
import { useCommentStore } from "@/stores/useCommentStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { formatDuration } from "@/lib/format";
import { initialsFromName } from "@/lib/gradients";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24)
    return `Today · ${new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedbackInboxPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const project = useProjectStore((s) => s.getProject(projectId));
  const allReels = useReelStore((s) => s.reels);
  const reels = useMemo(
    () => allReels.filter((r) => r.projectId === projectId),
    [allReels, projectId],
  );
  const comments = useCommentStore((s) => s.comments);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const addComment = useCommentStore((s) => s.addComment);
  const { firstName, lastName } = useProfileStore();
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const reelsWithComments = useMemo(
    () =>
      reels
        .map((reel) => {
          const reelComments = comments.filter((c) => c.reelId === reel.id);
          return {
            reel,
            open: reelComments.filter((c) => c.status === "open").length,
            resolved: reelComments.filter((c) => c.status === "resolved").length,
            total: reelComments.length,
          };
        })
        .filter((r) => r.total > 0),
    [reels, comments],
  );

  const totalOpen = reelsWithComments.reduce((sum, r) => sum + r.open, 0);
  const totalResolved = reelsWithComments.reduce((sum, r) => sum + r.resolved, 0);

  const selected = reelsWithComments.find((r) => r.reel.id === selectedReelId) ?? reelsWithComments[0];
  const threadComments = comments
    .filter((c) => c.reelId === selected?.reel.id)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  function handleReply(commentId: string) {
    const body = replyDrafts[commentId]?.trim();
    if (!body || !selected) return;
    addComment({
      reelId: selected.reel.id,
      author: {
        name: `${firstName} ${lastName}`.trim() || "You",
        initials: initialsFromName(`${firstName} ${lastName}`.trim() || "You"),
        gradientFrom: "#15161C",
        gradientTo: "#3F3F46",
        isClient: false,
      },
      timestampMs: 0,
      body,
      parentId: commentId,
    });
    setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
    toast.success("Reply sent");
  }

  if (!project) {
    return (
      <>
        <AppTopNav breadcrumb="Feedback" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm font-semibold text-ink-tertiary">Project not found.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppTopNav breadcrumb={`${project.name} · Feedback`} />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-65 shrink-0 flex-col border-r border-border-subtle bg-white">
          <div className="border-b border-border-subtle p-4">
            <div className="mb-0.5 text-sm font-extrabold text-ink">All Reels</div>
            <div className="text-xs font-medium text-muted-1">
              {reelsWithComments.length} reels · {totalOpen + totalResolved} total comments
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {reelsWithComments.map(({ reel, open, resolved }) => (
              <button
                key={reel.id}
                type="button"
                onClick={() => setSelectedReelId(reel.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border p-2 text-left",
                  reel.id === selected?.reel.id
                    ? "border-brand-border bg-brand-tint"
                    : "border-transparent",
                )}
              >
                <VideoThumbnail
                  gradient={reel.thumbnailGradient}
                  className="h-10.5 w-7.5 shrink-0 rounded-md"
                  playButtonSize="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-ink">{reel.title}</div>
                  <div className="flex items-center gap-1.5">
                    {open > 0 && (
                      <span className="rounded-full bg-[#FFF0F3] px-1.5 py-0.5 text-[10.5px] font-bold text-danger">
                        {open} open
                      </span>
                    )}
                    {resolved > 0 && (
                      <span className="rounded-full bg-success-bg px-1.5 py-0.5 text-[10.5px] font-bold text-success">
                        {resolved} done
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {reelsWithComments.length === 0 && (
              <p className="p-3 text-center text-xs font-medium text-muted-1">
                No feedback yet on this project.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border-subtle p-3">
            <div className="rounded-xl bg-[#FFF0F3] p-3 text-center">
              <div className="text-lg font-extrabold text-danger">{totalOpen}</div>
              <div className="text-[11px] font-semibold text-danger">Open</div>
            </div>
            <div className="rounded-xl bg-success-bg p-3 text-center">
              <div className="text-lg font-extrabold text-success">{totalResolved}</div>
              <div className="text-[11px] font-semibold text-success">Resolved</div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-border-subtle bg-white p-4">
                <VideoThumbnail
                  gradient={selected.reel.thumbnailGradient}
                  className="h-12.5 w-9 shrink-0 rounded-md"
                  playButtonSize="sm"
                />
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-sm font-extrabold text-ink">{selected.reel.title}</span>
                    <ReelStatusBadge status={selected.reel.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-1">
                    <span>{formatDuration(selected.reel.durationMs)}</span>
                    {selected.reel.platform && <PlatformBadge platform={selected.reel.platform} />}
                    {selected.open > 0 && (
                      <span className="font-bold text-danger">{selected.open} open comments</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  className="gap-1.5"
                  render={
                    <Link href={`/projects/${projectId}/reels/${selected.reel.id}/edit`}>
                      <ExternalLink className="size-3.5" />
                      Open reel
                    </Link>
                  }
                />
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {threadComments
                  .filter((c) => !c.parentId)
                  .map((comment) => {
                    const replies = threadComments.filter((c) => c.parentId === comment.id);
                    return (
                      <div key={comment.id} className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
                        <div className="mb-2 flex items-center gap-2.5">
                          <GradientAvatar
                            initials={comment.author.initials}
                            from={comment.author.gradientFrom}
                            to={comment.author.gradientTo}
                            size="sm"
                          />
                          <span className="text-[13px] font-bold text-ink">{comment.author.name}</span>
                          <span className="flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand">
                            <Clock className="size-2.5" />
                            {formatDuration(comment.timestampMs)}
                          </span>
                          <span className="text-[11px] font-medium text-muted-1">
                            {relativeTime(comment.createdAt)}
                          </span>
                          {comment.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-auto text-xs"
                              onClick={() => resolveComment(comment.id)}
                            >
                              Mark resolved
                            </Button>
                          )}
                          {comment.status === "resolved" && (
                            <span className="ml-auto rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success">
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="mb-2 text-[13.5px] leading-relaxed font-medium text-ink-secondary">
                          {comment.body}
                        </p>

                        {replies.map((reply) => (
                          <div key={reply.id} className="mt-2 ml-4 border-l-2 border-border-subtle pl-3">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-xs font-bold text-ink">{reply.author.name}</span>
                              <span className="text-[11px] font-medium text-muted-1">
                                {relativeTime(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-[13px] font-medium text-ink-secondary">{reply.body}</p>
                          </div>
                        ))}

                        {comment.status === "open" && (
                          <div className="mt-3 flex gap-2">
                            <input
                              value={replyDrafts[comment.id] ?? ""}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))
                              }
                              onKeyDown={(e) => e.key === "Enter" && handleReply(comment.id)}
                              placeholder={`Reply to ${comment.author.name.split(" ")[0]}…`}
                              className="flex-1 rounded-lg border border-brand-border bg-brand-tint px-3 py-2 text-sm outline-none"
                            />
                            <Button size="sm" className="gap-1.5" onClick={() => handleReply(comment.id)}>
                              <Send className="size-3.5" />
                              Reply
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm font-semibold text-ink-tertiary">
                No client feedback yet — share a reel or project to start collecting it.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
