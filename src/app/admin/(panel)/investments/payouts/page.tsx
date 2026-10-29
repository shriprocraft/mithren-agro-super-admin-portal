import type { Metadata } from "next";
import { PayoutsView } from "@/components/investments/payouts-view";

export const metadata: Metadata = { title: "Returns & payouts" };

export default function Page() {
  return <PayoutsView />;
}
