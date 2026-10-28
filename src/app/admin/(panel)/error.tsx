"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetDemoData } from "@/lib/store/demo-store";

// Shown when a page throws while rendering. No stack trace or internal detail is displayed; the error
// is still logged to the console for development. The demo renders from client-side state, so reset()
// (re-render without refetching) is the appropriate recovery rather than retry().
export default function PanelError({ error, reset }: { error: unknown; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="surface-card mx-auto max-w-lg rounded-3xl p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-foreground">This page could not be displayed</h1>
      <p className="mt-2 text-sm text-muted-foreground">Something went wrong while showing this section. Try again. If the demo data in this browser is damaged, resetting it restores the original demo records.</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="outline"
          onClick={() => {
            resetDemoData();
            reset();
          }}
        >
          <RotateCcw aria-hidden="true" />
          Reset demo data
        </Button>
      </div>
    </div>
  );
}
