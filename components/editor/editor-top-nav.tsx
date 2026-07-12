import Link from "next/link";
import { ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import { PlatformDot } from "@/components/domain/platform-badge";
import { PLATFORM_LABEL, type Platform } from "@/types/reelify";

export function EditorTopNav({
  projectId,
  projectName,
  reelTitle,
  platform,
  onSaveDraft,
  onPublish,
}: {
  projectId: string;
  projectName: string;
  reelTitle: string;
  platform: Platform | null;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  return (
    <nav className="flex h-[58px] shrink-0 items-center gap-4 border-b border-white/8 bg-[#111218] px-5">
      <Link
        href={`/projects/${projectId}`}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-3 py-1.5 text-[13px] font-semibold text-white/70"
      >
        <ChevronLeft className="size-3.5" />
        Back
      </Link>
      <div className="leading-none">
        <div className="text-[19px] font-extrabold tracking-tight text-white">Reelify</div>
        <div className="mt-0.5 h-[3px] w-[46px] rounded-sm bg-brand" />
      </div>
      <ChevronRight className="size-3.5 text-white/25" />
      <span className="text-[13px] font-medium text-white/40">{projectName}</span>
      <ChevronRight className="size-3.5 text-white/25" />
      <span className="text-[13px] font-semibold text-white/90">{reelTitle}</span>

      <div className="flex-1" />

      {platform && (
        <div className="mr-3 flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5">
          <PlatformDot platform={platform} />
          <span className="text-[12.5px] font-semibold text-white/70">
            {PLATFORM_LABEL[platform]}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onSaveDraft}
        className="mr-2 rounded-full border border-white/15 bg-white/7 px-4 py-2 text-[13px] font-bold text-white/80"
      >
        Save draft
      </button>
      <button
        type="button"
        onClick={onPublish}
        className="flex items-center gap-1.5 rounded-full bg-brand px-4.5 py-2 text-[13px] font-bold text-white"
      >
        <Rocket className="size-3" />
        Publish
      </button>
    </nav>
  );
}
