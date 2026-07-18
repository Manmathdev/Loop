"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSharedUrl, clearSharedUrl } from "@/lib/share-intent";

export function CaptureForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  useEffect(() => {
    getSharedUrl().then((u) => {
      if (u) {
        setUrl(u);
        setSharedUrl(u);
        clearSharedUrl();
      }
    });
  }, []);

  useEffect(() => {
    if (sharedUrl && !loading) {
      submitAuto();
    }
  }, [sharedUrl]);

  async function submitAuto() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sharedUrl, content: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      setSharedUrl(null);
      router.push(`/reel/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a reel or video link to get started.");
      return;
    }
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
      {sharedUrl && loading && (
        <div className="clay-sm border-l-4 border-l-lime bg-lime-soft p-3 text-sm">
          <p className="font-semibold text-forest">Processing shared video…</p>
          <p className="mt-1 text-xs text-forest-soft">{sharedUrl}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="mono text-xs font-semibold text-forest-mist">
          01 · the reel link
        </label>
        <input
          id="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="https://youtube.com/shorts/…  or tiktok / insta / vimeo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="field text-base"
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="content"
            className="mono text-xs font-semibold text-forest-mist"
          >
            02 · what was it about?
          </label>
          <button
            type="button"
            onClick={() => setShowTips((s) => !s)}
            className="mono text-[11px] underline decoration-dotted underline-offset-2 text-forest-mist"
          >
            {showTips ? "hide tips" : "how do I get this?"}
          </button>
        </div>
        {showTips && (
          <div className="clay-sm pop-in mb-1 bg-lime-soft p-3 text-xs leading-relaxed text-forest-soft">
            <p className="mb-1 font-semibold text-forest">Best results:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <b>YouTube:</b> open the video → <span className="mono">···</span> →{" "}
                <i>Show transcript</i> → copy &amp; paste it here.
              </li>
              <li>Or paste the on-screen caption / description.</li>
              <li>Or just jot what you remember in your own words.</li>
            </ul>
          </div>
        )}
        <textarea
          id="content"
          rows={5}
          placeholder="Paste the transcript or caption — or jot a few sentences about what the reel actually taught you. This is what Loopback learns from."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="field resize-y text-sm leading-relaxed"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="clay-sm pop-in border-lime bg-lime px-3 py-2 text-sm text-forest">
          ⚠ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-lime w-full text-base"
      >
        {loading ? (
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
