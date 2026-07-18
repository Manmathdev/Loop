import "server-only";

const BASE = (process.env.OPENCODE_ZEN_BASE_URL || "https://opencode.ai/zen/v1").replace(/\/+$/, "");
const MODEL = process.env.OPENCODE_ZEN_MODEL || "deepseek-v4-flash-free";

export interface AiReelOutput {
  title: string;
  summary: string;
  keyPoints: string[];
  flashcards: { front: string; back: string }[];
  tags: string[];
}

const SYSTEM = `You are Loopback's study engine. You convert short-form video content (reels, Shorts, TikToks) into durable, retained knowledge.

Given a video URL and its transcript / caption / the user's notes about it, produce study material.
Respond with ONLY one valid JSON object — no markdown, no code fences, no prose before or after — matching this exact shape:
{"title":string,"summary":string,"keyPoints":string[],"flashcards":[{"front":string,"back":string}],"tags":string[]}

Rules:
- title: short and punchy, <= 60 chars, title case.
- summary: 2-3 sentences, plain language, capturing the core takeaway.
- keyPoints: 3 to 6 concise, non-redundant bullets. Each stands alone.
- flashcards: 3 to 6 cards. "front" is a crisp recall question or prompt; "back" is a tight, self-contained answer. Never yes/no questions. Test understanding, not trivia.
- tags: 2 to 5 lowercase single-word topic tags.
- Stay faithful to the provided content. If a fact is uncertain, keep the answer hedged.
- If the content is nearly empty, do your best to infer a useful angle from the title/URL; if truly impossible, return a single explanatory flashcard.`;

async function aiFetch(
  endpoint: string,
  body: object,
  signal: AbortSignal,
): Promise<Response> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENCODE_ZEN_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  return res;
}

export async function generateReelContent(input: {
  url: string;
  content: string;
  platform: string | null;
  fetchedTitle?: string | null;
}): Promise<AiReelOutput> {
  const apiKey = process.env.OPENCODE_ZEN_API_KEY;
  if (!apiKey) throw new Error("OPENCODE_ZEN_API_KEY is not configured.");

  const user = [
    `URL: ${input.url}`,
    `Platform: ${input.platform || "unknown"}`,
    input.fetchedTitle ? `Detected title: ${input.fetchedTitle}` : "",
    "Content to learn from:",
    "----",
    input.content.trim() || "(no transcript provided — infer from the title/url where possible)",
    "----",
  ]
    .filter(Boolean)
    .join("\n");

  const endpoint = `${BASE}/chat/completions`;
  const body = {
    model: MODEL,
    temperature: 0.4,
    max_tokens: 2600,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
  };

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45000);

    try {
      const res = await aiFetch(endpoint, body, ac.signal);
      clearTimeout(timer);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        if (res.status === 429) {
          lastErr = new Error(`AI rate limited (429). Retrying…`);
          continue;
        }
        throw new Error(`AI request failed (${res.status}): ${txt.slice(0, 200)}`);
      }

      const data = await res.json();
      const raw: string =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.message?.reasoning ??
        "";
      if (!raw) throw new Error("AI returned an empty response.");
      return parseAiOutput(raw);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        lastErr = new Error("AI request timed out after 45s.");
      } else {
        lastErr = err instanceof Error ? err : new Error("Unknown AI error.");
      }
    }
  }

  throw lastErr ?? new Error("AI processing failed after 3 attempts.");
}

function parseAiOutput(raw: string): AiReelOutput {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI returned malformed JSON.");
  }
  return normalize(parsed);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : String((x as { text?: string })?.text ?? x)))
    .filter((s) => s && s.trim());
}

function normalize(p: unknown): AiReelOutput {
  const obj = (p ?? {}) as Record<string, unknown>;
  const rawCards =
    (obj.flashcards as unknown[]) ??
    (obj.cards as unknown[]) ??
    [];
  const cards = rawCards
    .map((c) => {
      if (typeof c === "string") return { front: c, back: "" };
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        front: String(o.front ?? o.q ?? o.question ?? ""),
        back: String(o.back ?? o.a ?? o.answer ?? ""),
      };
    })
    .filter((c) => c.front.trim() && c.back.trim());

  return {
    title: String(obj.title ?? "Untitled reel").trim().slice(0, 120) || "Untitled reel",
    summary: String(obj.summary ?? "").trim(),
    keyPoints: asStringArray(obj.keyPoints ?? obj.key_points).slice(0, 8),
    flashcards: cards.slice(0, 8),
    tags: asStringArray(obj.tags ?? obj.tag)
      .map((t) => t.toLowerCase())
      .slice(0, 6),
  };
}
