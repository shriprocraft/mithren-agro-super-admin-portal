import * as React from "react";
import { cn } from "cn";
import { AlertTriangle, CircleCheck, CircleDot, CircleHelp, CircleX, FlaskConical, Info, Inbox, LoaderCircle, type LucideIcon } from "lucide-react";
import { statusMeta, type StatusDomain, type Tone } from "@/lib/status";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-info/10 text-info ring-info/20",
  neutral: "bg-secondary text-muted-foreground ring-border",
};
const TONE_ICON: Record<Tone, LucideIcon> = { success: CircleCheck, warning: AlertTriangle, danger: CircleX, info: CircleDot, neutral: CircleDot };

export function Badge({ tone = "neutral", icon = true, className, children }: { tone?: Tone; icon?: boolean; className?: string; children: React.ReactNode }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONE_CLASS[tone], className)}>
      {icon && <Icon className="size-3 shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function StatusBadge({ domain, value, className }: { domain: StatusDomain; value: string | boolean; className?: string }) {
  const { label, tone } = statusMeta(domain, value);
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.625rem] leading-tight font-semibold text-foreground sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, className, bodyClassName, children, as: As = "section" }: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  as?: "section" | "div";
}) {
  return (
    <As className={cn("surface-card min-w-0 rounded-2xl", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </As>
  );
}

/** Persistent reminder that the page shows demo data and simulated outcomes. */
export function DemoNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="note" className={cn("mb-5 flex gap-2.5 rounded-2xl border border-info/20 bg-info/5 px-4 py-3 text-[13px] leading-relaxed text-foreground", className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** Marks a value or feature whose business rule the source does not define. */
export function NeedsClarification({ children, compact = false, refId }: { children?: React.ReactNode; compact?: boolean; refId?: string }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-warning ring-1 ring-warning/20 ring-inset">
        <CircleHelp className="size-3" aria-hidden="true" />
        Needs clarification
      </span>
    );
  }
  return (
    <div role="note" className="flex gap-2.5 rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-[13px] leading-relaxed text-foreground">
      <CircleHelp className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-semibold text-warning">Needs clarification{refId ? ` (${refId})` : ""}</p>
        {children && <div className="mt-0.5 text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}

export function InlineAlert({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: React.ReactNode; className?: string }) {
  const Icon = tone === "danger" ? CircleX : tone === "warning" ? AlertTriangle : tone === "success" ? CircleCheck : Info;
  const color = tone === "danger" ? "text-destructive border-destructive/25 bg-destructive/5" : tone === "warning" ? "text-warning border-warning/25 bg-warning/5" : tone === "success" ? "text-success border-success/25 bg-success/5" : "text-info border-info/20 bg-info/5";
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed", color, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="text-foreground">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }: { title: string; description?: string; action?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-soft/60 px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…", fullHeight = false }: { label?: string; fullHeight?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2 text-sm text-muted-foreground", fullHeight ? "min-h-svh" : "py-16")}>
      <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Description list for record details. */
export function DetailList({ items, columns = 2 }: { items: { label: string; value: React.ReactNode }[]; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3.5", columns === 2 && "sm:grid-cols-2")}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-foreground">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("mb-3 text-sm font-semibold text-foreground", className)}>{children}</h3>;
}

/** Vertical activity list (history, audit trail, ticket history). */
export function Timeline({ items }: { items: { at: string; title: React.ReactNode; meta?: React.ReactNode }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No activity recorded.</p>;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-primary" aria-hidden="true" />
          <p className="text-sm text-foreground">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.at}
            {item.meta && <> · {item.meta}</>}
          </p>
        </li>
      ))}
    </ol>
  );
}
