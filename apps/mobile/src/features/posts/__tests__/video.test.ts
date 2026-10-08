import { type LocalVideo, videoProblem } from "../images";
import { formatDuration } from "../texts";

const video = (overrides: Partial<LocalVideo["file"]> = {}, durationSeconds = 60): LocalVideo => ({
  file: {
    name: "clip.mov",
    uri: "file:///clip.mov",
    mimeType: "video/quicktime",
    size: 1000,
    ...overrides,
  },
  durationSeconds,
});

describe("videoProblem (docs/DECISIONS.md: videos)", () => {
  it("accepts a MOV or MP4 video of 3 minutes and 200 MB at most", () => {
    expect(videoProblem(null)).toBeNull();
    expect(videoProblem(video({}, 180))).toBeNull();
    expect(videoProblem(video({ mimeType: "video/mp4", size: 200 * 1024 * 1024 }))).toBeNull();
  });

  it("refuses another format, a heavier or a longer video", () => {
    expect(videoProblem(video({ mimeType: "video/webm" }))).toBe(
      "Seules les vidéos MP4 et MOV sont acceptées.",
    );
    expect(videoProblem(video({ size: 200 * 1024 * 1024 + 1 }))).toBe("La vidéo dépasse 200 Mo.");
    expect(videoProblem(video({}, 181))).toBe("La vidéo dépasse 3 minutes.");
  });
});

describe("formatDuration", () => {
  it("writes minutes and two-digit seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(180)).toBe("3:00");
  });
});
