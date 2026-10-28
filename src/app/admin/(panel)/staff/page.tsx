import type { Metadata } from "next";
import { StaffView } from "@/components/admin-area/staff-view";

export const metadata: Metadata = { title: "Staff & permissions" };

export default function StaffPage() {
  return <StaffView />;
}
