import type { Metadata } from "next";
import { SellersView } from "@/components/sellers/sellers-view";

export const metadata: Metadata = { title: "Seller approvals" };

export default function SellersApprovalsPage() {
  return <SellersView mode="approvals" />;
}
