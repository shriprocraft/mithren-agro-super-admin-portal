"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Field } from "@/components/admin/field";
import { Card, DemoNotice, EmptyState, InlineAlert, NeedsClarification, PageHeader } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { BrandLogo } from "@/components/shell/brand-logo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { designTokens } from "@/config/design-tokens";
import { toggleSettingsItem, updateSettings } from "@/lib/mock/actions";
import { resetDemoData } from "@/lib/store/demo-store";

export function SettingsView() {
  const { db, run, act, confirm, confirmDialog, toast } = useAdmin();
  const s = db.settings;
  const [form, setForm] = React.useState({ marketplaceName: s.branding.marketplaceName, tagline: s.branding.tagline, supportEmail: s.contact.supportEmail, supportPhone: s.contact.supportPhone });
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof form, string>>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })); };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      marketplaceName: form.marketplaceName.trim() ? undefined : "Marketplace name is required.",
      supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim()) ? undefined : "Enter a valid email address.",
      supportPhone: /^\+?[0-9][0-9\s-]{7,16}$/.test(form.supportPhone.trim()) ? undefined : "Enter a valid phone number.",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const r = run(updateSettings, { branding: { marketplaceName: form.marketplaceName, tagline: form.tagline }, contact: { supportEmail: form.supportEmail, supportPhone: form.supportPhone } });
    if (r.ok) toast.success(r.message); else toast.info(r.error);
  };

  const toggle = (group: "paymentOptions" | "featureToggles", id: string, label: string, enabled: boolean) =>
    enabled
      ? act(toggleSettingsItem, { group, id, enabled })
      : confirm({ title: `Disable ${label}?`, description: "This is a demo setting; no provider or storefront is affected.", confirmLabel: "Disable", tone: "danger", onConfirm: () => run(toggleSettingsItem, { group, id, enabled }) });

  const reset = () =>
    confirm({
      title: "Reset all demo data?",
      description: "Every change made in this browser (approvals, refunds, settings, audit entries…) is discarded and the original demo records are restored. Your demo session stays signed in.",
      confirmLabel: "Reset demo data",
      tone: "danger",
      onConfirm: () => { resetDemoData(); return { ok: true, db, message: "Demo data reset to its original state." }; },
    });

  return (
    <>
      <PageHeader title="Settings" description="Branding, currency, timezone, contact details, payment options, shipping rules, taxes, policies, feature toggles and notifications." />
      <DemoNotice>All values are <strong>demo settings</strong> stored in this browser. No payment, messaging or shipping provider is connected.</DemoNotice>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Branding and contact" className="xl:row-span-2">
          <form onSubmit={save} noValidate className="grid gap-4">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4">
              <BrandLogo className="w-32" />
              <p className="text-xs text-muted-foreground">Official Mithren Agro logo, shared with the customer storefront. Replacing the logo is not available in this demo.</p>
            </div>
            <dl className="flex flex-wrap gap-2 text-xs" aria-label="Brand colours">
              {(["primary", "primaryHover", "accentGreen", "gold", "textPrimary"] as const).map((k) => (
                <div key={k} className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1">
                  <span className="size-3.5 rounded-full ring-1 ring-border" style={{ background: designTokens.colors[k] }} aria-hidden="true" />
                  <dt className="sr-only">{k}</dt><dd className="font-mono">{designTokens.colors[k]}</dd>
                </div>
              ))}
            </dl>
            <Field label="Marketplace name" required error={errors.marketplaceName}><Input value={form.marketplaceName} onChange={set("marketplaceName")} placeholder="e.g. Mithren Agro" maxLength={60} /></Field>
            <Field label="Tagline"><Input value={form.tagline} onChange={set("tagline")} placeholder="A short line shown under the name" maxLength={120} /></Field>
            <Field label="Support email" required error={errors.supportEmail}><Input type="email" value={form.supportEmail} onChange={set("supportEmail")} placeholder="support@yourdomain.com" autoComplete="email" /></Field>
            <Field label="Support phone" required error={errors.supportPhone}><Input type="tel" value={form.supportPhone} onChange={set("supportPhone")} placeholder="+91 98765 43210" autoComplete="tel" /></Field>
            <Button type="submit" className="justify-self-start">Save settings</Button>
          </form>
        </Card>

        <Card title="Currency and timezone">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-soft px-4 py-3"><dt className="text-xs text-muted-foreground">Currency</dt><dd className="font-semibold">{s.currency} (₹)</dd></div>
            <div className="rounded-xl bg-soft px-4 py-3"><dt className="text-xs text-muted-foreground">Timezone</dt><dd className="font-semibold">{s.timezone} (IST)</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Source-defined defaults. Supporting other currencies or timezones is not specified, so these are fixed.</p>
        </Card>

        <Card title="Payment options" description="Methods offered at checkout (demo; no gateway connected).">
          <ToggleList items={s.paymentOptions.map((p) => ({ ...p, description: undefined }))} onToggle={(id, label, v) => toggle("paymentOptions", id, label, v)} />
        </Card>

        <Card title="Feature toggles">
          <ToggleList items={s.featureToggles} onToggle={(id, label, v) => toggle("featureToggles", id, label, v)} />
        </Card>

        <Card title="Shipping rules, taxes and policies">
          <div className="grid gap-3">
            <NeedsClarification refId="Q-SHIPPING">Shipping rules beyond per-zone fees and minimum order values are not specified. Zone settings are managed on the <Link href="/admin/delivery" className="font-medium text-primary underline">Delivery</Link> page.</NeedsClarification>
            <NeedsClarification refId="Q-TAX">Tax rates, GST registration details and tax-inclusive pricing are not specified, so no tax settings are offered.</NeedsClarification>
            <InlineAlert tone="info">Policy pages are edited under <Link href="/admin/content" className="font-medium text-primary underline">Content → Policy pages</Link>.</InlineAlert>
          </div>
        </Card>

        <Card title="Notifications" description="Templates and delivery logs (scope §4.12).">
          <ul className="divide-y divide-border rounded-xl border border-border text-sm">
            {s.notificationTemplates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                <div><p className="font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.subject}</p></div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{t.channel}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4"><EmptyState title="No delivery logs" description="Email, SMS, WhatsApp and push providers are not configured in this frontend-only phase, so nothing has been sent and there are no delivery logs." /></div>
          <p className="mt-3 text-xs text-muted-foreground">Templates are view-only; the source lists notifications in scope but defines no route or editing rules for them (Q-NOTIFICATIONS).</p>
        </Card>

        <Card title="Investment rules" description="Plan terms, eligibility, allocation, lifecycle, returns, payouts, applications, documents and alerts.">
          <p className="mb-3 text-sm text-muted-foreground">Investment business rules are recorded only after Mithren Agro approves them, and each one is versioned.</p>
          <Link href="/admin/investments/settings" className="font-medium text-primary underline">Open investment rules &amp; settings</Link>
        </Card>

        <Card title="Demo data" description="Restore the original demo records.">
          <p className="mb-3 text-sm text-muted-foreground">Demo changes are kept in this browser&apos;s local storage until you reset them or clear site data.</p>
          <Button variant="destructive" onClick={reset}><RotateCcw aria-hidden="true" />Reset demo data</Button>
        </Card>
      </div>
      {confirmDialog}
    </>
  );
}

function ToggleList({ items, onToggle }: { items: { id: string; label: string; description?: string; enabled: boolean }[]; onToggle: (id: string, label: string, enabled: boolean) => void }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div>
            <p id={`${item.id}-label`} className="text-sm font-medium">{item.label}</p>
            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
          </div>
          <Switch checked={item.enabled} onCheckedChange={(v) => onToggle(item.id, item.label, v)} aria-labelledby={`${item.id}-label`} />
        </li>
      ))}
    </ul>
  );
}
