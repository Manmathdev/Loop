"use client";

import { useEffect, useRef, useState } from "react";

export function NotesEditor({
  reelId,
  initial,
}: {
  reelId: number;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave (debounced) whenever the content changes.
  useEffect(() => {
    if (!dirty.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await fetch(`/api/reels/${reelId}/notes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: value }),
        });
        setStatus("saved");
      } catch {
        setStatus("idle");
      }
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, reelId]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="display text-xl text-forest">my notes</h2>
        <span className="mono text-[11px] text-forest-mist">
          {status === "saving" && "saving…"}
          {status === "saved" && "✓ saved"}
          {status === "idle" && "edits autosave"}
        </span>
      </div>
      <textarea
        rows={8}
        value={value}
        onChange={(e) => {
          dirty.current = true;
          setValue(e.target.value);
        }}
        placeholder="Add your own takeaways, examples, or connections…"
        className="field resize-y text-sm leading-relaxed"
      />
    </div>
  );
}
