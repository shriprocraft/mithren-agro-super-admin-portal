import type { Metadata } from "next";
import { InvestmentOverviewView } from "@/components/investments/overview-view";

export const metadata: Metadata = { title: "Investment overview" };

export default function Page() {
  return <InvestmentOverviewView />;
}
