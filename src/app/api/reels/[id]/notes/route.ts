import { NextResponse } from "next/server";
import { db } from "@/db";
import { reels, notes } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const content = (body.content ?? "").slice(0, 20000);

  // Upsert the single note row for this reel.
  const [existing] = await db
    .select({ id: notes.id })
    .from(notes)
    .where(eq(notes.reelId, num))
    .limit(1);

  if (existing) {
    await db
      .update(notes)
      .set({ content, updatedAt: new Date() })
      .where(eq(notes.id, existing.id));
  } else {
    await db.insert(notes).values({ reelId: num, content });
  }
  await db.update(reels).set({ updatedAt: new Date() }).where(eq(reels.id, num));
  return NextResponse.json({ ok: true });
}
