import type { Metadata } from "next";
import { InvestmentSettingsView } from "@/components/investments/settings-view";

export const metadata: Metadata = { title: "Investment rules" };

export default function Page() {
  return <InvestmentSettingsView />;
}
