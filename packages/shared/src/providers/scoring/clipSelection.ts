import type { OutputLanguage, ScoredClip, TranscriptSegment } from "../types";

/**
 * Pure clip-selection logic ported from the legacy `lib/gemini.ts` so the good
 * product behavior is preserved (plan working-agreement: port, don't discard):
 *  - clips must be 30–90 s
 *  - clips must score >= 65
 *  - start/end are snapped to nearby transcript segment boundaries (<= 3 s)
 *  - number of returned clips is capped by source video duration
 *
 * This module is deliberately free of any SDK/network so it is fully unit
 * testable; the Gemini adapter calls into it after receiving a model response.
 */

export const MIN_CLIP_SEC = 30;
export const MAX_CLIP_SEC = 90;
export const MIN_SCORE = 65;
export const SNAP_TOLERANCE_SEC = 3;

export interface RawClip {
  title?: unknown;
  start?: unknown;
  end?: unknown;
  category?: unknown;
  tags?: unknown;
  score?: unknown;
}

// --- JSON cleaning / repair (ported) ------------------------------------------------

export function cleanJsonText(raw: string): string {
  return raw
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

export function extractJsonChunk(text: string): string {
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }
  return text;
}

export function attemptJsonRepair(text: string): string {
  let repaired = text.trim();
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");
  repaired = repaired.replace(/(\w+)\s*:/g, '"$1":');
  return repaired;
}

export function parseClipsJson(raw: string): RawClip[] {
  const cleaned = cleanJsonText(raw);
  const extracted = extractJsonChunk(cleaned);

  const tryParse = (value: string): RawClip[] => {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as RawClip[];
    if (parsed && Array.isArray(parsed.clips)) return parsed.clips as RawClip[];
    return [];
  };

  try {
    return tryParse(extracted);
  } catch {
    try {
      return tryParse(attemptJsonRepair(extracted));
    } catch {
      return [];
    }
  }
}

// --- Segment snapping (ported) ------------------------------------------------------

export function snapStartToSegment(time: number, segments: TranscriptSegment[]): number {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i]!;
    if (seg.start <= time) {
      if (time - seg.start <= SNAP_TOLERANCE_SEC) return seg.start;
      break;
    }
  }
  return time;
}

export function snapEndToSegment(time: number, segments: TranscriptSegment[]): number {
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    if (seg.end >= time) {
      if (seg.end - time <= SNAP_TOLERANCE_SEC) return seg.end;
      break;
    }
  }
  return time;
}

// --- Duration-based cap on number of clips (ported) ---------------------------------

export function durationCapForVideo(videoDurationSec: number): number {
  const minutes = videoDurationSec / 60;
  if (minutes <= 5) return 2;
  if (minutes <= 10) return 3;
  if (minutes <= 20) return 5;
  if (minutes <= 40) return 7;
  if (minutes <= 60) return 10;
  return 12;
}

// --- Normalization + validation -----------------------------------------------------

interface NormalizedClip {
  title: string;
  start: number;
  end: number;
  category: string;
  tags: string[];
  score?: number;
}

function normalizeClip(
  clip: RawClip,
  segments: TranscriptSegment[],
  defaultCategory: string,
): NormalizedClip {
  const rawStart = Number(clip.start);
  const rawEnd = Number(clip.end);
  const start = Number.isFinite(rawStart) ? snapStartToSegment(rawStart, segments) : rawStart;
  const end = Number.isFinite(rawEnd) ? snapEndToSegment(rawEnd, segments) : rawEnd;
  const safeEnd = end > start ? end : rawEnd;
  const score = Number.isFinite(Number(clip.score)) ? Number(clip.score) : undefined;
  return {
    title: String(clip.title ?? "").trim(),
    start,
    end: safeEnd,
    category: String(clip.category ?? defaultCategory).trim(),
    tags: Array.isArray(clip.tags)
      ? clip.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [],
    score,
  };
}

function isBasicValid(clip: NormalizedClip): boolean {
  return Boolean(clip.title) && Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.end > clip.start;
}

function isWithinDuration(clip: NormalizedClip): boolean {
  const duration = clip.end - clip.start;
  return duration >= MIN_CLIP_SEC && duration <= MAX_CLIP_SEC;
}

function hasGoodScore(clip: NormalizedClip): boolean {
  if (clip.score !== undefined) return clip.score >= MIN_SCORE;
  return true; // no score provided -> keep (backward compatible)
}

export interface SelectClipsOptions {
  outputLanguage?: OutputLanguage;
  videoDurationSec?: number;
}

/**
 * Turn a raw model response string into ranked, validated ScoredClips.
 */
export function selectClips(
  rawText: string,
  segments: TranscriptSegment[],
  options: SelectClipsOptions = {},
): ScoredClip[] {
  const defaultCategory = options.outputLanguage === "en" ? "General" : "\u0639\u0627\u0645";
  const normalized = parseClipsJson(rawText).map((c) => normalizeClip(c, segments, defaultCategory));

  let valid = normalized.filter((c) => isBasicValid(c) && isWithinDuration(c) && hasGoodScore(c));

  // Fallback mirrors legacy behavior: if nothing passes the strict filters,
  // return whatever is at least structurally valid rather than nothing.
  if (valid.length === 0) valid = normalized.filter(isBasicValid);

  // Rank by score descending when scores exist; otherwise preserve model order.
  const hasScores = valid.some((c) => c.score !== undefined);
  if (hasScores) {
    valid = [...valid].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  if (options.videoDurationSec !== undefined) {
    valid = valid.slice(0, durationCapForVideo(options.videoDurationSec));
  }

  return valid.map((c, index) => ({
    title: c.title,
    startSec: c.start,
    endSec: c.end,
    durationSec: Number((c.end - c.start).toFixed(3)),
    category: c.category,
    tags: c.tags,
    score: c.score,
    rank: index + 1,
  }));
}
