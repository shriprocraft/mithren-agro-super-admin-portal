import type { Metadata } from "next";
import { RefundsView } from "@/components/payments/refunds-view";

export const metadata: Metadata = { title: "Refunds" };

export default function RefundsPage() {
  return <RefundsView />;
}
