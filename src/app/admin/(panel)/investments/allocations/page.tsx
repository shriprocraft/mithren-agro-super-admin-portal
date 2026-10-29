import type { Metadata } from "next";
import { AllocationsView } from "@/components/investments/allocations-view";

export const metadata: Metadata = { title: "Project allocations" };

export default function Page() {
  return <AllocationsView />;
}
