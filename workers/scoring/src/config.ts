import type { OutputLanguage } from "@reelify/shared";

export interface ScoringWorkerConfig {
  region: string;
  geminiApiKey: string;
  model?: string;
  pipelineVersion: string;
  outputLanguage: OutputLanguage;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ScoringWorkerConfig {
  const geminiApiKey = env.GEMINI_API_KEY ?? "";
  if (!geminiApiKey) throw new Error("GEMINI_API_KEY is required");

  return {
    region: env.AWS_REGION ?? "us-east-1",
    geminiApiKey,
    model: env.GEMINI_MODEL,
    pipelineVersion: env.PIPELINE_VERSION ?? "v1",
    outputLanguage: (env.OUTPUT_LANGUAGE as OutputLanguage) ?? "ar",
  };
}
