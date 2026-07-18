"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { getSharedUrl, clearSharedUrl } from "@/lib/share-intent";

export function CaptureForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cleanup: { remove: () => void } | null = null;

    async function check() {
      submittedRef.current = false;
      const u = await getSharedUrl();
      if (u) {
        setUrl(u);
        await clearSharedUrl();
        submitUrl(u);
      }
    }

    check();
    App.addListener("resume", check).then((h) => {
      cleanup = h;
    });

    return () => {
      cleanup?.remove();
    };
  }, []);

  async function submitUrl(targetUrl: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    setTranscriptLoading(true);
    try {
      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, content: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      router.push(`/reel/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setTranscriptLoading(false);
      submittedRef.current = false;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Paste a reel or video link to get started.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      router.push(`/reel/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
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
