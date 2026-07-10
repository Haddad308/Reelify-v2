import { describe, expect, it } from "vitest";
import { buildExtractArgs, buildFfprobeArgs, extractionTimeoutMs } from "./ffmpeg";

describe("buildExtractArgs", () => {
  it("produces the plan §9 baseline (mono 16kHz FLAC, quiet, no video)", () => {
    expect(buildExtractArgs("/work/source", "/work/audio.flac")).toEqual([
      "-nostdin",
      "-hide_banner",
      "-v",
      "error",
      "-i",
      "/work/source",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "flac",
      "/work/audio.flac",
    ]);
  });
});

describe("buildFfprobeArgs", () => {
  it("requests JSON format + stream info", () => {
    const args = buildFfprobeArgs("/work/source");
    expect(args).toContain("-print_format");
    expect(args).toContain("json");
    expect(args.at(-1)).toBe("/work/source");
  });
});

describe("extractionTimeoutMs", () => {
  it("floors at 20 minutes", () => {
    expect(extractionTimeoutMs(0)).toBe(20 * 60 * 1000);
  });
  it("scales at 0.75x source duration", () => {
    expect(extractionTimeoutMs(3600)).toBe(20 * 60 * 1000 + Math.round(0.75 * 3600 * 1000));
  });
  it("caps at 3 hours", () => {
    expect(extractionTimeoutMs(100000)).toBe(3 * 60 * 60 * 1000);
  });
});
