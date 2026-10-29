import type { Metadata } from "next";
import { ProjectDetailView } from "@/components/investments/project-detail";

export const metadata: Metadata = { title: "Project" };

// Records live in the browser (demo store), so the page renders any ID and the view handles unknown ones.
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectDetailView projectId={decodeURIComponent(projectId)} />;
}
