import { developerCredit } from "@/config/brand";
import { siteConfig } from "@/config/site";

/**
 * Two-row footer, always rendered full-width at the end of the document flow (never fixed or
 * absolutely positioned):
 *   1. copyright and the demo-data notice;
 *   2. the developer credit, centred across the full viewport.
 */
export function SiteFooter() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-1.5 px-4 py-4 text-center text-xs leading-relaxed text-muted-foreground sm:px-6 md:flex-row md:justify-between md:gap-6 md:text-left lg:px-8">
        {/* legalName already ends with a full stop ("Pvt. Ltd."). */}
        <p className="md:shrink-0 md:whitespace-nowrap">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {siteConfig.legalName} All rights reserved.
        </p>
        <p className="max-w-2xl md:text-right">
          {siteConfig.productName} preview · All data is fictional sample data and every action is simulated in this browser. No real payment, payout or verification takes place.
        </p>
      </div>
      <div className="border-t border-border bg-white px-4 py-4 text-center">
        <a
          href={developerCredit.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-block rounded-md px-1.5 py-0.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Powered by{" "}
          <span className="font-semibold text-foreground underline-offset-4 group-hover:text-primary group-hover:underline">{developerCredit.label}</span>        </a>
      </div>
    </footer>
  );
}
