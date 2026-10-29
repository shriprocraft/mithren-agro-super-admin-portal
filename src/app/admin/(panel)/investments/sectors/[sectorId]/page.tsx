import type { Metadata } from "next";
import { SectorDetailView } from "@/components/investments/sectors-view";

export const metadata: Metadata = { title: "Agricultural sector" };

// Records live in the browser (demo store), so the page renders any ID and the view handles unknown ones.
export default async function Page({ params }: { params: Promise<{ sectorId: string }> }) {
  const { sectorId } = await params;
  return <SectorDetailView sectorId={decodeURIComponent(sectorId)} />;
}
