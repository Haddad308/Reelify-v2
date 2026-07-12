"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Tag, Copy, Download, Trash2, Share2 } from "lucide-react";
import { VideoThumbnail } from "./video-thumbnail";
import { ReelStatusBadge } from "./status-badge";
import { PlatformBadge } from "./platform-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ShareReelDialog } from "@/components/share/share-reel-dialog";
import { useReelStore } from "@/stores/useReelStore";
import { formatDuration } from "@/lib/format";
import type { Reel } from "@/types/reelify";

export function ReelCard({ reel }: { reel: Reel }) {
  const router = useRouter();
  const updateReel = useReelStore((s) => s.updateReel);
  const removeReel = useReelStore((s) => s.removeReel);
  const addReels = useReelStore((s) => s.addReels);
  const [shareOpen, setShareOpen] = useState(false);

  const editHref = `/projects/${reel.projectId}/reels/${reel.id}/edit`;

  function togglePublish() {
    if (reel.status === "published") {
      updateReel(reel.id, { status: "ready" });
    } else {
      updateReel(reel.id, { status: "published", publishedAt: new Date().toISOString() });
    }
  }

  function handleDuplicate() {
    addReels([
      {
        ...reel,
        id: `reel_${crypto.randomUUID().slice(0, 8)}`,
        title: `${reel.title} (copy)`,
        status: "draft",
        publishedAt: undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    toast.success("Reel duplicated");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white">
      <VideoThumbnail
        gradient={reel.thumbnailGradient}
        className="h-[258px] w-full"
        playButtonSize="sm"
        topRight={
          <ReelStatusBadge
            status={reel.status}
            variant={reel.status === "published" ? "solid" : "soft"}
            className="text-[10px] px-1.5 py-0.5"
          />
        }
        bottomLeft={reel.platform && <PlatformBadge platform={reel.platform} variant="dark" />}
        bottomRight={
          <span className="rounded-md bg-black/38 px-1.5 py-0.5 text-[10.5px] font-semibold text-white/60">
            {formatDuration(reel.durationMs)}
          </span>
        }
      />
      <div className="p-2.5 pb-3">
        <div className="mb-2 truncate text-[13px] font-bold text-ink">{reel.title}</div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="flex-1 rounded-lg text-[11.5px]"
            render={<Link href={editHref}>Edit</Link>}
          />
          <Button
            variant={reel.status === "published" ? "outline" : "default"}
            size="sm"
            className="flex-1 rounded-lg text-[11.5px] font-bold"
            onClick={togglePublish}
          >
            {reel.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border-input bg-white"
                >
                  <MoreHorizontal className="size-3.5 text-muted-1" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push(editHref)}>
                <Pencil className="size-3.5" /> Edit reel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const next = prompt("Rename reel", reel.title);
                  if (next) updateReel(reel.id, { title: next });
                }}
              >
                <Tag className="size-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="size-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <Share2 className="size-3.5" /> Share for review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Download isn't available in this preview yet")}>
                <Download className="size-3.5" /> Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => removeReel(reel.id)}>
                <Trash2 className="size-3.5" /> Delete reel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ShareReelDialog
        reel={reel}
        projectId={reel.projectId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
