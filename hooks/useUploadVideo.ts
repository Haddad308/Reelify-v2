"use client";

import { useCallback, useState } from "react";
import {
  completeUploadSession,
  createUploadSession,
  getUploadPartUrls,
  putPartToS3,
} from "@/lib/reelifyApi";

export type UploadPhase =
  | "idle"
  | "creating-session"
  | "presigning"
  | "uploading"
  | "completing"
  | "done"
  | "error";

export interface UploadProgress {
  phase: UploadPhase;
  partsDone: number;
  partsTotal: number;
}

const CONCURRENCY = 4;
/** Cap on partNumbers per presign request — the API accepts up to 1000. */
const PRESIGN_BATCH_SIZE = 1000;

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Plain orchestration function (not a hook) so it can keep running via
 * `onProgress` callbacks after the component that started it has navigated
 * away or unmounted — the New Project wizard fires this and immediately
 * routes to the project detail page, per the plan's upload flow.
 */
export async function uploadVideo(
  workspaceId: string,
  token: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ videoId: string; processingJobId: string }> {
  onProgress?.({ phase: "creating-session", partsDone: 0, partsTotal: 0 });

  const session = await createUploadSession(
    workspaceId,
    { filename: file.name, contentType: file.type, sizeBytes: file.size },
    token,
    crypto.randomUUID(),
  );

  const partCount = Math.ceil(file.size / session.partSizeBytes);
  const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1);

  onProgress?.({ phase: "presigning", partsDone: 0, partsTotal: partCount });

  const urlByPart = new Map<number, string>();
  for (const batch of chunk(partNumbers, PRESIGN_BATCH_SIZE)) {
    const { parts } = await getUploadPartUrls(
      session.uploadSessionId,
      batch,
      token,
      crypto.randomUUID(),
    );
    for (const p of parts) urlByPart.set(p.partNumber, p.url);
  }

  onProgress?.({ phase: "uploading", partsDone: 0, partsTotal: partCount });

  const etagByPart = new Map<number, string>();
  let done = 0;
  await runWithConcurrency(partNumbers, CONCURRENCY, async (partNumber) => {
    const url = urlByPart.get(partNumber);
    if (!url) throw new Error(`Missing presigned URL for part ${partNumber}`);
    const start = (partNumber - 1) * session.partSizeBytes;
    const end = Math.min(start + session.partSizeBytes, file.size);
    const blob = file.slice(start, end);
    const etag = await putPartToS3(url, blob);
    etagByPart.set(partNumber, etag);
    done += 1;
    onProgress?.({ phase: "uploading", partsDone: done, partsTotal: partCount });
  });

  onProgress?.({ phase: "completing", partsDone: partCount, partsTotal: partCount });

  const parts = partNumbers.map((partNumber) => ({
    partNumber,
    etag: etagByPart.get(partNumber)!,
  }));
  const result = await completeUploadSession(
    session.uploadSessionId,
    parts,
    token,
    crypto.randomUUID(),
  );

  onProgress?.({ phase: "done", partsDone: partCount, partsTotal: partCount });
  return { videoId: result.videoId, processingJobId: result.processingJobId };
}

/** Hook wrapper for components that display live progress inline (rather than firing-and-navigating-away). */
export function useUploadVideo(workspaceId: string, token: string) {
  const [progress, setProgress] = useState<UploadProgress>({
    phase: "idle",
    partsDone: 0,
    partsTotal: 0,
  });

  const upload = useCallback(
    (file: File) => uploadVideo(workspaceId, token, file, setProgress),
    [workspaceId, token],
  );

  return { upload, progress };
}
