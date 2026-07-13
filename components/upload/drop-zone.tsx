"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VIDEO_UPLOAD_HELPER_TEXT } from "@/lib/videoValidation";

export function DropZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelected(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-fill-subtle px-8 py-12 text-center transition-colors duration-200",
        dragging ? "border-brand bg-brand-tint" : "border-border-input",
      )}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-fill-3">
        <Upload className="size-6 text-muted-1" strokeWidth={1.8} />
      </div>
      <p className="mb-1 text-base font-bold text-ink">Drag your video here</p>
      <p className="mb-4 text-[13.5px] font-medium text-muted-1">or</p>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => inputRef.current?.click()}
      >
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <p className="mt-5 text-xs font-medium text-muted-1">{VIDEO_UPLOAD_HELPER_TEXT}</p>
    </div>
  );
}
