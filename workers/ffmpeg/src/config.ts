export interface FfmpegConfig {
  region: string;
  workDir: string;
  ffmpegBin: string;
  ffprobeBin: string;
  audioExt: string;
  audioContentType: string;
  pipelineVersion: string;
  ffmpegVersion: string;
  containerImageDigest: string;
  codecSupportProfile: string;
  maxSourceBytes: number;
  maxDurationSec: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): FfmpegConfig {
  return {
    region: env.AWS_REGION ?? "us-east-1",
    workDir: env.WORK_DIR ?? "/work",
    ffmpegBin: env.FFMPEG_BIN ?? "ffmpeg",
    ffprobeBin: env.FFPROBE_BIN ?? "ffprobe",
    audioExt: env.AUDIO_EXT ?? "flac",
    audioContentType: env.AUDIO_CONTENT_TYPE ?? "audio/flac",
    pipelineVersion: env.PIPELINE_VERSION ?? "v1",
    ffmpegVersion: env.FFMPEG_VERSION ?? "unknown",
    containerImageDigest: env.CONTAINER_IMAGE_DIGEST ?? "unknown",
    codecSupportProfile: env.CODEC_SUPPORT_PROFILE ?? "audio-extract-v1",
    // Guardrails (plan §9): reject absurd sources before doing work.
    maxSourceBytes: Number(env.MAX_SOURCE_BYTES ?? 20 * 1024 * 1024 * 1024),
    maxDurationSec: Number(env.MAX_DURATION_SEC ?? 6 * 60 * 60),
  };
}
