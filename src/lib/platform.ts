export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "vimeo"
  | "twitter"
  | "other";

export interface ParsedUrl {
  platform: Platform;
  videoId: string | null;
  hostname: string;
  normalized: string;
}

const PLATFORM_META: Record<
  Platform,
  { label: string; glyph: string; accent: string }
> = {
  youtube: { label: "YouTube", glyph: "▶", accent: "#FF0033" },
  tiktok: { label: "TikTok", glyph: "♪", accent: "#25F4EE" },
  instagram: { label: "Instagram", glyph: "◎", accent: "#E1306C" },
  vimeo: { label: "Vimeo", glyph: "◓", accent: "#1AB7EA" },
  twitter: { label: "X", glyph: "𝕏", accent: "#0A3625" },
  other: { label: "Link", glyph: "↗", accent: "#0A3625" },
};

export function platformMeta(p: string | null) {
  return PLATFORM_META[(p as Platform) ?? "other"] ?? PLATFORM_META.other;
}

function rawHostname(url: string): string {
  const m = url.match(/^https?:\/\/([^/]+)/i);
  return (m ? m[1] : url).toLowerCase();
}

export function detectPlatform(url: string): Platform {
  const host = rawHostname(url);
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return "youtube";
  if (/(^|\.)(tiktok\.com)$/.test(host)) return "tiktok";
  if (/(^|\.)(instagram\.com)$/.test(host)) return "instagram";
  if (/(^|\.)(vimeo\.com)$/.test(host)) return "vimeo";
  if (/(^|\.)(twitter\.com|x\.com)$/.test(host)) return "twitter";
  return "other";
}

export function parseUrl(raw: string): ParsedUrl | null {
  let url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!u.hostname.includes(".")) return null;
  const platform = detectPlatform(u.hostname);
  return {
    platform,
    videoId: extractVideoId(u, platform),
    hostname: u.hostname.replace(/^www\./, ""),
    normalized: u.toString(),
  };
}

function extractVideoId(u: URL, platform: Platform): string | null {
  if (platform === "youtube") {
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]+)/);
    if (m) return m[2];
  }
  if (platform === "vimeo") {
    const m = u.pathname.match(/\/(\d+)/);
    if (m) return m[1];
  }
  if (platform === "tiktok" || platform === "instagram") {
    const m = u.pathname.match(/\/video\/(\d+)|\/p\/([\w-]+)|\/reel\/([\w-]+)/);
    if (m) return m[1] || m[2] || m[3] || null;
  }
  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export interface OEmbedInfo {
  title: string | null;
  author: string | null;
  thumbnailUrl: string | null;
}

/** Best-effort rich metadata via public oEmbed (no API key required). */
export async function fetchOEmbed(
  url: string,
  platform: Platform,
  videoId: string | null,
): Promise<OEmbedInfo> {
  const fallback: OEmbedInfo = {
    title: null,
    author: null,
    thumbnailUrl: videoId && platform === "youtube" ? youtubeThumbnail(videoId) : null,
  };
  try {
    if (platform === "youtube" || platform === "vimeo") {
      const endpoint =
        platform === "youtube"
          ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
          : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(4000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const d = await res.json();
        return {
          title: d.title ?? null,
          author: d.author_name ?? d.author_name ?? null,
          thumbnailUrl: d.thumbnail_url ?? fallback.thumbnailUrl,
        };
      }
    }
  } catch {
    // network/oEmbed failures are non-fatal — fall through to defaults
  }
  return fallback;
}
