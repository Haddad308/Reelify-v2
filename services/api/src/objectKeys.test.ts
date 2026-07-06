import { describe, expect, it } from "vitest";
import { audioObjectKey, extFromFilename, sourceObjectKey } from "./objectKeys";

describe("object keys", () => {
  it("builds tenant-scoped source keys under originals/", () => {
    expect(sourceObjectKey("ag_1", "ws_1", "vid_1", "mp4")).toBe(
      "originals/ag_1/ws_1/vid_1/original.mp4",
    );
  });

  it("builds tenant-scoped audio keys under audio/", () => {
    expect(audioObjectKey("ag_1", "ws_1", "vid_1", "flac")).toBe("audio/ag_1/ws_1/vid_1/audio.flac");
  });

  it("sanitizes hostile extensions", () => {
    expect(sourceObjectKey("ag_1", "ws_1", "vid_1", "../../etc/passwd")).toBe(
      "originals/ag_1/ws_1/vid_1/original.etcpasswd",
    );
  });

  it("derives extension from filename with a safe default", () => {
    expect(extFromFilename("podcast.MP4")).toBe("mp4");
    expect(extFromFilename("no-extension")).toBe("mp4");
    expect(extFromFilename(undefined)).toBe("mp4");
  });
});
