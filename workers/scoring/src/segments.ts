import type { TranscriptSegment } from "@reelify/shared";

export interface WordRow {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * Rebuild coarse transcript segments from persisted word rows for scoring input
 * (mirrors the transcription adapter's ~12-word grouping).
 */
export function groupWordsIntoSegments(words: WordRow[], maxWords = 12): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const chunk = words.slice(i, i + maxWords);
    if (chunk.length === 0) continue;
    segments.push({
      start: chunk[0]!.startMs / 1000,
      end: chunk[chunk.length - 1]!.endMs / 1000,
      text: chunk
        .map((w) => w.text)
        .join(" ")
        .trim(),
    });
  }
  return segments;
}
