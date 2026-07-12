const ACCEPTED_EXTENSIONS = ["mp4", "mov", "avi", "mkv"];
const MAX_SIZE_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
const MAX_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hrs

export const VIDEO_UPLOAD_HELPER_TEXT = "MP4 · MOV · AVI · MKV · Max 4 GB · Up to 3 hrs";

export function validateVideoFile(file: File): { valid: true } | { valid: false; error: string } {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ACCEPTED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "Unsupported file type — use MP4, MOV, AVI, or MKV" };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "File is larger than the 4 GB limit" };
  }
  return { valid: true };
}

/** Reads duration client-side via an offscreen <video> element; resolves null if it can't be read. */
export function readVideoDurationMs(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const ms = Number.isFinite(video.duration) ? video.duration * 1000 : null;
      if (ms && ms > MAX_DURATION_MS) {
        resolve(null); // caller treats this the same as "couldn't read duration"
        return;
      }
      resolve(ms);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
