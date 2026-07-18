import "server-only";

interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

export async function getTranscriptFromUrl(
  url: string,
  platform: string | null,
  videoId: string | null,
): Promise<string | null> {
  if (platform !== "youtube" || !videoId) return null;

  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const segments: TranscriptSegment[] =
      await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments || segments.length === 0) return null;
    return segments.map((s) => s.text).join(" ");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("disabled") || msg.includes("not available")) return null;
    if (msg.includes("Keur") || msg.includes("Transcript")) return null;
    return null;
  }
}
