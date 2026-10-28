import type { Metadata } from "next";
import { SettlementsView } from "@/components/finance/settlements-view";

export const metadata: Metadata = { title: "Seller settlements" };

export default function SettlementsPage() {
  return <SettlementsView />;
}
