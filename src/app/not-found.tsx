import Link from "next/link";
import { Compass } from "lucide-react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { SiteFooter } from "@/components/shell/site-footer";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-soft">
      <main className="grid flex-1 place-items-center px-4 py-12">
        <div className="surface-card w-full max-w-md rounded-3xl p-8 text-center">
          <div className="flex justify-center"><BrandLogo className="w-40" /></div>
          <span className="mx-auto mt-6 grid size-12 place-items-center rounded-full bg-secondary text-primary">
            <Compass className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This address is not part of the Super Admin panel. Check the link, or go back to the dashboard.</p>
          <Link href="/admin" className="surface-primary mt-6 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
            Go to the dashboard
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
