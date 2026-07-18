import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shared = searchParams.get("url") || searchParams.get("text");
  if (shared) {
    return NextResponse.redirect(
      new URL(`/?shared=${encodeURIComponent(shared)}`, req.url),
    );
  }
  return NextResponse.redirect(new URL("/", req.url));
}
