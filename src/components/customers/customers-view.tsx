"use client";

import * as React from "react";
import Link from "next/link";
import { Ban, ShieldCheck } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, DetailList, InlineAlert, PageHeader, SectionTitle, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { liftCustomerRestriction, restrictCustomer } from "@/lib/mock/actions";
import { orderTotal } from "@/lib/mock/selectors";
import { maskEmail, maskPhone } from "@/lib/privacy";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { Customer, DemoDb } from "@/lib/types";

function customerStats(db: DemoDb, customerId: string) {
  const orders = db.orders.filter((o) => o.customerId === customerId);
  return { orders, tickets: db.tickets.filter((t) => t.requesterType === "customer" && t.requesterId === customerId) };
}

export function CustomersView() {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [city, setCity] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = db.customers.find((c) => c.id === selectedId);
  const cities = [...new Set(db.customers.map((c) => c.city))].sort();

  // Search uses name, id and city only: contact details are masked and not searchable.
  const rows = db.customers.filter((c) => (!status || c.status === status) && (!city || c.city === city) && matchesSearch(query, [c.name, c.id, c.city]));

  const columns: Column<Customer>[] = [
    { key: "name", header: "Customer", sortValue: (c) => c.name, cell: (c) => <RowLink onClick={() => setSelectedId(c.id)} sub={c.id}>{c.name}</RowLink> },
    { key: "contact", header: "Contact (masked)", cell: (c) => <span className="text-muted-foreground">{maskEmail(c.email)}</span> },
    { key: "city", header: "City", sortValue: (c) => c.city, cell: (c) => c.city },
    { key: "joined", header: "Joined", sortValue: (c) => c.joinedAt, cell: (c) => formatDate(c.joinedAt) },
    { key: "orders", header: "Orders", align: "right", sortValue: (c) => customerStats(db, c.id).orders.length, cell: (c) => customerStats(db, c.id).orders.length },
    { key: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <StatusBadge domain="customer" value={c.status} /> },
  ];

  const openRestrict = (c: Customer) =>
    confirm({
      title: `Restrict ${c.name}'s account?`,
      description: "The account will be marked Restricted in this demo. What a restriction blocks on the storefront is not yet specified (Q-RESTRICTION), so nothing else changes.",
      confirmLabel: "Restrict account",
      tone: "danger",
      reason: { label: "Reason for restriction", placeholder: "e.g. Repeated chargebacks under review", hint: "Recorded in the audit log. Avoid unnecessary personal details." },
      onConfirm: (reason) => run(restrictCustomer, { customerId: c.id, reason }),
    });
  const openLift = (c: Customer) =>
    confirm({
      title: `Lift the restriction on ${c.name}?`,
      description: "The account returns to Active in this demo.",
      confirmLabel: "Lift restriction",
      onConfirm: () => run(liftCustomerRestriction, { customerId: c.id }),
    });

  return (
    <>
      <PageHeader title="Customers" description="Search customer accounts, review account restrictions and support history. Contact details are masked for privacy." />
      <DemoNotice>All customers are fictional demo records. Email addresses and phone numbers are always shown masked; this demo has no “reveal” action because the access policy is not defined.</DemoNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search customers" placeholder="Name, customer ID or city" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("customer")} />
          <FilterSelect label="City" value={city} onChange={setCity} options={cities.map((c) => ({ value: c, label: c }))} />
          <ClearFilters active={Boolean(query || status || city)} onClear={() => { setQuery(""); setStatus(""); setCity(""); }} />
        </Toolbar>
        <DataTable caption="Customers" rows={rows} columns={columns} getRowId={(c) => c.id} initialSort={{ key: "name", direction: "asc" }} resetKey={`${query}|${status}|${city}`} />
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.name} description={`${selected.id} · demo customer`}>
            <CustomerDetail db={db} customer={selected} onRestrict={() => openRestrict(selected)} onLift={() => openLift(selected)} />
          </SheetContent>
        )}
      </Dialog>
      {confirmDialog}
    </>
  );
}

function CustomerDetail({ db, customer, onRestrict, onLift }: { db: DemoDb; customer: Customer; onRestrict: () => void; onLift: () => void }) {
  const { orders, tickets } = customerStats(db, customer.id);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge domain="customer" value={customer.status} />
        {customer.status === "active" ? (
          <Button variant="destructive" onClick={onRestrict}>
            <Ban aria-hidden="true" />
            Restrict account
          </Button>
        ) : (
          <Button variant="outline" onClick={onLift}>
            <ShieldCheck aria-hidden="true" />
            Lift restriction
          </Button>
        )}
      </div>
      {customer.restriction && (
        <InlineAlert tone="danger" title="Account restricted">
          {customer.restriction.reason}
          <span className="mt-1 block text-xs text-muted-foreground">
            By {customer.restriction.by} · {formatDateTime(customer.restriction.at)}
          </span>
        </InlineAlert>
      )}
      <DetailList
        items={[
          { label: "Email (masked)", value: maskEmail(customer.email) },
          { label: "Phone (masked)", value: maskPhone(customer.phone) },
          { label: "City", value: customer.city },
          { label: "Joined", value: formatDate(customer.joinedAt) },
        ]}
      />
      <section>
        <SectionTitle>Orders ({orders.length})</SectionTitle>
        {orders.length ? (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {orders.slice(-6).reverse().map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm">
                <Link href={`/admin/orders?order=${o.id}`} className="font-medium text-primary hover:underline">{o.id}</Link>
                <span className="text-xs text-muted-foreground">{formatDate(o.placedAt)}</span>
                <StatusBadge domain="order" value={o.status} />
                <span className="tabular-nums">{formatINR(orderTotal(db, o))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No orders.</p>
        )}
        {orders.length > 6 && <p className="mt-2 text-xs text-muted-foreground">Showing the 6 most recent.</p>}
      </section>
      <section>
        <SectionTitle>Support history ({tickets.length})</SectionTitle>
        {tickets.length ? (
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-xl border border-border px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/support?ticket=${t.id}`} className="text-sm font-medium text-primary hover:underline">{t.id} · {t.subject}</Link>
                  <StatusBadge domain="ticket" value={t.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Opened {formatDate(t.createdAt)} · last update {formatDate(t.updatedAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No support tickets.</p>
        )}
      </section>
    </div>
  );
}
