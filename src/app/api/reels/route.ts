import { NextResponse } from "next/server";
import { db } from "@/db";
import { reels, notes, flashcards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseUrl, fetchOEmbed } from "@/lib/platform";
import { generateReelContent } from "@/lib/ai";
import { getTranscriptFromUrl } from "@/lib/transcript";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: reels.id,
      title: reels.title,
      status: reels.status,
      platform: reels.platform,
      createdAt: reels.createdAt,
    })
    .from(reels)
    .orderBy(reels.createdAt)
    .limit(100);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  let body: { url?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  const manualContent = (body.content ?? "").trim();

  console.log("[api/reels] POST received");
  console.log("[api/reels] raw url from client:", JSON.stringify(url));
  console.log("[api/reels] manualContent present:", !!manualContent);

  if (!url) {
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  }

  const parsed = parseUrl(url);
  console.log("[api/reels] parseUrl result:", JSON.stringify(parsed, null, 2));
  if (parsed && parsed.platform === "youtube") {
    console.log("[api/reels] videoId:", parsed.videoId);
    console.log("[api/reels] videoId length:", parsed.videoId?.length);
    console.log("[api/reels] videoId valid 11-char ID:", parsed.videoId?.length === 11);
  }

  if (!parsed) {
    return NextResponse.json(
      { error: "That doesn't look like a valid URL." },
      { status: 400 },
    );
  }

  const oembed = await fetchOEmbed(parsed.normalized, parsed.platform, parsed.videoId);

  let transcript: string | null = null;
  if (!manualContent) {
    transcript = await getTranscriptFromUrl(
      parsed.normalized,
      parsed.platform,
      parsed.videoId,
    );
  }

  const rawContent = manualContent || transcript || "";

  if (!rawContent) {
    return NextResponse.json(
      {
        error:
          parsed.platform === "youtube"
            ? "No captions available for this video. You can paste the transcript manually using the option below."
            : "Please paste the transcript or notes for this video.",
      },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(reels)
    .values({
      url: parsed.normalized,
      platform: parsed.platform,
      videoId: parsed.videoId,
      author: oembed.author,
      thumbnailUrl: oembed.thumbnailUrl,
      title: oembed.title,
      status: "processing",
      rawContent: rawContent.slice(0, 8000),
    })
    .returning({ id: reels.id });

  if (!created) {
    return NextResponse.json({ error: "Failed to create reel." }, { status: 500 });
  }

  await db.insert(notes).values({ reelId: created.id, content: "" });

  try {
    const out = await generateReelContent({
      url: parsed.normalized,
      content: rawContent,
      platform: parsed.platform,
      fetchedTitle: oembed.title,
    });

    await db
      .update(reels)
      .set({
        title: out.title,
        summary: out.summary,
        keyPoints: out.keyPoints,
        tags: out.tags,
        status: "ready",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(reels.id, created.id));

    if (out.flashcards.length > 0) {
      await db.insert(flashcards).values(
        out.flashcards.map((c) => ({
          reelId: created.id,
          front: c.front.slice(0, 400),
          back: c.back.slice(0, 600),
        })),
      );
    }

    return NextResponse.json({ id: created.id, status: "ready" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI processing failed.";
    await db
      .update(reels)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(reels.id, created.id));
    return NextResponse.json(
      { id: created.id, status: "failed", error: message },
      { status: 200 },
    );
  }
}
