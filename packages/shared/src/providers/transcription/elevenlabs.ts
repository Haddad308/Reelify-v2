import type {
  TranscriptSegment,
  TranscriptWordItem,
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "../types";

/**
 * ElevenLabs Scribe v2 transcription adapter (plan §10). Ports the legacy
 * word->segment assembly and multi-key rotation from `lib/elevenlabs.ts`, but
 * takes keys via config (resolved from Secrets Manager in workers) instead of
 * reading process.env / a module-global rotation store.
 */

const API_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const DEFAULT_MODEL = "scribe_v2";
const MAX_KEY_RETRIES = 5;
const SEGMENT_MAX_WORDS = 12;

interface ElevenLabsWord {
  start?: number;
  end?: number;
  text?: string;
  word?: string;
  start_time?: number;
  end_time?: number;
}

function normalizeTime(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  // ElevenLabs may return ms or seconds; values > 1000 are treated as ms.
  return value > 1000 ? value / 1000 : value;
}

function wordsToItems(words: ElevenLabsWord[]): TranscriptWordItem[] {
  return words
    .map((w) => ({
      text: (w.text ?? w.word ?? "").trim(),
      start: normalizeTime(w.start ?? w.start_time),
      end: normalizeTime(w.end ?? w.end_time),
    }))
    .filter((w) => w.text);
}

function buildSegmentsFromWords(words: ElevenLabsWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let current: string[] = [];
  let segStart = 0;
  let segEnd = 0;

  const push = () => {
    if (current.length === 0) return;
    segments.push({ start: segStart, end: segEnd, text: current.join(" ").trim() });
    current = [];
  };

  words.forEach((word, index) => {
    const text = (word.text ?? word.word ?? "").trim();
    const start = normalizeTime(word.start ?? word.start_time);
    const end = normalizeTime(word.end ?? word.end_time);
    if (current.length === 0) segStart = start;
    if (text) {
      current.push(text);
      segEnd = end || segEnd;
    }
    if (current.length >= SEGMENT_MAX_WORDS || index === words.length - 1) push();
  });

  return segments;
}

export class KeysExhaustedError extends Error {
  readonly status = 429;
  constructor() {
    super("All ElevenLabs API keys are exhausted or unavailable.");
    this.name = "KeysExhaustedError";
  }
}

export interface ElevenLabsConfig {
  apiKeys: string[];
  model?: string;
}

export class ElevenLabsTranscriptionProvider implements TranscriptionProvider {
  readonly provider = "elevenlabs";
  readonly model: string;
  private readonly keys: string[];
  private exhausted = new Set<string>();

  constructor(config: ElevenLabsConfig) {
    this.keys = config.apiKeys.map((k) => k.trim()).filter(Boolean);
    if (this.keys.length === 0) throw new Error("ElevenLabsTranscriptionProvider requires at least one apiKey");
    this.model = config.model ?? process.env.ELEVENLABS_STT_MODEL ?? DEFAULT_MODEL;
  }

  private nextKey(): string | null {
    return this.keys.find((k) => !this.exhausted.has(k)) ?? null;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const apiKey = this.nextKey();
      if (!apiKey) throw new KeysExhaustedError();

      const form = new FormData();
      form.append("model_id", this.model);
      form.append("timestamps_granularity", "word");
      const blob = new Blob([input.audio], { type: input.contentType ?? "audio/ogg" });
      form.append("file", blob, "audio.opus");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: form,
      });

      if (!response.ok) {
        if ([401, 403, 429].includes(response.status)) {
          this.exhausted.add(apiKey);
          if (attempt < MAX_KEY_RETRIES) {
            attempt += 1;
            continue; // rotate to the next key
          }
          throw new KeysExhaustedError();
        }
        const details = await response.text().catch(() => "");
        const err = new Error(`ElevenLabs STT failed (${response.status}): ${details}`) as Error & {
          status?: number;
        };
        err.status = response.status;
        throw err;
      }

      const data: any = await response.json();
      const rawWords: ElevenLabsWord[] = Array.isArray(data?.words)
        ? data.words
        : Array.isArray(data?.word_timestamps)
          ? data.word_timestamps
          : [];

      const words = wordsToItems(rawWords);
      const segments: TranscriptSegment[] = Array.isArray(data?.segments)
        ? data.segments
            .map((s: any) => ({
              start: normalizeTime(s.start),
              end: normalizeTime(s.end),
              text: String(s.text ?? "").trim(),
            }))
            .filter((s: TranscriptSegment) => s.text)
        : buildSegmentsFromWords(rawWords);

      const durationMs =
        segments.length > 0 ? Math.round((segments[segments.length - 1]!.end ?? 0) * 1000) : undefined;

      return {
        provider: this.provider,
        model: this.model,
        language: String(data?.language_code ?? input.languageHint ?? "unknown"),
        segments: segments.filter((s) => s.text),
        words,
        durationMs,
      };
    }
  }
}
