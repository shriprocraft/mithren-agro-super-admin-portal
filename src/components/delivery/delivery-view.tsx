"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/format";
import { setZoneServiceable, updateSlotCapacity, updateZone } from "@/lib/mock/actions";
import { byId } from "@/lib/mock/selectors";
import { maskPhone } from "@/lib/privacy";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { DeliveryPartner, DeliverySlot, DeliveryZone } from "@/lib/types";

/** "35" or "35.50" rupees → paise; null when not a valid non-negative amount with at most 2 decimals. */
function rupeesToPaise(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  return Math.round(Number(value) * 100);
}

export function DeliveryView() {
  const { db, run, confirm, confirmDialog, toast } = useAdmin();
  const [query, setQuery] = React.useState("");
  const [serviceable, setServiceable] = React.useState("");
  const [zoneFilter, setZoneFilter] = React.useState("");
  const [coverage, setCoverage] = React.useState("");
  const [feeBand, setFeeBand] = React.useState("");
  const [windowFilter, setWindowFilter] = React.useState("");
  const [use, setUse] = React.useState("");
  const [partnerStatus, setPartnerStatus] = React.useState("");
  const [partnerZone, setPartnerZone] = React.useState("");
  const [partnerReach, setPartnerReach] = React.useState("");
  const [editingZone, setEditingZone] = React.useState<DeliveryZone | null>(null);
  const [editingSlot, setEditingSlot] = React.useState<DeliverySlot | null>(null);

  const hasActivePartner = (zoneId: string) => db.partners.some((p) => p.status === "active" && p.zoneIds.includes(zoneId));
  const zones = db.zones.filter(
    (z) =>
      (!serviceable || String(z.serviceable) === serviceable) &&
      (!coverage || (coverage === "covered" ? hasActivePartner(z.id) : !hasActivePartner(z.id))) &&
      (!feeBand || (feeBand === "low" ? z.feePaise <= 3000 : z.feePaise > 3000)) &&
      matchesSearch(query, [z.name, z.id, ...z.pincodes]),
  );
  const fillRatio = (s: DeliverySlot) => (s.capacity ? s.booked / s.capacity : s.booked ? Infinity : 0);
  const slots = db.slots.filter(
    (s) =>
      (!zoneFilter || s.zoneId === zoneFilter) &&
      (!windowFilter || s.window === windowFilter) &&
      (!use || (use === "full" ? fillRatio(s) >= 1 : use === "busy" ? fillRatio(s) >= 0.75 && fillRatio(s) < 1 : fillRatio(s) < 0.75)),
  );
  const partners = db.partners.filter(
    (p) =>
      (!partnerStatus || p.status === partnerStatus) &&
      (!partnerZone || p.zoneIds.includes(partnerZone)) &&
      (!partnerReach || (partnerReach === "multi" ? p.zoneIds.length > 1 : p.zoneIds.length === 1)),
  );

  const toggleServiceable = (z: DeliveryZone) =>
    confirm({
      title: `${z.serviceable ? "Stop" : "Start"} serving ${z.name}?`,
      description: z.serviceable
        ? `${z.name} will be marked Not serviceable in this demo. Existing orders and slots are not changed; what happens to in-progress orders is not specified.`
        : `${z.name} will be marked Serviceable in this demo.`,
      confirmLabel: z.serviceable ? "Mark not serviceable" : "Mark serviceable",
      tone: z.serviceable ? "danger" : "default",
      onConfirm: () => run(setZoneServiceable, { zoneId: z.id, serviceable: !z.serviceable }),
    });

  const zoneColumns: Column<DeliveryZone>[] = [
    { key: "name", header: "Zone", sortValue: (z) => z.name, cell: (z) => <div><p className="font-medium">{z.name}</p><p className="text-xs text-muted-foreground">{z.id}</p></div> },
    { key: "pincodes", header: "Pincodes", cell: (z) => <span className="text-xs text-muted-foreground">{z.pincodes.join(", ")}</span> },
    { key: "fee", header: "Delivery fee", align: "right", sortValue: (z) => z.feePaise, cell: (z) => formatINR(z.feePaise) },
    { key: "min", header: "Minimum order", align: "right", sortValue: (z) => z.minOrderPaise, cell: (z) => formatINR(z.minOrderPaise) },
    { key: "partners", header: "Partners", cell: (z) => <span className="text-xs">{db.partners.filter((p) => p.zoneIds.includes(z.id)).map((p) => p.name).join(", ") || "—"}</span> },
    {
      key: "serviceable", header: "Serviceable", sortValue: (z) => String(z.serviceable),
      cell: (z) => (
        <div className="flex items-center gap-2">
          <Switch checked={z.serviceable} onCheckedChange={() => toggleServiceable(z)} aria-label={`${z.name} serviceable`} />
          <StatusBadge domain="zone" value={z.serviceable} />
        </div>
      ),
    },
    { key: "edit", header: "Edit", srOnlyHeader: true, align: "right", cell: (z) => <Button size="icon-sm" variant="ghost" onClick={() => setEditingZone(z)} aria-label={`Edit fee and minimum order for ${z.name}`}><Pencil /></Button> },
  ];
  const slotColumns: Column<DeliverySlot>[] = [
    { key: "zone", header: "Zone", sortValue: (s) => byId(db.zones, s.zoneId)?.name, cell: (s) => byId(db.zones, s.zoneId)?.name },
    { key: "window", header: "Window (IST)", sortValue: (s) => s.window, cell: (s) => s.window },
    { key: "capacity", header: "Capacity", align: "right", sortValue: (s) => s.capacity, cell: (s) => s.capacity },
    { key: "booked", header: "Booked (demo)", align: "right", sortValue: (s) => s.booked, cell: (s) => <span className={s.booked > s.capacity ? "font-medium text-destructive" : undefined}>{s.booked}</span> },
    {
      key: "use", header: "Use", sortValue: (s) => (s.capacity ? s.booked / s.capacity : 0),
      cell: (s) => {
        const pct = s.capacity ? Math.min(100, Math.round((s.booked / s.capacity) * 100)) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${pct}% of capacity booked`}><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
            <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
          </div>
        );
      },
    },
    { key: "edit", header: "Edit", srOnlyHeader: true, align: "right", cell: (s) => <Button size="icon-sm" variant="ghost" onClick={() => setEditingSlot(s)} aria-label={`Edit capacity of ${s.window} in ${byId(db.zones, s.zoneId)?.name}`}><Pencil /></Button> },
  ];
  const partnerColumns: Column<DeliveryPartner>[] = [
    { key: "name", header: "Partner", sortValue: (p) => p.name, cell: (p) => <span className="font-medium">{p.name}</span> },
    { key: "phone", header: "Phone (masked)", cell: (p) => maskPhone(p.phone) },
    { key: "zones", header: "Zones", cell: (p) => p.zoneIds.map((z) => byId(db.zones, z)?.name).join(", ") },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge domain="partner" value={p.status} /> },
  ];

  return (
    <>
      <PageHeader title="Delivery" description="Delivery zones with fees, minimum order values and serviceability; delivery slots and capacity; delivery partners." />
      <DemoNotice>Configuration changes are saved only in this browser. No dispatch, navigation, delivery OTP or proof-of-delivery system is connected, and nothing here contacts a delivery partner.</DemoNotice>
      <Tabs defaultValue="zones">
        <TabsList aria-label="Delivery sections">
          <TabsTrigger value="zones">Zones ({db.zones.length})</TabsTrigger>
          <TabsTrigger value="slots">Slots &amp; capacity ({db.slots.length})</TabsTrigger>
          <TabsTrigger value="partners">Partners ({db.partners.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="zones">
          <Card>
            <Toolbar>
              <SearchField label="Search zones" placeholder="Zone name or pincode" value={query} onChange={setQuery} />
              <FilterSelect label="Serviceability" value={serviceable} onChange={setServiceable} options={statusOptions("zone")} />
              <FilterSelect label="Partner coverage" value={coverage} onChange={setCoverage} options={[{ value: "covered", label: "Has an active partner" }, { value: "uncovered", label: "No active partner" }]} allLabel="Any" />
              <FilterSelect label="Delivery fee" value={feeBand} onChange={setFeeBand} options={[{ value: "low", label: "₹30 or less" }, { value: "high", label: "Above ₹30" }]} allLabel="Any fee" />
              <ClearFilters active={Boolean(query || serviceable || coverage || feeBand)} onClear={() => { setQuery(""); setServiceable(""); setCoverage(""); setFeeBand(""); }} />
            </Toolbar>
            <DataTable caption="Delivery zones" rows={zones} columns={zoneColumns} getRowId={(z) => z.id} initialSort={{ key: "name", direction: "asc" }} resetKey={`${query}|${serviceable}|${coverage}|${feeBand}`} minWidth={960} />
          </Card>
          <div className="mt-4"><NeedsClarification refId="Q-DELIVERY-FEES">Fees and minimum order values are stored per zone as entered. Whether fees vary by order value, distance, weight or slot, and whether free delivery applies above a threshold, is not specified.</NeedsClarification></div>
        </TabsContent>
        <TabsContent value="slots">
          <Card>
            <Toolbar>
              <FilterSelect label="Zone" value={zoneFilter} onChange={setZoneFilter} options={db.zones.map((z) => ({ value: z.id, label: z.name }))} />
              <FilterSelect label="Window" value={windowFilter} onChange={setWindowFilter} options={[...new Set(db.slots.map((s) => s.window))].map((w) => ({ value: w, label: w }))} allLabel="Any window" />
              <FilterSelect label="Capacity used" value={use} onChange={setUse} options={[{ value: "full", label: "Full (100% or more)" }, { value: "busy", label: "75 – 99%" }, { value: "open", label: "Under 75%" }]} allLabel="Any" />
              <ClearFilters active={Boolean(zoneFilter || windowFilter || use)} onClear={() => { setZoneFilter(""); setWindowFilter(""); setUse(""); }} />
            </Toolbar>
            <DataTable caption="Delivery slots" rows={slots} columns={slotColumns} getRowId={(s) => s.id} initialSort={{ key: "zone", direction: "asc" }} resetKey={`${zoneFilter}|${windowFilter}|${use}`} pageSize={9} />
          </Card>
          <div className="mt-4"><NeedsClarification refId="Q-CAPACITY">How capacity is enforced (blocking checkout, waitlists, overbooking allowance) and whether slots differ by day are not specified. The demo stores capacity only.</NeedsClarification></div>
        </TabsContent>
        <TabsContent value="partners">
          <Card>
            <Toolbar>
              <FilterSelect label="Status" value={partnerStatus} onChange={setPartnerStatus} options={statusOptions("partner")} />
              <FilterSelect label="Zone" value={partnerZone} onChange={setPartnerZone} options={db.zones.map((z) => ({ value: z.id, label: z.name }))} />
              <FilterSelect label="Coverage" value={partnerReach} onChange={setPartnerReach} options={[{ value: "single", label: "One zone" }, { value: "multi", label: "Several zones" }]} allLabel="Any" />
              <ClearFilters active={Boolean(partnerStatus || partnerZone || partnerReach)} onClear={() => { setPartnerStatus(""); setPartnerZone(""); setPartnerReach(""); }} />
            </Toolbar>
            <DataTable caption="Delivery partners" rows={partners} columns={partnerColumns} getRowId={(p) => p.id} initialSort={{ key: "name", direction: "asc" }} resetKey={`${partnerStatus}|${partnerZone}|${partnerReach}`} minWidth={640} emptyTitle="No partners match" />
          </Card>
          <div className="mt-4"><NeedsClarification refId="Q-PARTNERS">Partner onboarding, status changes and assignment rules are not specified, so partners are view-only.</NeedsClarification></div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingZone)} onOpenChange={(o) => !o && setEditingZone(null)}>
        {editingZone && (
          <ZoneForm
            zone={editingZone}
            onCancel={() => setEditingZone(null)}
            onSave={(feePaise, minOrderPaise) => {
              const r = run(updateZone, { zoneId: editingZone.id, feePaise, minOrderPaise });
              if (r.ok) { toast.success(r.message); setEditingZone(null); return null; }
              return r.error;
            }}
          />
        )}
      </Dialog>
      <Dialog open={Boolean(editingSlot)} onOpenChange={(o) => !o && setEditingSlot(null)}>
        {editingSlot && (
          <SlotForm
            slot={editingSlot}
            zoneName={byId(db.zones, editingSlot.zoneId)?.name ?? ""}
            onCancel={() => setEditingSlot(null)}
            onSave={(capacity) => {
              const r = run(updateSlotCapacity, { slotId: editingSlot.id, capacity });
              if (r.ok) { toast.success(r.message); setEditingSlot(null); return null; }
              return r.error;
            }}
          />
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}

function ZoneForm({ zone, onSave, onCancel }: { zone: DeliveryZone; onSave: (fee: number, min: number) => string | null; onCancel: () => void }) {
  const [fee, setFee] = React.useState(String(zone.feePaise / 100));
  const [min, setMin] = React.useState(String(zone.minOrderPaise / 100));
  const [errors, setErrors] = React.useState<{ fee?: string; min?: string; form?: string | null }>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const feePaise = rupeesToPaise(fee);
    const minPaise = rupeesToPaise(min);
    const next = { fee: feePaise === null ? "Enter an amount in rupees, zero or more (up to 2 decimals)." : undefined, min: minPaise === null ? "Enter an amount in rupees, zero or more (up to 2 decimals)." : undefined };
    setErrors(next);
    if (feePaise === null || minPaise === null) return;
    setErrors({ form: onSave(feePaise, minPaise) });
  };
  return (
    <DialogContent>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader><DialogTitle>Edit {zone.name}</DialogTitle><DialogDescription>Values in rupees (₹). Saved locally in this demo.</DialogDescription></DialogHeader>
        <Field label="Delivery fee (₹)" required error={errors.fee}><Input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="e.g. 35 or 35.50" /></Field>
        <Field label="Minimum order value (₹)" required error={errors.min}><Input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="e.g. 199" /></Field>
        {errors.form && <p role="alert" className="text-sm font-medium text-destructive">{errors.form}</p>}
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Save zone</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function SlotForm({ slot, zoneName, onSave, onCancel }: { slot: DeliverySlot; zoneName: string; onSave: (capacity: number) => string | null; onCancel: () => void }) {
  const [capacity, setCapacity] = React.useState(String(slot.capacity));
  const [error, setError] = React.useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(capacity.trim())) return setError("Enter a whole number, zero or more.");
    setError(onSave(Number(capacity)));
  };
  const below = /^\d+$/.test(capacity) && Number(capacity) < slot.booked;
  return (
    <DialogContent>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader><DialogTitle>Slot capacity</DialogTitle><DialogDescription>{zoneName} · {slot.window} · {slot.booked} booked (demo)</DialogDescription></DialogHeader>
        <Field label="Capacity (orders)" required error={error} hint={below ? "This is below the current bookings. How existing bookings are handled is not specified; they are not changed." : undefined}>
          <Input inputMode="numeric" value={capacity} onChange={(e) => { setCapacity(e.target.value); setError(null); }} placeholder="Whole number, e.g. 40" />
        </Field>
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Save capacity</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
