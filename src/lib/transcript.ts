import "server-only";
import https from "https";

function httpsGet(url: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts: https.RequestOptions = {
      hostname: u.hostname,
      port: Number(u.port) || 443,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
      },
    };
    const req = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on("error", reject);
    if (signal) {
      signal.addEventListener("abort", () => {
        req.destroy();
        reject(new DOMException("Aborted", "AbortError"));
      });
    }
    req.end();
  });
}

function httpsPost(
  url: string,
  body: string,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts: https.RequestOptions = {
      hostname: u.hostname,
      port: Number(u.port) || 443,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
      },
    };
    const req = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on("error", reject);
    if (signal) {
      signal.addEventListener("abort", () => {
        req.destroy();
        reject(new DOMException("Aborted", "AbortError"));
      });
    }
    req.write(body);
    req.end();
  });
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    );
}

function parseTranscriptXml(xml: string): string[] {
  const results: string[] = [];
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = pRegex.exec(xml)) !== null) {
    const inner = match[3];
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = sRegex.exec(inner)) !== null) {
      text += sMatch[1];
    }
    if (!text) {
      text = inner.replace(/<[^>]+>/g, "");
    }
    text = decodeEntities(text).trim();
    if (text) results.push(text);
  }
  if (results.length > 0) return results;
  const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  while ((match = classicRegex.exec(xml)) !== null) {
    const text = decodeEntities(match[3]).trim();
    if (text) results.push(text);
  }
  return results;
}

export async function getTranscriptFromUrl(
  url: string,
  platform: string | null,
  videoId: string | null,
): Promise<string | null> {
  if (platform !== "youtube" || !videoId) return null;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10000);

  try {
    // Try InnerTube API first
    const innerTubeBody = JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
        },
      },
      videoId,
    });
    const innerTubeResp = await httpsPost(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      innerTubeBody,
      ac.signal,
    ).catch(() => null);

    if (innerTubeResp) {
      const data = JSON.parse(innerTubeResp);
      const captionTracks =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        const track = captionTracks[0];
        const transcriptUrl = track.baseUrl;
        if (typeof transcriptUrl === "string") {
          const xml = await httpsGet(transcriptUrl, ac.signal).catch(
            () => null,
          );
          if (xml) {
            const segments = parseTranscriptXml(xml);
            if (segments.length > 0) return segments.join(" ");
          }
        }
      }
    }

    // Fallback: scrape the video page
    const page = await httpsGet(
      `https://www.youtube.com/watch?v=${videoId}`,
      ac.signal,
    ).catch(() => null);

    if (!page) return null;

    if (page.includes('class="g-recaptcha"')) return null;
    if (!page.includes('"playabilityStatus":')) return null;

    const token = "ytInitialPlayerResponse = ";
    const startIdx = page.indexOf(token);
    if (startIdx === -1) return null;

    const jsonStart = startIdx + token.length;
    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < page.length; i++) {
      if (page[i] === "{") depth++;
      else if (page[i] === "}") {
        depth--;
        if (depth === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    if (jsonEnd === -1) return null;

    let playerResponse: any;
    try {
      playerResponse = JSON.parse(page.slice(jsonStart, jsonEnd));
    } catch {
      return null;
    }

    const fallbackTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(fallbackTracks) || fallbackTracks.length === 0) {
      return null;
    }

    const track = fallbackTracks[0];
    const transcriptUrl = track.baseUrl;
    if (typeof transcriptUrl !== "string") return null;

    const xml = await httpsGet(transcriptUrl, ac.signal).catch(() => null);
    if (!xml) return null;

    const segments = parseTranscriptXml(xml);
    return segments.length > 0 ? segments.join(" ") : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
