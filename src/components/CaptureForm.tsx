"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { getSharedUrl, clearSharedUrl } from "@/lib/share-intent";

// ---------------------------------------------------------------------------
// Device-side transcript helper — uses Capacitor's native HTTP client so the
// request comes from the phone's residential IP (not Render's blocked IP) and
// bypasses browser CORS entirely.
// ---------------------------------------------------------------------------

function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.searchParams.has("v")) return u.searchParams.get("v")!;
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    return null;
  } catch {
    return null;
  }
}

function decodeHtmlEnt(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function parseTranscriptXml(xml: string): string {
  let text = "";
  // srv3 format: <p t="ms" d="ms"><s>word</s>...</p>
  const pRe = /<p\s+t="\d+"\s+d="\d+"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(xml)) !== null) {
    const inner = m[1];
    let seg = "";
    const sRe = /<s[^>]*>([^<]*)<\/s>/g;
    let sm: RegExpExecArray | null;
    while ((sm = sRe.exec(inner)) !== null) seg += sm[1];
    if (!seg) seg = inner.replace(/<[^>]+>/g, "");
    text += seg + " ";
  }
  if (text.trim()) return decodeHtmlEnt(text.trim());
  // old format: <text start="s" dur="s">caption</text>
  const cRe = /<text[^>]*>([^<]*)<\/text>/g;
  while ((m = cRe.exec(xml)) !== null) text += m[1] + " ";
  return decodeHtmlEnt(text.trim());
}

async function fetchTranscriptOnDevice(videoId: string): Promise<string | null> {
  try {
    const { Capacitor, CapacitorHttp } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null; // web — can't bypass CORS

    // 1. Get caption tracks via InnerTube from the phone's IP
    const playerResp = await CapacitorHttp.post({
      url: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
      },
      data: {
        context: {
          client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34 },
          user: { lockedSafetyMode: false },
          request: { useSsl: true, internalExperimentFlags: [], consistencyTokenJars: [] },
        },
        videoId,
      },
    });

    const tracks =
      playerResp.data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    // 2. Download transcript — prefer English
    const track = tracks.find((t: any) => t.languageCode === "en") || tracks[0];
    const xmlResp = await CapacitorHttp.get({
      url: track.baseUrl,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
    });

    return parseTranscriptXml(xmlResp.data);
  } catch (err) {
    console.error("[CaptureForm] device fetch failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CaptureForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const submittedRef = useRef(false);

  /** POST to /api/reels — core submit, wrapped by the entry points below. */
  async function postAndRedirect(
    targetUrl: string,
    targetContent: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, content: targetContent }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error || "Something went wrong." };
      router.push(`/reel/${data.id}`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
    }
  }

  /** Shared intent / "paste link" auto-submit. */
  async function submitUrl(targetUrl: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    setTranscriptLoading(true);

    const result = await postAndRedirect(targetUrl, "");
    if (result.ok) return;

    // Server couldn't fetch the transcript — try from the phone (APK).
    if (result.error.includes("No captions available")) {
      const videoId = extractYouTubeVideoId(targetUrl);
      if (videoId) {
        const transcript = await fetchTranscriptOnDevice(videoId);
        if (transcript) {
          const retry = await postAndRedirect(targetUrl, transcript);
          if (retry.ok) return;
        }
      }
    }

    setError(result.error);
    setTranscriptLoading(false);
    submittedRef.current = false;
  }

  /** Manual form submission (button click or Enter). */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Paste a reel or video link to get started.");
      return;
    }
    console.log("[CaptureForm] manual submit URL:", url);
    setError(null);
    setLoading(true);

    const initialContent = content;
    const result = await postAndRedirect(url, initialContent);
    if (result.ok) return;

    // Only try device-side fallback if the user didn't already paste content.
    if (!initialContent && result.error.includes("No captions available")) {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        setTranscriptLoading(true);
        const transcript = await fetchTranscriptOnDevice(videoId);
        if (transcript) {
          const retry = await postAndRedirect(url, transcript);
          if (retry.ok) return;
        }
      }
    }

    setError(result.error);
    setLoading(false);
    setTranscriptLoading(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="mono text-xs font-semibold text-forest-mist">
          paste a link
        </label>
        <input
          id="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://youtube.com/shorts/…  or tiktok / insta / vimeo"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          className="field text-base"
          disabled={loading || transcriptLoading}
        />
      </div>

      {transcriptLoading && (
        <div className="clay-sm border-l-4 border-l-lime bg-lime-soft p-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-[3px] border-forest border-t-transparent" />
            <span className="font-semibold text-forest">
              Fetching transcript…
            </span>
          </div>
          <p className="mt-1 text-xs text-forest-soft">
            This usually takes a few seconds.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowManual((s) => !s)}
          className="mono flex items-center gap-2 text-xs text-forest-mist underline decoration-dotted underline-offset-2"
        >
          {showManual ? "▾ hide manual transcript" : "▸ add transcript manually"}
        </button>

        {showManual && (
          <textarea
            id="content"
            rows={4}
            placeholder="Paste the transcript, caption, or your own notes here. Loopback will learn from this instead."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="field resize-y text-sm leading-relaxed"
            disabled={loading || transcriptLoading}
          />
        )}
      </div>

      {error && (
        <div className="clay-sm pop-in border-lime bg-lime px-3 py-2 text-sm text-forest">
          ⚠ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || transcriptLoading}
        className="btn btn-lime w-full text-base"
      >
        {transcriptLoading ? (
          <>
            <Spinner /> fetching transcript…
          </>
        ) : loading ? (
          <>
            <Spinner /> distilling into notes…
          </>
        ) : (
          <>save & turn into notes →</>
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
