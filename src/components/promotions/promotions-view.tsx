"use client";

import * as React from "react";
import Image from "next/image";
import { Pencil, Plus, Star, X } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, EmptyState, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { scheduleState } from "@/lib/dates";
import { formatDate, formatINR, humanize } from "@/lib/format";
import { saveBanner, saveCampaign, saveCoupon, setFeatured, setPromotionEnabled, validateDates, type ActionResult } from "@/lib/mock/actions";
import { byId } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { Banner, Campaign, Coupon, DemoDb } from "@/lib/types";

type Editing = { kind: "coupon"; item: Coupon | null } | { kind: "campaign"; item: Campaign | null } | { kind: "banner"; item: Banner | null } | null;

const discountLabel = (c: Coupon) => (c.discountType === "percentage" ? `${c.discountValue}% off` : `${formatINR(c.discountValue)} off`);
const Dates = ({ from, to }: { from: string; to: string }) => <span className="whitespace-nowrap">{formatDate(from)} – {formatDate(to)}</span>;

export function PromotionsView() {
  const { db, run, act, confirm, confirmDialog, toast } = useAdmin();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [query, setQuery] = React.useState("");
  const [schedule, setSchedule] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [couponEnabled, setCouponEnabled] = React.useState("");
  const [discountType, setDiscountType] = React.useState("");
  const [limitFilter, setLimitFilter] = React.useState("");
  const [campaignEnabled, setCampaignEnabled] = React.useState("");

  const toggle = (k: "coupon" | "campaign" | "banner", id: string, label: string, enabled: boolean) => {
    if (enabled) return act(setPromotionEnabled, { kind: k, id, enabled });
    confirm({ title: `Disable ${label}?`, description: `The ${k} will be marked Disabled in this demo. The storefront is not changed.`, confirmLabel: `Disable ${k}`, tone: "danger", onConfirm: () => run(setPromotionEnabled, { kind: k, id, enabled }) });
  };
  const save = (result: ActionResult) => {
    if (result.ok) { toast.success(result.message); setEditing(null); return null; }
    return result.error;
  };

  const coupons = db.coupons.filter(
    (c) =>
      (!schedule || scheduleState(c.startsAt, c.endsAt) === schedule) &&
      (!couponEnabled || String(c.enabled) === couponEnabled) &&
      (!discountType || c.discountType === discountType) &&
      (!limitFilter || (limitFilter === "limited" ? c.usageLimit !== null : c.usageLimit === null)) &&
      matchesSearch(query, [c.code, c.description]),
  );
  const campaigns = db.campaigns.filter(
    (c) =>
      (!kind || c.kind === kind) &&
      (!schedule || scheduleState(c.startsAt, c.endsAt) === schedule) &&
      (!campaignEnabled || String(c.enabled) === campaignEnabled) &&
      matchesSearch(query, [c.name, c.description]),
  );

  const couponColumns: Column<Coupon>[] = [
    { key: "code", header: "Code", sortValue: (c) => c.code, cell: (c) => <div><code className="rounded bg-secondary px-1.5 py-0.5 text-[13px] font-semibold text-secondary-foreground">{c.code}</code><p className="mt-1 line-clamp-1 max-w-[16rem] text-xs text-muted-foreground">{c.description}</p></div> },
    { key: "discount", header: "Discount", sortValue: (c) => c.discountValue, cell: discountLabel },
    { key: "dates", header: "Valid", sortValue: (c) => c.startsAt, cell: (c) => <Dates from={c.startsAt} to={c.endsAt} /> },
    { key: "usage", header: "Used / limit", align: "right", sortValue: (c) => c.usedCount, cell: (c) => `${c.usedCount} / ${c.usageLimit ?? "no limit"}` },
    { key: "schedule", header: "Schedule", cell: (c) => <StatusBadge domain="schedule" value={scheduleState(c.startsAt, c.endsAt)} /> },
    { key: "enabled", header: "Enabled", cell: (c) => <Switch checked={c.enabled} onCheckedChange={(v) => toggle("coupon", c.id, c.code, v)} aria-label={`${c.code} enabled`} /> },
    { key: "edit", header: "Edit", srOnlyHeader: true, align: "right", cell: (c) => <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ kind: "coupon", item: c })} aria-label={`Edit ${c.code}`}><Pencil /></Button> },
  ];
  const campaignColumns: Column<Campaign>[] = [
    { key: "name", header: "Campaign", sortValue: (c) => c.name, cell: (c) => <div><p className="font-medium">{c.name}</p><p className="line-clamp-1 max-w-[16rem] text-xs text-muted-foreground">{c.description}</p></div> },
    { key: "kind", header: "Type", sortValue: (c) => c.kind, cell: (c) => humanize(c.kind) },
    { key: "dates", header: "Runs", sortValue: (c) => c.startsAt, cell: (c) => <Dates from={c.startsAt} to={c.endsAt} /> },
    { key: "products", header: "Products", cell: (c) => <span className="line-clamp-2 max-w-[14rem] text-xs">{c.productIds.map((id) => byId(db.products, id)?.name).join(", ") || "—"}</span> },
    { key: "schedule", header: "Schedule", cell: (c) => <StatusBadge domain="schedule" value={scheduleState(c.startsAt, c.endsAt)} /> },
    { key: "enabled", header: "Enabled", cell: (c) => <Switch checked={c.enabled} onCheckedChange={(v) => toggle("campaign", c.id, c.name, v)} aria-label={`${c.name} enabled`} /> },
    { key: "edit", header: "Edit", srOnlyHeader: true, align: "right", cell: (c) => <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ kind: "campaign", item: c })} aria-label={`Edit ${c.name}`}><Pencil /></Button> },
  ];

  return (
    <>
      <PageHeader title="Promotions" description="Coupons, discount and seasonal campaigns, featured products and banners with their dates and limits." />
      <DemoNotice>Promotions are saved only in this browser and do not change prices or the storefront. Discount calculation, stacking and eligibility rules are not specified, so the demo stores the values without applying them.</DemoNotice>
      <Tabs defaultValue="coupons">
        <TabsList aria-label="Promotion types">
          <TabsTrigger value="coupons">Coupons ({db.coupons.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns ({db.campaigns.length})</TabsTrigger>
          <TabsTrigger value="featured">Featured products ({db.featured.length})</TabsTrigger>
          <TabsTrigger value="banners">Banners ({db.banners.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="coupons">
          <Card actions={<Button onClick={() => setEditing({ kind: "coupon", item: null })}><Plus aria-hidden="true" />New coupon</Button>} title="Coupons">
            <Toolbar>
              <SearchField label="Search coupons" placeholder="Code or description" value={query} onChange={setQuery} />
              <FilterSelect label="Schedule" value={schedule} onChange={setSchedule} options={statusOptions("schedule")} />
              <FilterSelect label="Enabled" value={couponEnabled} onChange={setCouponEnabled} options={statusOptions("enabled")} allLabel="Any" />
              <FilterSelect label="Discount type" value={discountType} onChange={setDiscountType} options={[{ value: "percentage", label: "Percentage" }, { value: "flat", label: "Flat amount" }]} allLabel="Any type" />
              <FilterSelect label="Usage limit" value={limitFilter} onChange={setLimitFilter} options={[{ value: "limited", label: "Has a limit" }, { value: "unlimited", label: "No limit" }]} allLabel="Any" />
              <ClearFilters active={Boolean(query || schedule || couponEnabled || discountType || limitFilter)} onClear={() => { setQuery(""); setSchedule(""); setCouponEnabled(""); setDiscountType(""); setLimitFilter(""); }} />
            </Toolbar>
            <DataTable caption="Coupons" rows={coupons} columns={couponColumns} getRowId={(c) => c.id} initialSort={{ key: "dates", direction: "desc" }} resetKey={`${query}|${schedule}|${couponEnabled}|${discountType}|${limitFilter}`} minWidth={900} />
          </Card>
          <div className="mt-4"><NeedsClarification refId="Q-COUPON-RULES">Per-customer limits, minimum order value, stacking with campaigns, eligible products/categories and whether a disabled coupon can be re-enabled after its end date are not specified.</NeedsClarification></div>
        </TabsContent>
        <TabsContent value="campaigns">
          <Card title="Discount and seasonal campaigns" actions={<Button onClick={() => setEditing({ kind: "campaign", item: null })}><Plus aria-hidden="true" />New campaign</Button>}>
            <Toolbar>
              <SearchField label="Search campaigns" placeholder="Name or description" value={query} onChange={setQuery} />
              <FilterSelect label="Type" value={kind} onChange={setKind} options={[{ value: "discount", label: "Discount" }, { value: "seasonal", label: "Seasonal" }]} />
              <FilterSelect label="Schedule" value={schedule} onChange={setSchedule} options={statusOptions("schedule")} />
              <FilterSelect label="Enabled" value={campaignEnabled} onChange={setCampaignEnabled} options={statusOptions("enabled")} allLabel="Any" />
              <ClearFilters active={Boolean(query || kind || schedule || campaignEnabled)} onClear={() => { setQuery(""); setKind(""); setSchedule(""); setCampaignEnabled(""); }} />
            </Toolbar>
            <DataTable caption="Campaigns" rows={campaigns} columns={campaignColumns} getRowId={(c) => c.id} initialSort={{ key: "dates", direction: "desc" }} resetKey={`${query}|${kind}|${schedule}|${campaignEnabled}`} minWidth={940} />
          </Card>
        </TabsContent>
        <TabsContent value="featured"><FeaturedTab db={db} confirm={confirm} run={run} act={act} /></TabsContent>
        <TabsContent value="banners">
          <Card title="Banners" actions={<Button onClick={() => setEditing({ kind: "banner", item: null })}><Plus aria-hidden="true" />New banner</Button>}>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {db.banners.map((b) => (
                <li key={b.id} className="overflow-hidden rounded-2xl border border-border">
                  <Image src={b.imageSrc} alt={b.imageAlt} width={600} height={300} className="aspect-[2/1] w-full bg-white object-contain" />
                  <div className="grid gap-2 p-4">
                    <div className="flex items-start justify-between gap-2"><p className="font-medium">{b.title}</p><StatusBadge domain="schedule" value={scheduleState(b.startsAt, b.endsAt)} /></div>
                    <p className="text-xs text-muted-foreground"><Dates from={b.startsAt} to={b.endsAt} /></p>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm"><Switch checked={b.enabled} onCheckedChange={(v) => toggle("banner", b.id, b.title, v)} aria-label={`${b.title} enabled`} />{b.enabled ? "Enabled" : "Disabled"}</label>
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ kind: "banner", item: b })}><Pencil aria-hidden="true" />Edit<span className="sr-only"> {b.title}</span></Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Image upload is not available in this demo; banners can use the existing demo images.</p>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing?.kind === "coupon" && <CouponForm key={editing.item?.id ?? "new"} coupon={editing.item} onCancel={() => setEditing(null)} onSave={(input) => save(run(saveCoupon, input))} />}
        {editing?.kind === "campaign" && <CampaignForm key={editing.item?.id ?? "new"} db={db} campaign={editing.item} onCancel={() => setEditing(null)} onSave={(input) => save(run(saveCampaign, input))} />}
        {editing?.kind === "banner" && <BannerForm key={editing.item?.id ?? "new"} banner={editing.item} onCancel={() => setEditing(null)} onSave={(input) => save(run(saveBanner, input))} />}
      </Dialog>
      {confirmDialog}
    </>
  );
}

function FeaturedTab({ db, confirm, run, act }: { db: DemoDb } & Pick<ReturnType<typeof useAdmin>, "confirm" | "run" | "act">) {
  const [adding, setAdding] = React.useState("");
  const eligible = db.products.filter((p) => p.approvalStatus === "approved" && p.listingStatus === "listed" && !db.featured.some((f) => f.productId === p.id));
  return (
    <Card title="Featured products" description="Shown in the storefront's featured section (homepage section managed under Content).">
      <form
        className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => { e.preventDefault(); if (adding) { const r = act(setFeatured, { productId: adding, featured: true }); if (r.ok) setAdding(""); } }}
      >
        <Field label="Add an approved, listed product" className="sm:w-80">
          <NativeSelect value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Choose a product…</option>
            {eligible.map((p) => <option key={p.id} value={p.id}>{p.name} — {byId(db.sellers, p.sellerId)?.businessName}</option>)}
          </NativeSelect>
        </Field>
        <Button type="submit" disabled={!adding}><Star aria-hidden="true" />Feature product</Button>
      </form>
      {db.featured.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {db.featured.map((f) => {
            const p = byId(db.products, f.productId);
            if (!p) return null;
            return (
              <li key={f.productId} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <Image src={p.images[0]?.src ?? ""} alt={p.images[0]?.alt ?? ""} width={64} height={64} className="size-16 rounded-xl border border-border bg-white object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{byId(db.sellers, p.sellerId)?.businessName} · since {formatDate(f.addedAt)}</p>
                  {p.listingStatus !== "listed" && <p className="text-xs text-warning">Currently unlisted</p>}
                </div>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${p.name} from featured`} onClick={() => confirm({ title: `Remove ${p.name} from featured?`, description: "It will no longer be marked as featured in this demo.", confirmLabel: "Remove", tone: "danger", onConfirm: () => run(setFeatured, { productId: p.id, featured: false }) })}><X /></Button>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon={Star} title="No featured products" description="Add an approved, listed product above." />}
      <p className="mt-3 text-xs text-muted-foreground">Display order and maximum count are not specified (Q-FEATURED).</p>
    </Card>
  );
}

function useDateFields(initialFrom = "", initialTo = "") {
  const [startsAt, setStartsAt] = React.useState(initialFrom);
  const [endsAt, setEndsAt] = React.useState(initialTo);
  return { startsAt, endsAt, setStartsAt, setEndsAt, dateError: () => validateDates(startsAt, endsAt) };
}

function FormShell({ title, onSubmit, onCancel, submitLabel, error, children }: { title: string; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; submitLabel: string; error: string | null; children: React.ReactNode }) {
  return (
    <DialogContent className="max-w-xl">
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Saved locally in this demo; nothing is published.</DialogDescription></DialogHeader>
        {children}
        {error && <p role="alert" className="rounded-xl bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{submitLabel}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function CouponForm({ coupon, onSave, onCancel }: { coupon: Coupon | null; onSave: (input: Omit<Coupon, "id" | "usedCount"> & { id?: string }) => string | null; onCancel: () => void }) {
  const [code, setCode] = React.useState(coupon?.code ?? "");
  const [description, setDescription] = React.useState(coupon?.description ?? "");
  const [type, setType] = React.useState<Coupon["discountType"]>(coupon?.discountType ?? "percentage");
  const [value, setValue] = React.useState(coupon ? String(coupon.discountType === "flat" ? coupon.discountValue / 100 : coupon.discountValue) : "");
  const [limit, setLimit] = React.useState(coupon?.usageLimit === null || !coupon ? "" : String(coupon.usageLimit));
  const dates = useDateFields(coupon?.startsAt, coupon?.endsAt);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    const next: Record<string, string | undefined> = {
      code: /^[A-Za-z0-9]{4,20}$/.test(code.trim()) ? undefined : "Use 4–20 letters or digits, no spaces.",
      value: !value.trim() || !Number.isFinite(n) || n <= 0 ? "Enter a value greater than zero." : type === "percentage" && n > 100 ? "A percentage cannot exceed 100." : undefined,
      limit: limit.trim() && !/^[1-9]\d*$/.test(limit.trim()) ? "Enter a whole number of at least 1, or leave empty for no limit." : undefined,
      dates: dates.dateError() ?? undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFormError(onSave({ id: coupon?.id, code, description, discountType: type, discountValue: type === "flat" ? Math.round(n * 100) : n, startsAt: dates.startsAt, endsAt: dates.endsAt, usageLimit: limit.trim() ? Number(limit) : null, enabled: coupon?.enabled ?? true }));
  };

  return (
    <FormShell title={coupon ? `Edit ${coupon.code}` : "New coupon"} onSubmit={submit} onCancel={onCancel} submitLabel={coupon ? "Save coupon" : "Create coupon"} error={formError}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" required error={errors.code}><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} placeholder="e.g. FRESH50" autoCapitalize="characters" /></Field>
        <Field label="Usage limit" error={errors.limit} hint={coupon ? `${coupon.usedCount} already used.` : "Optional."}><Input inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="e.g. 500 (empty = no limit)" /></Field>
        <Field label="Discount type" required><NativeSelect value={type} onChange={(e) => setType(e.target.value as Coupon["discountType"])}><option value="percentage">Percentage</option><option value="flat">Flat amount (₹)</option></NativeSelect></Field>
        <Field label={type === "percentage" ? "Discount (%)" : "Discount (₹)"} required error={errors.value}><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percentage" ? "1–100, e.g. 10" : "Amount in ₹, e.g. 50"} /></Field>
        <Field label="Starts" required error={errors.dates} hint="DD/MM/YYYY"><Input type="date" value={dates.startsAt} onChange={(e) => dates.setStartsAt(e.target.value)} /></Field>
        <Field label="Ends" required hint="On or after the start date"><Input type="date" value={dates.endsAt} min={dates.startsAt || undefined} onChange={(e) => dates.setEndsAt(e.target.value)} /></Field>
      </div>
      <Field label="Description" hint="Optional, internal."><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} className="min-h-16" placeholder="Internal note about who this coupon is for" /></Field>
    </FormShell>
  );
}

function CampaignForm({ db, campaign, onSave, onCancel }: { db: DemoDb; campaign: Campaign | null; onSave: (input: Omit<Campaign, "id"> & { id?: string }) => string | null; onCancel: () => void }) {
  const [name, setName] = React.useState(campaign?.name ?? "");
  const [kind, setKind] = React.useState<Campaign["kind"]>(campaign?.kind ?? "seasonal");
  const [description, setDescription] = React.useState(campaign?.description ?? "");
  const [productIds, setProductIds] = React.useState<string[]>(campaign?.productIds ?? []);
  const dates = useDateFields(campaign?.startsAt, campaign?.endsAt);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const products = db.products.filter((p) => p.approvalStatus === "approved");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { name: name.trim() ? undefined : "Campaign name is required.", dates: dates.dateError() ?? undefined };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFormError(onSave({ id: campaign?.id, name, kind, description, startsAt: dates.startsAt, endsAt: dates.endsAt, productIds, enabled: campaign?.enabled ?? true }));
  };

  return (
    <FormShell title={campaign ? `Edit ${campaign.name}` : "New campaign"} onSubmit={submit} onCancel={onCancel} submitLabel={campaign ? "Save campaign" : "Create campaign"} error={formError}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name} className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Winter Fruit Festival" /></Field>
        <Field label="Type" required><NativeSelect value={kind} onChange={(e) => setKind(e.target.value as Campaign["kind"])}><option value="seasonal">Seasonal</option><option value="discount">Discount</option></NativeSelect></Field>
        <div className="hidden sm:block" />
        <Field label="Starts" required error={errors.dates} hint="DD/MM/YYYY"><Input type="date" value={dates.startsAt} onChange={(e) => dates.setStartsAt(e.target.value)} /></Field>
        <Field label="Ends" required hint="On or after the start date"><Input type="date" value={dates.endsAt} min={dates.startsAt || undefined} onChange={(e) => dates.setEndsAt(e.target.value)} /></Field>
      </div>
      <Field label="Description" hint="Optional."><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} className="min-h-16" placeholder="What the campaign highlights (optional)" /></Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Products (approved only)</legend>
        <div className="scrollbar-subtle grid max-h-40 gap-1 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-2">
          {products.map((p) => (
            <label key={p.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-soft">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={productIds.includes(p.id)} onChange={(e) => setProductIds((ids) => (e.target.checked ? [...ids, p.id] : ids.filter((i) => i !== p.id)))} />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>
    </FormShell>
  );
}

const BANNER_IMAGES = [
  { src: "/images/products/pomegranates-studio.jpg", alt: "Pomegranates on a white background" },
  { src: "/images/products/spinach-studio.jpg", alt: "Spinach leaves on a white background" },
  { src: "/images/products/banganapalli-mangoes-studio.jpg", alt: "Mangoes on a white background" },
  { src: "/images/products/carrots-studio.jpg", alt: "Bunch of carrots on a white background" },
  { src: "/images/products/tomatoes-studio.jpg", alt: "Red tomatoes on a white background" },
];

function BannerForm({ banner, onSave, onCancel }: { banner: Banner | null; onSave: (input: Omit<Banner, "id"> & { id?: string }) => string | null; onCancel: () => void }) {
  const [title, setTitle] = React.useState(banner?.title ?? "");
  const [imageSrc, setImageSrc] = React.useState(banner?.imageSrc ?? BANNER_IMAGES[0]!.src);
  const [imageAlt, setImageAlt] = React.useState(banner?.imageAlt ?? BANNER_IMAGES[0]!.alt);
  const dates = useDateFields(banner?.startsAt, banner?.endsAt);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { title: title.trim() ? undefined : "Title is required.", alt: imageAlt.trim() ? undefined : "Describe the image for screen-reader users.", dates: dates.dateError() ?? undefined };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setFormError(onSave({ id: banner?.id, title, imageSrc, imageAlt, startsAt: dates.startsAt, endsAt: dates.endsAt, enabled: banner?.enabled ?? true }));
  };
  return (
    <FormShell title={banner ? `Edit ${banner.title}` : "New banner"} onSubmit={submit} onCancel={onCancel} submitLabel={banner ? "Save banner" : "Create banner"} error={formError}>
      <Field label="Title" required error={errors.title}><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Fresh pomegranates this week" /></Field>
      <Field label="Image (demo library)" required>
        <NativeSelect value={imageSrc} onChange={(e) => { const img = BANNER_IMAGES.find((i) => i.src === e.target.value); setImageSrc(e.target.value); if (img) setImageAlt(img.alt); }}>
          {BANNER_IMAGES.map((i) => <option key={i.src} value={i.src}>{i.alt}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Image description (alt text)" required error={errors.alt}><Input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} maxLength={120} placeholder="Describe the image, e.g. Pomegranates on a white background" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" required error={errors.dates} hint="DD/MM/YYYY"><Input type="date" value={dates.startsAt} onChange={(e) => dates.setStartsAt(e.target.value)} /></Field>
        <Field label="Ends" required hint="On or after the start date"><Input type="date" value={dates.endsAt} min={dates.startsAt || undefined} onChange={(e) => dates.setEndsAt(e.target.value)} /></Field>
      </div>
    </FormShell>
  );
}
