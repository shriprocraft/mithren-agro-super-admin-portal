import type { Metadata } from "next";
import { ParticipationsView } from "@/components/investments/participations-view";

export const metadata: Metadata = { title: "Investment participations" };

export default function Page() {
  return <ParticipationsView />;
}
