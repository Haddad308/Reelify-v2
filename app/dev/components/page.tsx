import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VideoThumbnail } from "@/components/domain/video-thumbnail";
import { ReelStatusBadge, ProjectStatusBadge } from "@/components/domain/status-badge";
import { PlatformBadge } from "@/components/domain/platform-badge";
import { GradientAvatar } from "@/components/domain/gradient-avatar";
import { SectionLabel } from "@/components/domain/section-label";
import { WORKSPACE_GRADIENTS, THUMBNAIL_GRADIENTS } from "@/lib/gradients";
import { FilterTabsInner } from "./filter-tabs-inner";

// Scratch kitchen-sink page for visually verifying design-token fidelity —
// not part of the shipped app; safe to delete once Phase 1 is verified.
export default function ComponentsKitchenSinkPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 p-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        Kitchen sink
      </h1>

      <section className="space-y-3">
        <SectionLabel>Buttons</SectionLabel>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Inputs</SectionLabel>
        <div className="flex max-w-sm flex-col gap-3">
          <Input placeholder="Email address" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Badges — shadcn base</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Reel status badges</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <ReelStatusBadge status="draft" />
          <ReelStatusBadge status="ready" />
          <ReelStatusBadge status="published" />
          <ReelStatusBadge status="draft" variant="solid" />
          <ReelStatusBadge status="ready" variant="solid" />
          <ReelStatusBadge status="published" variant="solid" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Project status badges</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <ProjectStatusBadge status="uploading" variant="solid" />
          <ProjectStatusBadge status="processing" variant="solid" />
          <ProjectStatusBadge status="completed" variant="solid" />
          <ProjectStatusBadge status="failed" variant="solid" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Platform badges</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <PlatformBadge platform="tiktok" />
          <PlatformBadge platform="instagram_reels" />
          <PlatformBadge platform="youtube_shorts" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Gradient avatars</SectionLabel>
        <div className="flex flex-wrap items-center gap-3">
          {WORKSPACE_GRADIENTS.map((g) => (
            <GradientAvatar
              key={g.name}
              initials="NV"
              from={g.from}
              to={g.to}
              shape="square"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Filter tabs</SectionLabel>
        <FilterTabsInner />
      </section>

      <section className="space-y-3">
        <SectionLabel>Video thumbnail</SectionLabel>
        <div className="grid grid-cols-4 gap-3">
          {THUMBNAIL_GRADIENTS.slice(0, 4).map((g, i) => (
            <VideoThumbnail
              key={i}
              gradient={g}
              className="aspect-9/16 rounded-2xl"
              topRight={<ReelStatusBadge status="published" variant="solid" />}
              bottomLeft={<PlatformBadge platform="tiktok" variant="dark" />}
              bottomRight={
                <span className="rounded-md bg-black/38 px-1.5 py-0.5 text-[11px] font-semibold text-white/85">
                  0:15
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Modal (Base UI dialog)</SectionLabel>
        <Dialog>
          <DialogTrigger render={<Button>Open modal</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-ink-secondary">
              Modal shell for tokens verification.
            </p>
          </DialogContent>
        </Dialog>
      </section>

      <section
        className="dark space-y-3 rounded-2xl bg-background p-6 text-foreground"
      >
        <SectionLabel>Dark shell (Reel Editor scope)</SectionLabel>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Publish</Button>
          <Button variant="secondary">Save draft</Button>
          <ReelStatusBadge status="published" variant="solid" />
        </div>
      </section>
    </div>
  );
}
