"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { Logo } from "@/components/nav/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { useShareStore } from "@/stores/useShareStore";
import { useReviewerStore } from "@/stores/useReviewerStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useReelStore } from "@/stores/useReelStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";

export default function ReviewGatePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = use(params);
  const router = useRouter();
  const hydrated = useHasHydrated();
  const share = useShareStore((s) => s.getShareByToken(shareToken));
  const setIdentity = useReviewerStore((s) => s.setIdentity);
  const project = useProjectStore((s) => (share ? s.getProject(share.projectId) : undefined));
  const reel = useReelStore((s) =>
    share?.scope === "reel" ? s.getReel(share.reelIds[0]) : undefined,
  );
  const [name, setName] = useState("");

  // Persisted stores (localStorage) are already populated by the client's
  // first render but empty on the server — branching on them before
  // hydration completes would mismatch. Show a neutral loading state until then.
  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-border-input border-t-brand" />
      </div>
    );
  }

  if (!share || !project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-ink-tertiary">
          This review link is invalid or has expired.
        </p>
      </div>
    );
  }

  const email = share.invitedEmails[0] ?? "";

  function handleContinue() {
    if (!name.trim()) return;
    setIdentity({ shareToken, email, name: name.trim() });
    if (share!.scope === "reel") {
      router.push(`/review/${shareToken}/reels/${share!.reelIds[0]}`);
    } else {
      router.push(`/review/${shareToken}/overview`);
    }
  }

  return (
    <>
      <nav className="flex h-[58px] shrink-0 items-center border-b border-black/5 bg-white/60 px-6">
        <Logo />
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="mb-4 flex w-[460px] max-w-full items-center gap-3 rounded-2xl">
          <VideoThumbnail
            gradient={reel?.thumbnailGradient ?? project.thumbnailGradient}
            className="h-14.5 w-10.5 shrink-0 rounded-lg"
            playButtonSize="sm"
          />
          <div>
            <div className="text-sm font-bold text-ink">{reel?.title ?? project.name}</div>
            <div className="text-xs font-medium text-ink-tertiary">
              Shared by <span className="font-bold">{share.inviterName}</span>
            </div>
          </div>
        </div>

        <div className="w-[460px] max-w-full rounded-[22px] bg-white p-9 shadow-[0_4px_28px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="mx-auto mb-5 flex size-13 items-center justify-center rounded-2xl bg-brand-tint">
            <UserRound className="size-6 text-brand" strokeWidth={1.8} />
          </div>
          <h1 className="mb-2 text-center text-xl font-extrabold tracking-tight text-ink">
            Who&apos;s reviewing?
          </h1>
          <p className="mb-6.5 text-center text-[13.5px] leading-relaxed font-medium text-ink-tertiary">
            No account needed — just your name so {share.inviterName.split(" ")[0]} can see who
            left each comment.
          </p>

          <div className="mb-3.5 space-y-1.5">
            <Label>Email address</Label>
            <div className="flex items-center justify-between rounded-lg border border-border-input bg-fill-subtle px-3 py-2.5">
              <span className="text-sm font-medium text-ink-tertiary">{email}</span>
              <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success">
                Invited
              </span>
            </div>
          </div>

          <div className="mb-6 space-y-1.5">
            <Label htmlFor="reviewer-name">Your name</Label>
            <Input
              id="reviewer-name"
              autoFocus
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Button
            disabled={!name.trim()}
            onClick={handleContinue}
            className="w-full rounded-xl py-5.5 text-[15px] font-extrabold"
          >
            View reel & leave feedback
          </Button>

          <p className="mt-4 text-center text-xs font-medium text-muted-1">
            By continuing you agree to Reelify&apos;s{" "}
            <span className="font-semibold text-brand">Terms of Service</span>
          </p>
        </div>
      </div>
    </>
  );
}
