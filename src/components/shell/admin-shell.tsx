"use client";

import * as React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "cn";
import { ChevronRight, FlaskConical, LoaderCircle, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { LoadingState } from "@/components/admin/primitives";
import { ToastProvider, useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { consumeExplicitSignOut, mockSignOut, useSession } from "@/lib/auth/session";
import { recordSignIn } from "@/lib/mock/actions";
import { useDemoDb, useRunAction } from "@/lib/store/demo-store";
import type { DemoDb } from "@/lib/types";
import { BrandLogo } from "./brand-logo";
import { activeHref, breadcrumbsFor, findNavItem, NAV_GROUPS, type BadgeKey } from "./nav";

function badgeCounts(db: DemoDb): Record<BadgeKey, number> {
  return {
    pendingSellers: db.sellers.filter((s) => s.status === "pending").length,
    pendingProducts: db.products.filter((p) => p.approvalStatus === "pending").length,
    requestedRefunds: db.refunds.filter((r) => r.status === "requested").length,
    openTickets: db.tickets.filter((t) => t.status === "open").length,
  };
}

function SidebarNav({ db, onNavigate }: { db: DemoDb; onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const counts = badgeCounts(db);
  return (
    <nav aria-label="Super Admin" className="scrollbar-subtle flex-1 overflow-y-auto px-3 pt-4 pb-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mt-6 first:mt-0">
          <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.href === current;
              const count = item.badge ? counts[item.badge] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-secondary font-medium text-secondary-foreground" : "text-foreground/80 hover:bg-soft hover:text-primary",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary" aria-hidden="true" />}
                    <item.icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} aria-hidden="true" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <PendingHint />
                    {count > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                        {count}
                        <span className="sr-only"> pending</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Inline feedback while a sidebar link's navigation is pending (Next.js useLinkStatus). */
function PendingHint() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span role="status" className="grid size-4 place-items-center">
      <LoaderCircle className="size-3.5 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </span>
  );
}

/** Logo on its own line with the role badge beneath it, separated from the navigation by a divider. */
function SidebarBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-2.5 border-b border-border px-6 pt-6 pb-5", className)}>
      <Link href="/admin" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4" aria-label="Mithren Agro Super Admin dashboard">
        <BrandLogo className="w-[156px]" preload />
      </Link>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-secondary-foreground uppercase ring-1 ring-primary/10 ring-inset">
        <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
        Super Admin
      </span>
    </div>
  );
}

function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const session = useSession();
  const run = useRunAction();
  const toast = useToast();
  const item = findNavItem(activeHref(pathname) ?? "");
  const crumbs = breadcrumbsFor(pathname);

  const logout = () => {
    run(recordSignIn, { event: "sign_out" });
    toast.info("Signed out of the demo.");
    // The route guard performs the redirect to /admin/login once the session is cleared.
    mockSignOut();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="flex min-h-[4.5rem] items-center gap-x-4 px-4 py-3 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0 lg:hidden" onClick={onOpenMenu} aria-label="Open navigation menu">
          <Menu className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb">
            {/* On phones the current page is omitted from the trail: the title right below names it. */}
            <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
              {crumbs.map((crumb, i) => (
                <li key={`${i}-${crumb.href}`} className={cn("flex min-w-0 items-center gap-1.5", i === crumbs.length - 1 && i > 0 && "max-sm:hidden")}>
                  {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />}
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page" className="font-medium text-foreground">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="rounded hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <p className="mt-1 truncate text-lg leading-6 font-semibold text-foreground" aria-hidden="true">
            {item?.title ?? item?.label ?? "Super Admin"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <span className="hidden items-center gap-1.5 rounded-full bg-info/10 px-3 py-1.5 text-xs font-medium text-info ring-1 ring-info/15 ring-inset md:inline-flex" title="All data is fictional and all actions are simulated in this browser.">
            <FlaskConical className="size-3.5" aria-hidden="true" />
            Demo data
          </span>
          {session.status === "signed_in" && (
            <>
              <span className="hidden h-8 w-px bg-border md:block" aria-hidden="true" />
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground ring-1 ring-primary/10" aria-hidden="true">
                  {session.session.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="hidden min-w-0 lg:block">
                  <p className="truncate text-sm leading-5 font-medium text-foreground">{session.session.name}</p>
                  <p className="text-xs leading-4 text-muted-foreground">Super Admin · mock sign-in</p>
                </div>
              </div>
            </>
          )}
          <Button variant="outline" onClick={logout} className="max-sm:size-11 max-sm:px-0" aria-label="Log out">
            <LogOut aria-hidden="true" />
            <span className="max-sm:sr-only">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ShellFrame({ db, children }: { db: DemoDb; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <div className="min-h-svh bg-soft">
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex" aria-label="Sidebar">
        <SidebarBrand />
        <SidebarNav db={db} />
      </aside>
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30 lg:hidden data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-card shadow-overlay outline-none lg:hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Super Admin sections</DialogPrimitive.Description>
            <div className="relative">
              <SidebarBrand className="pr-16" />
              <DialogPrimitive.Close className="absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-soft hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Close navigation menu</span>
              </DialogPrimitive.Close>
            </div>
            <SidebarNav db={db} onNavigate={() => setMenuOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <div className="lg:pl-64">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Frontend-only route check for the demo. It redirects to the login page when there is no demo
 * session. It is NOT a security boundary: everything it protects is already in the browser bundle.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const db = useDemoDb();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (session.status === "signed_out") router.replace(consumeExplicitSignOut() ? "/admin/login" : `/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [session.status, router, pathname]);

  if (session.status === "loading" || !db) return <LoadingState label="Loading the Super Admin demo…" fullHeight />;
  if (session.status === "signed_out") return <LoadingState label="Redirecting to sign in…" fullHeight />;
  return (
    <ToastProvider>
      <ShellFrame db={db}>{children}</ShellFrame>
    </ToastProvider>
  );
}
