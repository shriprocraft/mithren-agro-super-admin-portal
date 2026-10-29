import type { Metadata } from "next";
import { InvestmentReportsView } from "@/components/investments/reports-view";

export const metadata: Metadata = { title: "Investment reports" };

export default function Page() {
  return <InvestmentReportsView />;
}
