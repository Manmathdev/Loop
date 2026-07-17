import { listReelsWithCounts } from "@/lib/queries";
import { LibraryView } from "@/components/LibraryView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Library — Loopback" };

export default async function LibraryPage() {
  const reels = await listReelsWithCounts(200);
  return <LibraryView reels={reels} />;
}
