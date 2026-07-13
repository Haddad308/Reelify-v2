import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "../types";
import {
  durationCapForVideo,
  extractJsonChunk,
  parseClipsJson,
  selectClips,
  snapEndToSegment,
  snapStartToSegment,
} from "./clipSelection";

const segments: TranscriptSegment[] = [
  { start: 0, end: 10, text: "intro" },
  { start: 10, end: 25, text: "hook" },
  { start: 25, end: 70, text: "story" },
  { start: 70, end: 130, text: "payoff" },
];

describe("JSON parsing / repair", () => {
  it("extracts a JSON array out of noisy model output", () => {
    const raw = "Here you go:\n```json\n[{\"title\":\"a\",\"start\":1,\"end\":2,\"score\":80}]\n```";
    expect(extractJsonChunk(raw.replace(/```json|```/g, "")).trim().startsWith("[")).toBe(true);
    const clips = parseClipsJson(raw);
    expect(clips).toHaveLength(1);
  });

  it("repairs trailing commas and unquoted keys", () => {
    const raw = '[{title:"a", start:1, end:2, score:80,},]';
    const clips = parseClipsJson(raw);
    expect(clips).toHaveLength(1);
    expect(clips[0]!.title).toBe("a");
  });

  it("returns [] for irreparable garbage", () => {
    expect(parseClipsJson("not json at all")).toEqual([]);
  });
});

describe("segment snapping", () => {
  it("snaps start to a nearby segment boundary within tolerance", () => {
    expect(snapStartToSegment(11, segments)).toBe(10); // within 3s of seg.start=10
  });
  it("does not snap when outside tolerance", () => {
    expect(snapStartToSegment(20, segments)).toBe(20); // 10s away from 10 -> unchanged
  });
  it("snaps end to a nearby segment end within tolerance", () => {
    expect(snapEndToSegment(68, segments)).toBe(70); // within 3s of seg.end=70
  });
});

describe("durationCapForVideo", () => {
  it("caps by video length buckets", () => {
    expect(durationCapForVideo(4 * 60)).toBe(2);
    expect(durationCapForVideo(8 * 60)).toBe(3);
    expect(durationCapForVideo(15 * 60)).toBe(5);
    expect(durationCapForVideo(30 * 60)).toBe(7);
    expect(durationCapForVideo(55 * 60)).toBe(10);
    expect(durationCapForVideo(120 * 60)).toBe(12);
  });
});

describe("selectClips", () => {
  it("keeps only 30–90s clips scoring >= 65, ranked by score desc", () => {
    const raw = JSON.stringify([
      { title: "too short", start: 0, end: 10, score: 90 }, // 10s -> drop
      { title: "low score", start: 25, end: 70, score: 40 }, // 45s but score<65 -> drop
      { title: "good B", start: 25, end: 70, score: 70 }, // 45s, keep
      { title: "good A", start: 10, end: 70, score: 88 }, // 60s, keep, higher score first
    ]);
    const clips = selectClips(raw, segments);
    expect(clips.map((c) => c.title)).toEqual(["good A", "good B"]);
    expect(clips[0]!.rank).toBe(1);
    expect(clips[0]!.durationSec).toBe(60);
  });

  it("applies the duration-based cap", () => {
    const raw = JSON.stringify([
      { title: "c1", start: 0, end: 40, score: 95 },
      { title: "c2", start: 0, end: 40, score: 90 },
      { title: "c3", start: 0, end: 40, score: 85 },
    ]);
    // <=5 min video caps at 2 clips
    const clips = selectClips(raw, [], { videoDurationSec: 4 * 60 });
    expect(clips).toHaveLength(2);
  });

  it("falls back to structurally-valid clips when none pass strict filters", () => {
    const raw = JSON.stringify([{ title: "weird", start: 0, end: 5, score: 10 }]);
    const clips = selectClips(raw, []);
    expect(clips).toHaveLength(1);
    expect(clips[0]!.title).toBe("weird");
  });
});
