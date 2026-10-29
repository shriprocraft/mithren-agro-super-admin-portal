"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { NAV_GROUPS } from "@/components/shell/nav";
import { NativeSelect } from "@/components/ui/input";
import { useSession } from "@/lib/auth/session";
import { istDay, presetRange } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import { changeStaffRole } from "@/lib/mock/actions";
import { statusMeta, statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { StaffMember, StaffRole } from "@/lib/types";

export function StaffView() {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const session = useSession();
  const me = session.status === "signed_in" ? session.session.staffId : null;
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [activity, setActivity] = React.useState("");
  const weekAgo = presetRange("7d").from;
  const rows = db.staff.filter(
    (s) =>
      (!role || s.role === role) &&
      (!status || s.status === status) &&
      (!activity || (activity === "recent" ? istDay(s.lastActiveAt) >= weekAgo : istDay(s.lastActiveAt) < weekAgo)) &&
      matchesSearch(query, [s.name, s.email]),
  );

  const changeRole = (s: StaffMember, next: StaffRole) =>
    confirm({
      title: `Change ${s.name}'s role to ${statusMeta("role", next).label}?`,
      description: next === "super_admin" ? "Super Admin has full platform access according to the source. This change is recorded in the audit log." : "What the Admin role may access is not yet defined (Q-PERMISSIONS). This demo does not restrict any screen by role.",
      confirmLabel: "Change role",
      tone: next === "admin" ? "danger" : "default",
      onConfirm: () => run(changeStaffRole, { staffId: s.id, role: next }),
    });

  const columns: Column<StaffMember>[] = [
    { key: "name", header: "Staff member", sortValue: (s) => s.name, cell: (s) => <div><p className="font-medium">{s.name}{s.id === me && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{s.email}</p></div> },
    {
      key: "role", header: "Role", sortValue: (s) => s.role,
      cell: (s) => s.id === me ? <StatusBadge domain="role" value={s.role} /> : (
        <NativeSelect aria-label={`Role for ${s.name}`} value={s.role} onChange={(e) => changeRole(s, e.target.value as StaffRole)} className="h-9 w-40 text-sm">
          {statusOptions("role").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </NativeSelect>
      ),
    },
    { key: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <StatusBadge domain="staff" value={s.status} /> },
    { key: "active", header: "Last active", sortValue: (s) => s.lastActiveAt, cell: (s) => formatDateTime(s.lastActiveAt) },
  ];

  return (
    <>
      <PageHeader title="Staff & permissions" description="Administrative staff, their roles, and the least-privilege permission model." />
      <DemoNotice>Roles shown here are a <strong>frontend simulation</strong>. They do not enforce access anywhere: every signed-in demo user sees every screen. Production authorization must be enforced by a server.</DemoNotice>
      <Card title="Staff">
        <Toolbar>
          <SearchField label="Search staff" placeholder="Name or email" value={query} onChange={setQuery} />
          <FilterSelect label="Role" value={role} onChange={setRole} options={statusOptions("role")} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("staff")} />
          <FilterSelect label="Last active" value={activity} onChange={setActivity} options={[{ value: "recent", label: "In the last 7 days" }, { value: "older", label: "More than 7 days ago" }]} allLabel="Any time" />
          <ClearFilters active={Boolean(query || role || status || activity)} onClear={() => { setQuery(""); setRole(""); setStatus(""); setActivity(""); }} />
        </Toolbar>
        <DataTable caption="Staff members" rows={rows} columns={columns} getRowId={(s) => s.id} initialSort={{ key: "name", direction: "asc" }} resetKey={`${query}|${role}|${status}|${activity}`} minWidth={720} />
        <p className="mt-3 text-xs text-muted-foreground">Inviting, deactivating or removing staff is not offered: those workflows are not specified. You cannot change your own role.</p>
      </Card>

      <Card className="mt-6" title="Permission matrix" description="Roles named in the source: Super Admin and Admin.">
        <div className="mb-4">
          <NeedsClarification refId="Q-PERMISSIONS">The source requires a permission matrix and least-privilege access but defines only that Super Admin has full platform access. The Admin role&apos;s permissions, any further roles, and per-action rights (view / edit / approve / export) must be confirmed before this matrix can be completed.</NeedsClarification>
          <p className="mt-3 text-sm text-muted-foreground">
            Granular investment permissions (approve payouts, verify contributions, manage allocations…) are listed in the <Link href="/admin/investments/settings" className="font-medium text-primary underline">investment permission matrix</Link>. Unlike the marketplace screens, those are enforced by the demo&apos;s investment actions.
          </p>
        </div>
        <div className="scrollbar-thin relative overflow-x-auto rounded-xl border border-border" role="region" aria-label="Permission matrix" tabIndex={0}>
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Access by role for each admin area</caption>
            <thead className="bg-secondary/70 text-left text-[13px] font-semibold text-muted-foreground">
              <tr><th scope="col" className="px-3.5 py-2.5">Area</th><th scope="col" className="px-3.5 py-2.5">Super Admin</th><th scope="col" className="px-3.5 py-2.5">Admin</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
                <tr key={item.href}>
                  <th scope="row" className="px-3.5 py-2.5 text-left font-medium">{item.label}</th>
                  <td className="px-3.5 py-2.5"><span className="inline-flex items-center gap-1 text-success"><Check className="size-4" aria-hidden="true" />Full access</span></td>
                  <td className="px-3.5 py-2.5"><NeedsClarification compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {confirmDialog}
    </>
  );
}
