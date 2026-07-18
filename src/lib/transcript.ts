import "server-only";
import https from "node:https";

function httpsRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
  timeoutMs = 10000,
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
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
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

function extractJson(html: string, name: string): any {
  const token = `${name} = `;
  const start = html.indexOf(token);
  if (start === -1) return null;
  const jsonStart = start + token.length;
  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(jsonStart, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
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

  // Method 1: InnerTube API (Android client)
  try {
    const resp = await httpsRequest(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      "POST",
      {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
      },
      JSON.stringify({
        context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
        videoId,
      }),
      10000,
    );
    const data = JSON.parse(resp);
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(tracks) && tracks.length > 0) {
      const trackUrl = tracks[0].baseUrl;
      if (typeof trackUrl === "string" && trackUrl.includes("youtube.com")) {
        const xml = await httpsRequest(trackUrl, "GET", {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        }, undefined, 10000);
        const segments = extractText(xml);
        if (segments.length > 0) {
          const text = segments.join(" ");
          console.log("[transcript] OK (InnerTube) —", segments.length, "segs,", text.length, "chars");
          return text;
        }
      }
    }
  } catch (err) {
    console.log("[transcript] InnerTube failed:", err instanceof Error ? err.message : String(err));
  }

  // Method 2: Page scrape
  try {
    const html = await httpsRequest(
      `https://www.youtube.com/watch?v=${videoId}`,
      "GET",
      { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
      undefined,
      10000,
    );
    if (html.includes('class="g-recaptcha"') || !html.includes('"playabilityStatus"')) {
      console.log("[transcript] page blocked or unavailable for", videoId);
      return null;
    }
    const pr = extractJson(html, "ytInitialPlayerResponse");
    const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      console.log("[transcript] no caption tracks on page for", videoId);
      return null;
    }
    const trackUrl = tracks[0].baseUrl;
    if (typeof trackUrl !== "string" || !trackUrl.includes("youtube.com")) {
      console.log("[transcript] invalid track URL for", videoId);
      return null;
    }
    const xml = await httpsRequest(trackUrl, "GET", {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    }, undefined, 10000);
    const segments = extractText(xml);
    if (segments.length === 0) {
      console.log("[transcript] no segments parsed for", videoId);
      return null;
    }
    const text = segments.join(" ");
    console.log("[transcript] OK (scrape) —", segments.length, "segs,", text.length, "chars");
    return text;
  } catch (err) {
    console.log("[transcript] scrape failed:", err instanceof Error ? err.message : String(err));
  }

  console.log("[transcript] exhausted all methods for", videoId);
  return null;
}
