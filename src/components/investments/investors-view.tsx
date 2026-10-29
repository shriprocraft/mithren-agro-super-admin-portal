"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/format";
import { investorStats } from "@/lib/investment/selectors";
import type { Investor } from "@/lib/investment/types";
import { maskEmail, maskPhone } from "@/lib/privacy";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { AuditedCsvExport, InvestmentNotice, NotPermitted, routes, useInvestmentAdmin } from "./shared";

export function InvestorsView() {
  const { state, can } = useInvestmentAdmin();
  const [query, setQuery] = React.useState("");
  const [account, setAccount] = React.useState("");
  const [application, setApplication] = React.useState("");
  const [city, setCity] = React.useState("");
  const [activity, setActivity] = React.useState("");

  if (!can("inv.investors.view")) {
    return (
      <>
        <PageHeader title="Investors" />
        <NotPermitted action="Viewing investor records" />
      </>
    );
  }

  const stats = new Map(state.investors.map((i) => [i.id, investorStats(state, i.id)]));
  const s = (id: string) => stats.get(id)!;
  // Search covers name, ID and city; contact details are masked and not searchable.
  const rows = state.investors.filter((i) => {
    const st = s(i.id);
    if (activity === "with" && !st.participations.length) return false;
    if (activity === "none" && st.participations.length) return false;
    if (activity === "actions" && !st.pendingActions) return false;
    return (!account || i.accountStatus === account) && (!application || st.application?.status === application) && (!city || i.city === city) && matchesSearch(query, [i.name, i.id, i.city]);
  });

  const columns: Column<Investor>[] = [
    { key: "id", header: "Investor ID", sortValue: (i) => i.id, cell: (i) => <span className="font-mono text-xs">{i.id}</span> },
    { key: "name", header: "Investor", sortValue: (i) => i.name, cell: (i) => <Link href={routes.investor(i.id)} className="font-medium text-primary hover:underline">{i.name}</Link> },
    { key: "email", header: "Email (masked)", cell: (i) => <span className="text-muted-foreground">{maskEmail(i.email)}</span> },
    { key: "phone", header: "Phone (masked)", cell: (i) => <span className="whitespace-nowrap text-muted-foreground">{maskPhone(i.phone)}</span> },
    { key: "registered", header: "Registered", sortValue: (i) => i.registeredAt, cell: (i) => formatDate(i.registeredAt) },
    { key: "verification", header: "Application (manual review)", sortValue: (i) => s(i.id).application?.status, cell: (i) => (s(i.id).application ? <StatusBadge domain="application" value={s(i.id).application!.status} /> : "—") },
    { key: "participations", header: "Participations", align: "right", sortValue: (i) => s(i.id).participations.length, cell: (i) => s(i.id).participations.length },
    { key: "verified", header: "Verified contributions", align: "right", sortValue: (i) => s(i.id).verifiedPaise, cell: (i) => formatINR(s(i.id).verifiedPaise) },
    { key: "actions-open", header: "Open admin actions", align: "right", sortValue: (i) => s(i.id).pendingActions, cell: (i) => (s(i.id).pendingActions ? <span className="font-semibold text-warning">{s(i.id).pendingActions}</span> : <span className="text-muted-foreground">0</span>) },
    { key: "account", header: "Account", sortValue: (i) => i.accountStatus, cell: (i) => <StatusBadge domain="investorAccount" value={i.accountStatus} /> },
    { key: "view", header: "Actions", srOnlyHeader: true, align: "right", cell: (i) => <Link href={routes.investor(i.id)} className={buttonVariants({ size: "sm", variant: "outline" })}>View<span className="sr-only"> {i.name}</span></Link> },
  ];

  return (
    <>
      <PageHeader title="Investors" description="Investor accounts, their application status, participations and verified contributions. Contact details are masked." />
      <InvestmentNotice>All investors are fictional demo records. Application review is <strong>manual review in this demo</strong>; no identity or KYC provider has verified anyone.</InvestmentNotice>
      <Card
        title={`${rows.length} investor${rows.length === 1 ? "" : "s"}`}
        actions={
          <AuditedCsvExport
            reportId="investors"
            label="Investor list"
            filename="mithren-investors_demo.csv"
            rows={rows}
            filters={`search=${query}; account=${account}; application=${application}; city=${city}; activity=${activity}`}
            columns={[
              { header: "Investor ID", value: (i: Investor) => i.id },
              { header: "Name", value: (i) => i.name },
              { header: "City", value: (i) => i.city },
              { header: "Registered (UTC)", value: (i) => i.registeredAt },
              { header: "Application status", value: (i) => s(i.id).application?.status ?? "" },
              { header: "Participations", value: (i) => s(i.id).participations.length },
              { header: "Verified contributions (INR)", value: (i) => (s(i.id).verifiedPaise / 100).toFixed(2) },
              { header: "Account status", value: (i) => i.accountStatus },
            ]}
          />
        }
      >
        <Toolbar>
          <SearchField label="Search investors" placeholder="Search by name, investor ID or city" value={query} onChange={setQuery} />
          <FilterSelect label="Account status" value={account} onChange={setAccount} options={statusOptions("investorAccount")} />
          <FilterSelect label="Application status" value={application} onChange={setApplication} options={statusOptions("application")} className="sm:w-56" />
          <FilterSelect label="City" value={city} onChange={setCity} options={[...new Set(state.investors.map((i) => i.city))].sort().map((c) => ({ value: c, label: c }))} />
          <FilterSelect label="Activity" value={activity} onChange={setActivity} options={[{ value: "with", label: "Has participations" }, { value: "none", label: "No participations" }, { value: "actions", label: "Has open admin actions" }]} allLabel="Any" />
          <ClearFilters active={Boolean(query || account || application || city || activity)} onClear={() => { setQuery(""); setAccount(""); setApplication(""); setCity(""); setActivity(""); }} />
        </Toolbar>
        <DataTable caption="Investors" rows={rows} columns={columns} getRowId={(i) => i.id} initialSort={{ key: "id", direction: "asc" }} resetKey={`${query}|${account}|${application}|${city}|${activity}`} minWidth={1180} emptyDescription="No investors match the search or filters. Clear the filters to see every investor." />
      </Card>
    </>
  );
}
