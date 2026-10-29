import type { Metadata } from "next";
import { PlansView } from "@/components/investments/plans-view";

export const metadata: Metadata = { title: "Investment plans" };

export default function Page() {
  return <PlansView />;
}
