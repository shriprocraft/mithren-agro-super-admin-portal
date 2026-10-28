"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, DetailList, PageHeader, SectionTitle, StatusBadge, Timeline } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { cn } from "cn";
import { formatDateTime } from "@/lib/format";
import { assignTicket, replyToTicket, setTicketPriority, setTicketStatus } from "@/lib/mock/actions";
import { byId } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { DemoDb, SupportTicket, TicketPriority, TicketStatus } from "@/lib/types";

const PRIORITY_RANK: Record<TicketPriority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };
const requesterName = (db: DemoDb, t: SupportTicket) => (t.requesterType === "customer" ? byId(db.customers, t.requesterId)?.name : byId(db.sellers, t.requesterId)?.businessName) ?? t.requesterId;

export function SupportView() {
  const { db } = useAdmin();
  const params = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [requester, setRequester] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("ticket"));
  const selected = byId(db.tickets, selectedId);

  const rows = db.tickets.filter(
    (t) =>
      (!status || t.status === status) &&
      (!priority || t.priority === priority) &&
      (!requester || t.requesterType === requester) &&
      (!assignee || (assignee === "unassigned" ? t.assigneeId === null : t.assigneeId === assignee)) &&
      matchesSearch(query, [t.id, t.subject, t.orderId, requesterName(db, t)]),
  );

  const columns: Column<SupportTicket>[] = [
    { key: "subject", header: "Ticket", sortValue: (t) => t.id, cell: (t) => <RowLink onClick={() => setSelectedId(t.id)} sub={`${t.id}${t.orderId ? ` · ${t.orderId}` : ""}`}>{t.subject}</RowLink> },
    { key: "requester", header: "Requester", sortValue: (t) => requesterName(db, t), cell: (t) => <div><p>{requesterName(db, t)}</p><p className="text-xs text-muted-foreground capitalize">{t.requesterType}</p></div> },
    { key: "priority", header: "Priority", sortValue: (t) => PRIORITY_RANK[t.priority], cell: (t) => <StatusBadge domain="priority" value={t.priority} /> },
    { key: "status", header: "Status", sortValue: (t) => t.status, cell: (t) => <StatusBadge domain="ticket" value={t.status} /> },
    { key: "assignee", header: "Assignee", sortValue: (t) => byId(db.staff, t.assigneeId)?.name ?? "", cell: (t) => byId(db.staff, t.assigneeId)?.name ?? <span className="text-muted-foreground">Unassigned</span> },
    { key: "updated", header: "Updated", sortValue: (t) => t.updatedAt, cell: (t) => <span className="whitespace-nowrap">{formatDateTime(t.updatedAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Support" description="Customer and seller support tickets with status, priority, assignment, replies and resolution history." />
      <DemoNotice>Replies are added to the ticket history only. <strong>No email, SMS, WhatsApp or push notification is sent</strong> in this demo.</DemoNotice>
      <Card>
        <Toolbar>
          <SearchField label="Search tickets" placeholder="Ticket ID, subject, order or requester" value={query} onChange={setQuery} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("ticket")} />
          <FilterSelect label="Priority" value={priority} onChange={setPriority} options={statusOptions("priority")} />
          <FilterSelect label="Assignee" value={assignee} onChange={setAssignee} options={[{ value: "unassigned", label: "Unassigned" }, ...db.staff.map((s) => ({ value: s.id, label: s.name }))]} />
          <FilterSelect label="Requester" value={requester} onChange={setRequester} options={[{ value: "customer", label: "Customers" }, { value: "seller", label: "Sellers" }]} />
          <ClearFilters active={Boolean(query || status || priority || assignee || requester)} onClear={() => { setQuery(""); setStatus(""); setPriority(""); setAssignee(""); setRequester(""); }} />
        </Toolbar>
        <DataTable caption="Support tickets" rows={rows} columns={columns} getRowId={(t) => t.id} initialSort={{ key: "priority", direction: "desc" }} resetKey={`${query}|${status}|${priority}|${assignee}|${requester}`} minWidth={900} />
      </Card>
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent title={selected.subject} description={`${selected.id} · ${requesterName(db, selected)}`}>
            <TicketDetail db={db} ticket={selected} />
          </SheetContent>
        )}
      </Dialog>
    </>
  );
}

function TicketDetail({ db, ticket }: { db: DemoDb; ticket: SupportTicket }) {
  const { act, run, toast } = useAdmin();
  const [reply, setReply] = React.useState("");
  const [replyError, setReplyError] = React.useState<string | null>(null);
  const activeStaff = db.staff.filter((s) => s.status === "active" || s.id === ticket.assigneeId);

  const sendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return setReplyError("Write a reply before adding it.");
    const r = run(replyToTicket, { ticketId: ticket.id, body: reply });
    if (!r.ok) return setReplyError(r.error);
    toast.success(r.message);
    setReply("");
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Status">
          <NativeSelect value={ticket.status} onChange={(e) => act(setTicketStatus, { ticketId: ticket.id, status: e.target.value as TicketStatus })}>
            {statusOptions("ticket").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Priority">
          <NativeSelect value={ticket.priority} onChange={(e) => act(setTicketPriority, { ticketId: ticket.id, priority: e.target.value as TicketPriority })}>
            {statusOptions("priority").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Assignee">
          <NativeSelect value={ticket.assigneeId ?? ""} onChange={(e) => act(assignTicket, { ticketId: ticket.id, assigneeId: e.target.value || null })}>
            <option value="">Unassigned</option>
            {activeStaff.map((s) => <option key={s.id} value={s.id} disabled={s.status !== "active"}>{s.name}{s.status !== "active" ? " (inactive)" : ""}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <DetailList items={[
        { label: "Requester", value: `${requesterName(db, ticket)} (${ticket.requesterType})` },
        { label: "Related order", value: ticket.orderId ? <Link href={`/admin/orders?order=${ticket.orderId}`} className="text-primary hover:underline">{ticket.orderId}</Link> : "—" },
        { label: "Opened", value: formatDateTime(ticket.createdAt) },
        { label: "Last updated", value: formatDateTime(ticket.updatedAt) },
      ]} />

      <section>
        <SectionTitle>Conversation</SectionTitle>
        <ol className="space-y-3">
          {ticket.messages.map((m) => (
            <li key={m.id} className={cn("max-w-[90%] rounded-2xl px-4 py-3 text-sm", m.author === "staff" ? "ml-auto bg-secondary" : "bg-soft ring-1 ring-border")}>
              <p className="text-xs font-medium text-muted-foreground">{m.authorName} · {formatDateTime(m.at)}</p>
              <p className="mt-1 leading-relaxed whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ol>
        <form onSubmit={sendReply} noValidate className="mt-4 grid gap-2">
          <Field label="Reply" error={replyError} hint="Added to the ticket only; not delivered to the requester in this demo.">
            <Textarea value={reply} onChange={(e) => { setReply(e.target.value); setReplyError(null); }} maxLength={2000} placeholder="Write a reply…" />
          </Field>
          <Button type="submit" className="justify-self-end"><Send aria-hidden="true" />Add reply (demo)</Button>
        </form>
      </section>

      <section>
        <SectionTitle>Resolution history</SectionTitle>
        <Timeline items={[...ticket.history].reverse().map((h) => ({ at: formatDateTime(h.at), title: h.change, meta: h.actor }))} />
      </section>
    </div>
  );
}
