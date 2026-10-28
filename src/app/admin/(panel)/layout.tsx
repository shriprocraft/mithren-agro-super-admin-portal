import { Suspense } from "react";
import { LoadingState } from "@/components/admin/primitives";
import { AdminShell } from "@/components/shell/admin-shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      {/* Pages read URL filters with useSearchParams, which needs a Suspense boundary. */}
      <Suspense fallback={<LoadingState />}>{children}</Suspense>
    </AdminShell>
  );
}
