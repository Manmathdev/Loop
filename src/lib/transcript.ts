import "server-only";

export async function getTranscriptFromUrl(
  url: string,
  platform: string | null,
  videoId: string | null,
): Promise<string | null> {
  if (platform !== "youtube" || !videoId) {
    console.log("[transcript] skipped — platform:", platform, "videoId:", videoId);
    return null;
  }

  console.log("[transcript] fetching videoId:", videoId);

  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments || segments.length === 0) {
      console.log("[transcript] returned 0 segments for", videoId);
      return null;
    }
    const text = segments.map((s: { text: string }) => s.text).join(" ");
    console.log("[transcript] OK —", segments.length, "segments,", text.length, "chars for", videoId);
    return text;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("[transcript] FAIL — videoId:", videoId, "message:", message);
    return null;
  }
}
