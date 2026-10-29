"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, ClipboardList, FolderKanban, Hourglass, IndianRupee, Layers, ListChecks, Sprout, UserCheck, Users, Wallet } from "lucide-react";
import { ClearFilters, FilterSelect } from "@/components/admin/filters";
import { Card, NeedsClarification, PageHeader } from "@/components/admin/primitives";
import { DateRangeFilter, MetricCard } from "@/components/admin/widgets";
import { presetRange, type DateRange } from "@/lib/dates";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { byId, countBy, filteredInvestmentData, financialBreakdown, isVerified, participationProjectIds, weeklySeries } from "@/lib/investment/selectors";
import { statusMeta, statusOptions } from "@/lib/status";
import { BarChartCard, FictionalBadge, InvestmentNotice, useInvestmentAdmin } from "./shared";

export function InvestmentOverviewView() {
  const { db, state } = useInvestmentAdmin();
  const [range, setRange] = React.useState<DateRange>(() => presetRange("all"));
  const [sectorId, setSectorId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [planId, setPlanId] = React.useState("");
  const [investorStatus, setInvestorStatus] = React.useState("");
  const [transactionStatus, setTransactionStatus] = React.useState("");
  const filters = { range, sectorId, projectId, planId, investorStatus, transactionStatus };
  const data = filteredInvestmentData(db, filters);
  const fin = financialBreakdown(data.participations, data.transactions, state);
  const projectOptions = state.projects.filter((p) => !sectorId || p.sectorId === sectorId);

  const pendingApps = data.applications.filter((a) => ["submitted", "under_review", "info_requested"].includes(a.status)).length;
  const approvedInvestors = new Set(data.applications.filter((a) => a.status === "approved").map((a) => a.investorId)).size;
  const activeParticipations = data.participations.filter((p) => p.status === "active").length;
  const awaiting = data.transactions.filter((t) => t.status === "successful" || t.status === "under_verification");
  const proposedAllocations = data.allocations.filter((a) => a.status === "proposed");
  const reviewProjects = data.projects.filter((p) => p.status === "on_hold" || state.allocations.some((a) => a.projectId === p.id && a.status === "proposed"));
  const requestedPayouts = state.payouts.filter((p) => p.status === "requested");

  // Chart series (all respond to the filters above).
  const registrations = weeklySeries(data.investors, (i) => i.registeredAt, () => 1, range);
  const verifiedSeries = weeklySeries(data.transactions.filter(isVerified), (t) => t.verification?.at, (t) => t.amountPaise, range);
  const weekLabel = (day: string) => ({ label: formatDate(day).slice(0, 6), full: `Week of ${formatDate(day)}` });
  const bySector = state.sectors.map((s) => ({
    label: s.name,
    value: data.participations.filter((p) => participationProjectIds(state, p.id).some((pid) => byId(state.projects, pid)?.sectorId === s.id)).length,
  }));
  const plans = state.plans.map((p) => ({ label: p.name.replace("Standard Contribution Plan — ", ""), full: p.name, value: data.participations.filter((x) => x.planId === p.id).length }));
  const labelled = (domain: Parameters<typeof statusMeta>[0], rows: { key: string; value: number }[]) => rows.map((r) => ({ label: statusMeta(domain, r.key).label, value: r.value }));

  return (
    <>
      <PageHeader
        title="Investment overview"
        description="Investors, applications, contribution plans, projects, allocations and contributions across the six agricultural sectors."
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />
      <InvestmentNotice />

      <Card className="mb-6" bodyClassName="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <FilterSelect label="Sector" value={sectorId} onChange={(v) => { setSectorId(v); setProjectId(""); }} options={state.sectors.map((s) => ({ value: s.id, label: s.name }))} allLabel="All sectors" />
          <FilterSelect label="Project" value={projectId} onChange={setProjectId} options={projectOptions.map((p) => ({ value: p.id, label: p.name }))} allLabel="All projects" className="sm:w-56" />
          <FilterSelect label="Contribution plan" value={planId} onChange={setPlanId} options={state.plans.map((p) => ({ value: p.id, label: p.name.replace("Standard Contribution Plan — ", "") }))} allLabel="All plans" />
          <FilterSelect label="Investor status" value={investorStatus} onChange={setInvestorStatus} options={statusOptions("investorAccount")} />
          <FilterSelect label="Transaction status" value={transactionStatus} onChange={setTransactionStatus} options={statusOptions("transaction")} className="sm:w-56" />
          <ClearFilters active={Boolean(sectorId || projectId || planId || investorStatus || transactionStatus)} onClear={() => { setSectorId(""); setProjectId(""); setPlanId(""); setInvestorStatus(""); setTransactionStatus(""); }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Sector and project filters match participations through their proposed or approved allocations. Date range: {formatDate(range.from)} – {formatDate(range.to)}.
        </p>
      </Card>

      <h2 className="sr-only">Investors and participations</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Registered investors" icon={Users} value={formatNumber(data.investors.length)} detail="Registered in range" href="/admin/investments/investors" hrefLabel="Investors" />
        <MetricCard label="Pending investor applications" icon={ClipboardList} value={formatNumber(pendingApps)} detail="Submitted, under review or awaiting information" href="/admin/investments/applications" hrefLabel="Review applications" />
        <MetricCard label="Approved investors" icon={UserCheck} value={formatNumber(approvedInvestors)} detail="Application approved after manual review" href="/admin/investments/investors" hrefLabel="Investors" />
        <MetricCard label="Active investment participations" icon={BadgeCheck} value={formatNumber(activeParticipations)} detail={`${data.participations.length} participation records in range`} href="/admin/investments/participations" hrefLabel="Participations" />
        <MetricCard label="Total contributions received (verified)" icon={IndianRupee} value={formatINR(fin.verifiedPaise)} detail={`${fin.verifiedCount} contributions verified through the (simulated) admin workflow`} href="/admin/investments/transactions" hrefLabel="Contributions" />
        <MetricCard label="Contributions awaiting verification" icon={Hourglass} value={formatINR(awaiting.reduce((s, t) => s + t.amountPaise, 0))} detail={`${awaiting.length} recorded as successful or under verification — not counted as received`} href="/admin/investments/transactions" hrefLabel="Verify" />
        <MetricCard label="Pending allocation decisions" icon={ListChecks} value={formatNumber(proposedAllocations.length)} detail="Proposed allocations without an approval decision" href="/admin/investments/allocations" hrefLabel="Allocation workspace" />
        <MetricCard label="Pending payout approvals" icon={Wallet} value={formatNumber(requestedPayouts.length)} detail={<>Payout rules need clarification · <FictionalBadge>fictional records</FictionalBadge></>} href="/admin/investments/payouts" hrefLabel="Returns & payouts" />
      </div>

      <h2 className="sr-only">Sectors and projects</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Agricultural sectors" icon={Layers} value={formatNumber(state.sectors.length)} detail="Fixed by the business model" href="/admin/investments/sectors" hrefLabel="Sectors" />
        <MetricCard label="Registered projects" icon={FolderKanban} value={formatNumber(data.projects.length)} detail="Illustrative demo projects" href="/admin/investments/projects" hrefLabel="Project portfolio" />
        <MetricCard label="Active projects" icon={Sprout} value={formatNumber(data.projects.filter((p) => p.status === "active").length)} detail="Status Active in demo records — not a claim about real operations" href="/admin/investments/projects" hrefLabel="Projects" />
        <MetricCard label="Projects requiring review" icon={ClipboardList} value={formatNumber(reviewProjects.length)} detail="On hold, or with proposed allocations awaiting a decision" href="/admin/investments/projects" hrefLabel="Projects" />
      </div>

      <Card className="mt-6" title="Financial records by category" description="Each category is a separate figure. They are never added together, and pending or failed contributions are never counted as received.">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Proposed contribution amounts", value: formatINR(fin.proposedPaise), detail: "Plan amounts of open participations. Not money received." },
            { label: "Submitted contributions (unverified)", value: formatINR(fin.submittedPaise), detail: `${fin.submittedCount} initiated, pending, successful or under verification` },
            { label: "Verified contributions", value: formatINR(fin.verifiedPaise), detail: `${fin.verifiedCount} verified (simulated workflow)` },
            { label: "Rejected or failed transactions", value: formatINR(fin.failedOrRejectedPaise), detail: `${fin.failedOrRejectedCount} transactions` },
            { label: "Refunded amounts (simulated)", value: formatINR(fin.refundedPaise), detail: "Recorded simulated refunds; no money moved" },
            { label: "Approved but unpaid payouts", value: formatNumber(fin.payoutsApprovedUnpaidCount), detail: "Count of fictional test payout records" },
            { label: "Completed payouts (simulated)", value: formatNumber(fin.payoutsCompletedCount), detail: "Count of fictional test payout records" },
          ].map((row) => (
            <div key={row.label} className="rounded-xl bg-soft px-4 py-3">
              <p className="text-[13px] font-medium text-muted-foreground">{row.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{row.value}</p>
              <p className="text-xs text-muted-foreground">{row.detail}</p>
            </div>
          ))}
          <div className="sm:col-span-2 xl:col-span-1">
            <NeedsClarification refId="Q-INV-RETURNS">Returns, yields and payout amounts are not calculated: no return formula or payout policy has been approved. Contributions are not profits.</NeedsClarification>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BarChartCard title="Investor registrations" description="New investor accounts per week" valueLabel="Investors registered" data={registrations.map((p) => ({ ...weekLabel(p.day), value: p.value }))} emptyText="No investors registered in this range." />
        <BarChartCard title="Verified contributions over time" description="By verification date, per week. Contributions are not returns." valueLabel="Verified contributions (INR)" money data={verifiedSeries.map((p) => ({ ...weekLabel(p.day), value: p.value }))} emptyText="No contributions were verified in this range." />
        <BarChartCard title="Participation by agricultural sector" description="Participations with a proposed or approved allocation in the sector" valueLabel="Participations" layout="horizontal" data={bySector} emptyText="No participations have allocations matching these filters." />
        <BarChartCard title="Project portfolio distribution" description="Projects by status" valueLabel="Projects" data={labelled("project", countBy(data.projects, (p) => p.status, ["planning", "active", "on_hold", "archived"]))} emptyText="No projects match these filters." />
        <BarChartCard title="Contribution plan popularity" description="Participation records per standard plan" valueLabel="Participations" layout="horizontal" data={plans} emptyText="No participations match these filters." />
        <BarChartCard title="Investor application status" description="Applications submitted in range" valueLabel="Applications" layout="horizontal" data={labelled("application", countBy(data.applications, (a) => a.status, ["submitted", "under_review", "info_requested", "approved", "rejected"]))} emptyText="No applications were submitted in this range." />
        <BarChartCard title="Project allocation status" description="Allocations for participations in range" valueLabel="Allocations" layout="horizontal" data={labelled("allocation", countBy(data.allocations, (a) => a.status, ["proposed", "approved", "rejected", "withdrawn"]))} emptyText="No allocations match these filters." />
        <BarChartCard title="Transaction status distribution" description="Contribution transactions initiated in range" valueLabel="Transactions" layout="horizontal" data={labelled("transaction", countBy(data.transactions, (t) => t.status, ["initiated", "pending", "successful", "under_verification", "verified", "failed", "rejected", "partially_refunded", "refunded"]))} emptyText="No transactions match these filters." />
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
        Business rules still awaiting approval are listed under{" "}
        <Link href="/admin/investments/settings" className="font-medium text-primary underline">
          Investment rules
        </Link>
        .
      </p>
    </>
  );
}
