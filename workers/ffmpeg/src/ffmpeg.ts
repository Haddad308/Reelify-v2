import { spawn } from "node:child_process";

/** Media-validation failures are FATAL (user-visible), never retried. Plan §9. */
export type MediaValidationState =
  | "INVALID_MEDIA"
  | "UNSUPPORTED_CODEC"
  | "CORRUPT_MEDIA"
  | "SOURCE_TOO_LARGE"
  | "SOURCE_TOO_LONG";

export class MediaValidationError extends Error {
  readonly fatal = true;
  constructor(
    readonly state: MediaValidationState,
    message: string,
  ) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export class FfmpegTimeoutError extends Error {
  readonly state = "FFMPEG_TIMEOUT" as const;
  constructor() {
    super("ffmpeg timed out");
    this.name = "FfmpegTimeoutError";
  }
}

export function buildFfprobeArgs(input: string): string[] {
  return ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", input];
}

/** Baseline audio extraction (plan §9): mono 16 kHz FLAC. */
export function buildExtractArgs(input: string, output: string): string[] {
  return [
    "-nostdin",
    "-hide_banner",
    "-v",
    "error",
    "-i",
    input,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "flac",
    output,
  ];
}

/** Dynamic timeout (plan §9): min(3h, max(20m, 20m + 0.75 x source_duration)). */
export function extractionTimeoutMs(sourceDurationSec: number): number {
  const twentyMin = 20 * 60 * 1000;
  const threeHours = 3 * 60 * 60 * 1000;
  return Math.min(threeHours, Math.max(twentyMin, twentyMin + Math.round(0.75 * sourceDurationSec * 1000)));
}

export interface ProbeResult {
  durationSec: number;
  hasAudio: boolean;
  formatName?: string;
  audioCodec?: string;
}

function runProcess(
  bin: string,
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    }, timeoutMs);

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new FfmpegTimeoutError());
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`${bin} exited with code ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

export async function runFfprobe(input: string, bin = "ffprobe"): Promise<ProbeResult> {
  let stdout: string;
  try {
    ({ stdout } = await runProcess(bin, buildFfprobeArgs(input), 60_000));
  } catch {
    throw new MediaValidationError("CORRUPT_MEDIA", "ffprobe could not read the media");
  }
  let json: {
    format?: { duration?: string; format_name?: string };
    streams?: { codec_type?: string; codec_name?: string; duration?: string }[];
  };
  try {
    json = JSON.parse(stdout);
  } catch {
    throw new MediaValidationError("CORRUPT_MEDIA", "ffprobe returned unparseable output");
  }
  const audio = (json.streams ?? []).find((s) => s.codec_type === "audio");
  const durationSec = Number(json.format?.duration ?? audio?.duration ?? 0);
  return {
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    hasAudio: Boolean(audio),
    formatName: json.format?.format_name,
    audioCodec: audio?.codec_name,
  };
}

export async function runExtraction(
  input: string,
  output: string,
  timeoutMs: number,
  bin = "ffmpeg",
): Promise<void> {
  await runProcess(bin, buildExtractArgs(input, output), timeoutMs);
}
