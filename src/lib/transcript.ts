import "server-only";
import https from "node:https";

function httpsRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
  timeoutMs = 15000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts: https.RequestOptions = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method,
      headers,
    };
    const req = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

function extractText(xml: string): string[] {
  const results: string[] = [];
  const pRe = /<p\s+t="\d+"\s+d="\d+"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(xml)) !== null) {
    const inner = m[1];
    let text = "";
    const sRe = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    while ((sm = sRe.exec(inner)) !== null) text += sm[1];
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    const decoded = text
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10))).trim();
    if (decoded) results.push(decoded);
  }
  if (results.length > 0) return results;
  const cRe = /<text start="[^"]*" dur="[^"]*">([^<]*)<\/text>/g;
  while ((m = cRe.exec(xml)) !== null) {
    const text = m[1]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10))).trim();
    if (text) results.push(text);
  }
  return results;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
}

async function fetchInnerTubeTracks(
  videoId: string,
  clientName: string,
  clientVersion: string,
  userAgent: string,
): Promise<CaptionTrack[] | null> {
  try {
    const resp = await httpsRequest(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      "POST",
      { "Content-Type": "application/json", "User-Agent": userAgent },
      JSON.stringify({ context: { client: { clientName, clientVersion } }, videoId }),
      15000,
    );
    const data = JSON.parse(resp);
    const status = data?.playabilityStatus?.status;
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log(`[transcript] InnerTube ${clientName}/${clientVersion}: status=${status}, tracks=${tracks?.length ?? 0}`);
    if (Array.isArray(tracks) && tracks.length > 0) return tracks;
    return null;
  } catch (err) {
    console.log(`[transcript] InnerTube ${clientName}/${clientVersion} error:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function downloadTranscript(trackUrl: string): Promise<string | null> {
  try {
    const xml = await httpsRequest(trackUrl, "GET", {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    }, undefined, 15000);
    const segments = extractText(xml);
    if (segments.length === 0) return null;
    return segments.join(" ");
  } catch {
    return null;
  }
}

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

  // Try InnerTube with multiple client configurations
  const clients = [
    { name: "ANDROID", ver: "20.10.38", ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 14)" },
    { name: "ANDROID", ver: "19.45.36", ua: "com.google.android.youtube/19.45.36 (Linux; U; Android 14)" },
    { name: "IOS", ver: "20.10.38", ua: "com.google.android.youtube/20.10.38 (iPhone; U; iOS 18.0)" },
    { name: "WEB", ver: "2.20240627.00.00", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
  ];

  for (const client of clients) {
    const tracks = await fetchInnerTubeTracks(videoId, client.name, client.ver, client.ua);
    if (tracks && tracks.length > 0) {
      const text = await downloadTranscript(tracks[0].baseUrl);
      if (text) {
        const count = text.split(" ").length;
        console.log(`[transcript] OK (${client.name}) — ${count} words for ${videoId}`);
        return text;
      }
    }
  }

  console.log("[transcript] all InnerTube clients failed for", videoId);
  return null;
}
