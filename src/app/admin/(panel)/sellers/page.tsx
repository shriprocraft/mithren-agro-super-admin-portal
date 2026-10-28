import type { Metadata } from "next";
import { SellersView } from "@/components/sellers/sellers-view";

export const metadata: Metadata = { title: "Sellers" };

export default function SellersPage() {
  return <SellersView mode="all" />;
}
