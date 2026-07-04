/**
 * Provider abstraction (plan §10). All ElevenLabs/Gemini access goes through
 * these interfaces — no scattered SDK calls in workers or the API.
 */

export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface TranscriptWordItem {
  text: string;
  start: number; // seconds
  end: number; // seconds
  confidence?: number;
}

export interface TranscriptionInput {
  audio: Uint8Array;
  contentType?: string;
  languageHint?: string;
}

export interface TranscriptionResult {
  provider: string;
  model: string;
  language: string;
  segments: TranscriptSegment[];
  words: TranscriptWordItem[];
  durationMs?: number;
  raw?: unknown;
}

export interface TranscriptionProvider {
  readonly provider: string;
  readonly model: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export type OutputLanguage = "ar" | "en";

export interface ScoredClip {
  title: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  category: string;
  tags: string[];
  score?: number;
  rank: number;
}

export interface ClipScoringPreferences {
  platform?: string;
  preferredDuration?: number;
  audience?: string;
  tone?: string;
  hookStyle?: string;
  keyTopics?: string;
  callToAction?: string;
}

export interface ClipScoringOptions {
  outputLanguage?: OutputLanguage;
  videoDurationSec?: number;
  preferences?: ClipScoringPreferences;
}

export interface ClipScoringInput {
  segments: TranscriptSegment[];
  options?: ClipScoringOptions;
}

export interface TokenUsage {
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd?: number;
}

export interface ClipScoringResult {
  provider: string;
  model: string;
  promptVersion: string;
  outputSchemaVersion: string;
  candidates: ScoredClip[];
  tokenUsage?: TokenUsage;
  raw?: unknown;
}

export interface ClipScoringProvider {
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly outputSchemaVersion: string;
  score(input: ClipScoringInput): Promise<ClipScoringResult>;
}
