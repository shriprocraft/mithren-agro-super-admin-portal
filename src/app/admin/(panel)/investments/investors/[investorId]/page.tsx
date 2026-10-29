import type { Metadata } from "next";
import { InvestorDetailView } from "@/components/investments/investor-detail";

export const metadata: Metadata = { title: "Investor" };

// Records live in the browser (demo store), so the page renders any ID and the view handles unknown ones.
export default async function Page({ params }: { params: Promise<{ investorId: string }> }) {
  const { investorId } = await params;
  return <InvestorDetailView investorId={decodeURIComponent(investorId)} />;
}
