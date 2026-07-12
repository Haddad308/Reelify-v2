"use client";

import { useState } from "react";
import { Share2, Copy, Check, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { PlatformBadge } from "@/components/domain/platform-badge";
import { useShareStore } from "@/stores/useShareStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { formatDuration } from "@/lib/format";
import type { Reel, ShareExpiry } from "@/types/reelify";

const EXPIRY_OPTIONS: ShareExpiry[] = ["1 day", "7 days", "30 days", "Never"];

export function ShareReelDialog({
  reel,
  projectId,
  open,
  onOpenChange,
}: {
  reel: Reel;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createShare = useShareStore((s) => s.createShare);
  const { firstName, lastName } = useProfileStore();
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState(
    `Hey — here's the ${reel.title.toLowerCase()} reel for your review. Let me know what you think!`,
  );
  const [expiresIn, setExpiresIn] = useState<ShareExpiry>("7 days");
  const [allowDownload, setAllowDownload] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  function addEmail() {
    const trimmed = emailInput.trim();
    if (trimmed && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setEmailInput("");
    }
  }

  function handleSendInvite() {
    if (emailInput.trim()) addEmail();
    const finalEmails = emailInput.trim()
      ? [...emails, emailInput.trim()]
      : emails;
    if (finalEmails.length === 0) {
      toast.error("Add at least one email address");
      return;
    }
    const share = createShare({
      scope: "reel",
      projectId,
      reelIds: [reel.id],
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

  function handleCopy() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setEmails([]);
          setEmailInput("");
          setShareLink(null);
        }
      }}
    >
      <DialogContent className="w-[520px] max-w-full rounded-[22px] p-8 sm:max-w-full">
        <DialogHeader className="mb-1">
          <div className="mb-3 flex size-8.5 items-center justify-center rounded-xl bg-brand-tint">
            <Share2 className="size-4 text-brand" />
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight text-ink">
            Share for client review
          </DialogTitle>
          <p className="text-[13.5px] font-medium text-ink-tertiary">
            Invite clients to watch and leave timestamped feedback
          </p>
        </DialogHeader>

        <div className="mb-4 flex items-center gap-3 rounded-xl bg-fill-subtle p-3">
          <VideoThumbnail
            gradient={reel.thumbnailGradient}
            className="h-18 w-13 shrink-0 rounded-lg"
            playButtonSize="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-ink">{reel.title}</div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-1">
              {formatDuration(reel.durationMs)}
              {reel.platform && (
                <>
                  <span>·</span>
                  <PlatformBadge platform={reel.platform} />
                </>
              )}
            </div>
          </div>
        </div>

        {!shareLink ? (
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
                      addEmail();
                    }
                  }}
                  placeholder="Add email address…"
                  className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
                />
              </div>
            </div>

            <div className="mb-4 space-y-1.5">
              <Label htmlFor="share-message">
                Message <span className="font-medium text-muted-1">(optional)</span>
              </Label>
              <Textarea
                id="share-message"
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
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-[2] gap-2 rounded-xl font-extrabold" onClick={handleSendInvite}>
                <Check className="size-4" />
                Send invite
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5 space-y-1.5">
              <Label>Shareable link</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border-input bg-fill-subtle px-3 py-2">
                <span className="flex-1 truncate text-sm font-medium text-ink-secondary">
                  {shareLink}
                </span>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
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
