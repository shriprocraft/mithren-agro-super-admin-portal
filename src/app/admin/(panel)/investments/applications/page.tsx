import type { Metadata } from "next";
import { ApplicationsView } from "@/components/investments/applications-view";

export const metadata: Metadata = { title: "Investor applications" };

export default function Page() {
  return <ApplicationsView />;
}
