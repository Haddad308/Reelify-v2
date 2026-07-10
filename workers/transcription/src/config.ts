export interface TranscriptionWorkerConfig {
  region: string;
  elevenLabsApiKeys: string[];
  model?: string;
  pipelineVersion: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): TranscriptionWorkerConfig {
  const keys = (env.ELEVENLABS_API_KEYS ?? env.ELEVENLABS_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) throw new Error("ELEVENLABS_API_KEYS (or ELEVENLABS_API_KEY) is required");

  return {
    region: env.AWS_REGION ?? "us-east-1",
    elevenLabsApiKeys: keys,
    model: env.ELEVENLABS_STT_MODEL,
    pipelineVersion: env.PIPELINE_VERSION ?? "v1",
  };
}
