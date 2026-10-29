import type { Metadata } from "next";
import { DocumentsView } from "@/components/investments/documents-view";

export const metadata: Metadata = { title: "Investment documents" };

export default function Page() {
  return <DocumentsView />;
}
