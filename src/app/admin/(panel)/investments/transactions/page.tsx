import type { Metadata } from "next";
import { TransactionsView } from "@/components/investments/transactions-view";

export const metadata: Metadata = { title: "Contributions & transactions" };

export default function Page() {
  return <TransactionsView />;
}
