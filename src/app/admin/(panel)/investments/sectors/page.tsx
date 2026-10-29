import type { Metadata } from "next";
import { SectorsView } from "@/components/investments/sectors-view";

export const metadata: Metadata = { title: "Agricultural sectors" };

export default function Page() {
  return <SectorsView />;
}
