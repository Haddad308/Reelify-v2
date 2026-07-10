import { describe, expect, it } from "vitest";
import { groupWordsIntoSegments } from "./segments";

describe("groupWordsIntoSegments", () => {
  it("groups words into segments with correct boundaries", () => {
    const words = Array.from({ length: 25 }, (_, i) => ({
      text: `w${i}`,
      startMs: i * 1000,
      endMs: i * 1000 + 900,
    }));
    const segments = groupWordsIntoSegments(words, 12);
    expect(segments).toHaveLength(3); // 12 + 12 + 1
    expect(segments[0]!.start).toBe(0);
    expect(segments[0]!.end).toBe((11 * 1000 + 900) / 1000);
    expect(segments[0]!.text.split(" ")).toHaveLength(12);
    expect(segments[2]!.text).toBe("w24");
  });

  it("handles empty input", () => {
    expect(groupWordsIntoSegments([])).toEqual([]);
  });
});
