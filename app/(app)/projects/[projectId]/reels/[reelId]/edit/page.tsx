"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { EditorTopNav } from "@/components/editor/editor-top-nav";
import { EditorPreviewPane } from "@/components/editor/editor-preview-pane";
import { EditorTabs, type EditorTab } from "@/components/editor/editor-tabs";
import { CaptionsTimeline } from "@/components/editor/captions-timeline";
import { CaptionsList } from "@/components/editor/captions-list";
import { CaptionStylePanel } from "@/components/editor/caption-style-panel";
import { TrimTab } from "@/components/editor/trim-tab";
import { MusicTab } from "@/components/editor/music-tab";
import { EffectsTab } from "@/components/editor/effects-tab";
import { useReelStore } from "@/stores/useReelStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type { Caption } from "@/types/reelify";

export default function ReelEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; reelId: string }>;
}) {
  const { projectId, reelId } = use(params);
  const router = useRouter();
  const reel = useReelStore((s) => s.getReel(reelId));
  const updateReel = useReelStore((s) => s.updateReel);
  const project = useProjectStore((s) => s.getProject(projectId));

  const [tab, setTab] = useState<EditorTab>("captions");
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(
    reel?.captions[0]?.id ?? null,
  );
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const totalMs = reel ? reel.trim.endMs - reel.trim.startMs : 0;

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

  if (!reel || !project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-white/50">Reel not found.</p>
      </div>
    );
  }

  const selectedCaption = reel.captions.find((c) => c.id === selectedCaptionId) ?? null;
  const activeCaptionAtPlayhead = reel.captions.find(
    (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs,
  );

  function handleSeek(deltaMs: number) {
    setCurrentTimeMs((t) => Math.max(0, Math.min(totalMs, t + deltaMs)));
  }

  function handleSelectCaption(id: string) {
    setSelectedCaptionId(id);
    const caption = reel!.captions.find((c) => c.id === id);
    if (caption) setCurrentTimeMs(caption.startMs);
  }

  function handleAddCaption() {
    const lastEnd = reel!.captions.at(-1)?.endMs ?? 0;
    const newCaption: Caption = {
      id: `cap_${nanoid(6)}`,
      startMs: lastEnd,
      endMs: Math.min(lastEnd + 4000, totalMs),
      text: "New caption",
      style: { size: "M", position: "bot", color: "#FFFFFF", background: "box" },
    };
    updateReel(reel!.id, { captions: [...reel!.captions, newCaption] });
    setSelectedCaptionId(newCaption.id);
  }

  function handleDeleteCaption(id: string) {
    updateReel(reel!.id, { captions: reel!.captions.filter((c) => c.id !== id) });
    if (selectedCaptionId === id) setSelectedCaptionId(null);
  }

  function handleApplyCaptionStyle(patch: { text: string; style: Caption["style"] }) {
    updateReel(reel!.id, {
      captions: reel!.captions.map((c) => (c.id === selectedCaptionId ? { ...c, ...patch } : c)),
    });
    toast.success("Caption updated");
  }

  return (
    <>
      <EditorTopNav
        projectId={project.id}
        projectName={project.name}
        reelTitle={reel.title}
        platform={reel.platform}
        onSaveDraft={() => {
          updateReel(reel.id, { status: reel.status === "published" ? "published" : "draft" });
          toast.success("Draft saved");
        }}
        onPublish={() => {
          updateReel(reel.id, { status: "published", publishedAt: new Date().toISOString() });
          toast.success("Reel published");
          router.push(`/projects/${project.id}`);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <EditorPreviewPane
          gradient={reel.thumbnailGradient}
          platform={reel.platform}
          captionText={activeCaptionAtPlayhead?.text ?? null}
          currentTimeMs={currentTimeMs}
          totalMs={totalMs}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onSeek={handleSeek}
        />

        <div className="flex flex-1 flex-col">
          <EditorTabs value={tab} onChange={setTab} />

          {tab === "captions" && (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                <CaptionsTimeline
                  captions={reel.captions}
                  totalMs={totalMs}
                  currentTimeMs={currentTimeMs}
                  selectedCaptionId={selectedCaptionId}
                  onSelectCaption={handleSelectCaption}
                />
                <CaptionsList
                  captions={reel.captions}
                  selectedCaptionId={selectedCaptionId}
                  onSelect={handleSelectCaption}
                  onDelete={handleDeleteCaption}
                  onAdd={handleAddCaption}
                />
              </div>
              {selectedCaption && (
                <CaptionStylePanel
                  key={selectedCaption.id}
                  caption={selectedCaption}
                  onApply={handleApplyCaptionStyle}
                />
              )}
            </div>
          )}

          {tab === "trim" && (
            <TrimTab
              sourceStartMs={reel.source.startMs}
              sourceEndMs={reel.source.endMs}
              trimStartMs={reel.trim.startMs}
              trimEndMs={reel.trim.endMs}
              onChange={(trim) => updateReel(reel.id, { trim })}
            />
          )}

          {tab === "music" && (
            <MusicTab
              trackId={reel.music.trackId}
              volume={reel.music.volume}
              onChange={(patch) => updateReel(reel.id, { music: { ...reel.music, ...patch } })}
            />
          )}

          {tab === "effects" && (
            <EffectsTab effect={reel.effect} onChange={(effect) => updateReel(reel.id, { effect })} />
          )}
        </div>
      </div>
    </>
  );
}
