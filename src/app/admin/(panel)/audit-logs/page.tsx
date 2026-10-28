import type { Metadata } from "next";
import { AuditView } from "@/components/admin-area/audit-view";

export const metadata: Metadata = { title: "Audit logs" };

export default function AuditLogsPage() {
  return <AuditView />;
}
