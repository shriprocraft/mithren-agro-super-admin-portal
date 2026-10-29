import type { Metadata } from "next";
import { ProjectsView } from "@/components/investments/projects-view";

export const metadata: Metadata = { title: "Project portfolio" };

export default function Page() {
  return <ProjectsView />;
}
