import { NextResponse } from "next/server";
import { db } from "@/db";
import { reels } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  await db.delete(reels).where(eq(reels.id, num));
  return NextResponse.json({ ok: true });
}
