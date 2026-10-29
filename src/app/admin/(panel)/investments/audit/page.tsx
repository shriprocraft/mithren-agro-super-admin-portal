import type { Metadata } from "next";
import { InvestmentAuditView } from "@/components/investments/audit-view";

export const metadata: Metadata = { title: "Investment audit trail" };

export default function Page() {
  return <InvestmentAuditView />;
}
