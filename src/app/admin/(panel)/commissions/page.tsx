import type { Metadata } from "next";
import { CommissionsView } from "@/components/finance/commissions-view";

export const metadata: Metadata = { title: "Commissions" };

export default function CommissionsPage() {
  return <CommissionsView />;
}
