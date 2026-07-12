"use client";

import { useState } from "react";
import { Share2, Copy, Check, X as XIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { ReelStatusBadge } from "@/components/domain/status-badge";
import { PlatformBadge } from "@/components/domain/platform-badge";
import { useShareStore } from "@/stores/useShareStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { formatDuration } from "@/lib/format";
import type { Project, Reel, ShareExpiry } from "@/types/reelify";

const EXPIRY_OPTIONS: ShareExpiry[] = ["1 day", "7 days", "30 days", "Never"];

export function ShareProjectDialog({
  project,
  reels,
  open,
  onOpenChange,
}: {
  project: Project;
  reels: Reel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createShare = useShareStore((s) => s.createShare);
  const { firstName, lastName } = useProfileStore();
  const [step, setStep] = useState<"select" | "invite">("select");
  const [selected, setSelected] = useState<Set<string>>(new Set(reels.map((r) => r.id)));
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState(
    `Hey — here are the reels from ${project.name} for your review. Let me know what you think!`,
  );
  const [expiresIn, setExpiresIn] = useState<ShareExpiry>("7 days");
  const [allowDownload, setAllowDownload] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const selectedReels = reels.filter((r) => selected.has(r.id));
  const totalRuntimeMs = selectedReels.reduce((sum, r) => sum + r.durationMs, 0);

  function toggleReel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setStep("select");
    setSelected(new Set(reels.map((r) => r.id)));
    setEmails([]);
    setEmailInput("");
    setShareLink(null);
  }

  function handleSendInvite() {
    const finalEmails = emailInput.trim() ? [...emails, emailInput.trim()] : emails;
    if (finalEmails.length === 0) {
      toast.error("Add at least one email address");
      return;
    }
    const share = createShare({
      scope: "project",
      projectId: project.id,
      reelIds: Array.from(selected),
      invitedEmails: finalEmails,
      message,
      expiresIn,
      allowDownload,
      inviterName: `${firstName} ${lastName}`.trim() || "Your teammate",
    });
    const link = `${window.location.origin}/review/${share.token}`;
    setShareLink(link);
    toast.success("Invite sent");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="w-[580px] max-w-full rounded-[22px] p-8 sm:max-w-full">
        <DialogHeader className="mb-1">
          <div className="mb-3 flex size-8.5 items-center justify-center rounded-xl bg-brand-tint">
            <Share2 className="size-4 text-brand" />
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight text-ink">
            {step === "select" ? "Share project for review" : "Invite clients"}
          </DialogTitle>
          <p className="text-[13.5px] font-medium text-ink-tertiary">
            {step === "select"
              ? "Choose which reels to include — clients review them all in one link"
              : "Clients review the selected reels all in one session"}
          </p>
        </DialogHeader>

        {step === "select" && !shareLink && (
          <>
            <div className="mb-3 flex items-center justify-between rounded-xl bg-fill-subtle p-3">
              <div className="flex items-center gap-3">
                <VideoThumbnail
                  gradient={project.thumbnailGradient}
                  className="h-9.5 w-11 shrink-0 rounded-md"
                  playButtonSize="sm"
                />
                <div>
                  <div className="text-sm font-bold text-ink">{project.name}</div>
                  <div className="text-xs font-medium text-muted-1">{reels.length} reels total</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-ink">{selected.size} selected</span>
                <button
                  type="button"
                  className="text-xs font-bold text-brand"
                  onClick={() => setSelected(new Set(reels.map((r) => r.id)))}
                >
                  Select all
                </button>
              </div>
            </div>

            <div className="mb-4 max-h-72 space-y-1.5 overflow-y-auto">
              {reels.map((reel) => {
                const checked = selected.has(reel.id);
                return (
                  <div
                    key={reel.id}
                    onClick={() => toggleReel(reel.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 ${
                      checked ? "border-brand-border bg-brand-tint" : "border-border-subtle"
                    }`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleReel(reel.id)} />
                    <VideoThumbnail
                      gradient={reel.thumbnailGradient}
                      className="h-12.5 w-9 shrink-0 rounded-md"
                      playButtonSize="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm ${checked ? "font-bold text-ink" : "font-semibold text-muted-1"}`}
                      >
                        {reel.title}
                      </div>
                      <div className="text-xs font-medium text-muted-1">
                        {formatDuration(reel.durationMs)}
                      </div>
                    </div>
                    <ReelStatusBadge status={reel.status} />
                    {reel.platform && <PlatformBadge platform={reel.platform} />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-1">
                {selected.size} reels · {formatDuration(totalRuntimeMs)} total runtime
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  className="gap-2 rounded-xl font-extrabold"
                  disabled={selected.size === 0}
                  onClick={() => setStep("invite")}
                >
                  Next: Invite clients
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "invite" && !shareLink && (
          <>
            <div className="mb-4 space-y-2">
              <Label>Invite clients</Label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-input p-2">
                {emails.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1.5 rounded-full bg-fill-3 py-1 pr-1.5 pl-2.5 text-xs font-semibold text-ink"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setEmails(emails.filter((e) => e !== email))}
                      aria-label={`Remove ${email}`}
                    >
                      <XIcon className="size-3 text-muted-1" />
                    </button>
                  </span>
                ))}
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      if (emailInput.trim()) {
                        setEmails([...emails, emailInput.trim()]);
                        setEmailInput("");
                      }
                    }
                  }}
                  placeholder="Add email address…"
                  className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
                />
              </div>
            </div>

            <div className="mb-4 space-y-1.5">
              <Label htmlFor="project-share-message">
                Message <span className="font-medium text-muted-1">(optional)</span>
              </Label>
              <Textarea
                id="project-share-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-fill-subtle p-3.5">
              <div>
                <Label className="mb-1.5 block">Link expires</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="w-full rounded-lg border border-border-input bg-white px-2.5 py-1.5 text-left text-sm font-semibold text-ink"
                      >
                        {expiresIn}
                      </button>
                    }
                  />
                  <DropdownMenuContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <DropdownMenuItem key={opt} onClick={() => setExpiresIn(opt)}>
                        {opt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <Label className="mb-1.5 block">Allow download</Label>
                <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button className="flex-[2] gap-2 rounded-xl font-extrabold" onClick={handleSendInvite}>
                <Check className="size-4" />
                Send invite
              </Button>
            </div>
          </>
        )}

        {shareLink && (
          <>
            <div className="mb-5 space-y-1.5">
              <Label>Shareable link</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border-input bg-fill-subtle px-3 py-2">
                <span className="flex-1 truncate text-sm font-medium text-ink-secondary">
                  {shareLink}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
            </div>
            <Button className="w-full rounded-xl font-extrabold" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
