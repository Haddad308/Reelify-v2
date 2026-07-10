import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type {
  ClipScoringInput,
  ClipScoringOptions,
  ClipScoringProvider,
  ClipScoringResult,
  TranscriptSegment,
} from "../types";
import { selectClips } from "./clipSelection";

/**
 * Gemini clip-scoring adapter (plan §10). Requests STRICT JSON via a response
 * schema, then runs the ported deterministic selection logic (score >= 65,
 * 30–90 s, segment snapping, duration cap). The JSON-repair path in
 * `clipSelection` remains as a defensive fallback.
 */

export const GEMINI_PROMPT_VERSION = "2026-07-04";
export const GEMINI_OUTPUT_SCHEMA_VERSION = "clips.v1";
const DEFAULT_MODEL = "gemini-2.5-pro";

export interface GeminiScoringConfig {
  apiKey: string;
  model?: string;
  promptVersion?: string;
  outputSchemaVersion?: string;
}

const responseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      start: { type: SchemaType.NUMBER },
      end: { type: SchemaType.NUMBER },
      category: { type: SchemaType.STRING },
      tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      score: { type: SchemaType.NUMBER },
    },
    required: ["title", "start", "end", "score"],
  },
} as const;

export function buildScoringPrompt(
  segments: TranscriptSegment[],
  options: ClipScoringOptions = {},
): string {
  const outputLanguage = options.outputLanguage ?? "ar";
  const transcript = segments
    .map((s) => `[${s.start.toFixed(2)} - ${s.end.toFixed(2)}] ${s.text}`)
    .join("\n");

  const outputLangRule =
    outputLanguage === "en"
      ? "Write titles, tags, and categories in natural, catchy English."
      : "Detect the transcript language/dialect and write titles, tags, and categories in the SAME language and dialect. Never translate or Modern-Standardize.";

  return `You are a professional short-form video editor.
The following is a timestamped transcript. Extract highlight segments of 30–90 seconds and rank best -> worst.

Return ONLY valid JSON (an array), no explanations:
[{"title":"...","start":0,"end":0,"category":"...","tags":["..."],"score":75}]

CRITICAL:
- Return ONLY segments with score >= 65.
- Apply a DURATION-BASED UPPER LIMIT on the number of returned segments (upper bound, not a target):
  <=5 min: 2 | 5–10 min: 3 | 10–20 min: 5 | 20–40 min: 7 | 40–60 min: 10 | 60+ min: 12
- If fewer segments meet the quality threshold, return fewer. Never pad with low-quality segments.
- Sort descending by quality (best first).

Selection priority: (1) strong hook in first 3–5 s, (2) clean sentence boundaries, (3) clear value/payoff, (4) smooth flow.
${outputLangRule}

Transcript:
${transcript}`;
}

export class GeminiClipScoringProvider implements ClipScoringProvider {
  readonly provider = "gemini";
  readonly model: string;
  readonly promptVersion: string;
  readonly outputSchemaVersion: string;
  private readonly client: GoogleGenerativeAI;

  constructor(config: GeminiScoringConfig) {
    if (!config.apiKey) throw new Error("GeminiClipScoringProvider requires an apiKey");
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.promptVersion = config.promptVersion ?? GEMINI_PROMPT_VERSION;
    this.outputSchemaVersion = config.outputSchemaVersion ?? GEMINI_OUTPUT_SCHEMA_VERSION;
  }

  async score(input: ClipScoringInput): Promise<ClipScoringResult> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        topK: 32,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: responseSchema as any,
      },
    });

    const prompt = buildScoringPrompt(input.segments, input.options);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const candidates = selectClips(text, input.segments, {
      outputLanguage: input.options?.outputLanguage,
      videoDurationSec: input.options?.videoDurationSec,
    });

    const usage = result.response.usageMetadata;
    return {
      provider: this.provider,
      model: this.model,
      promptVersion: this.promptVersion,
      outputSchemaVersion: this.outputSchemaVersion,
      candidates,
      tokenUsage: usage
        ? {
            model: this.model,
            tokensInput: usage.promptTokenCount ?? 0,
            tokensOutput: usage.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }
}
