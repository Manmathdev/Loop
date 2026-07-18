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

  console.log("[transcript] fetching videoId:", videoId, "url:", url);

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
    const name =
      err && typeof err === "object" && "constructor" in err
        ? (err as Error).constructor.name
        : typeof err;
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.log("[transcript] FAIL — videoId:", videoId);
    console.log("[transcript] error name:", name);
    console.log("[transcript] error message:", message);
    if (stack) console.log("[transcript] stack:", stack);
    return null;
  }
}
