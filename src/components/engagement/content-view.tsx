"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/admin/field";
import { Card, DemoNotice, EmptyState, InlineAlert, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button } from "@/components/ui/button";
import { Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { scheduleState, validateRange } from "@/lib/dates";
import { formatDate, formatDateTime } from "@/lib/format";
import { deleteFaq, saveAnnouncement, saveFaq, savePolicy, setHomepageSection, updateContact } from "@/lib/mock/actions";
import type { Announcement, ContactDetails, Faq, PolicyPage } from "@/lib/types";

export function ContentView() {
  return (
    <>
      <PageHeader title="Content" description="Homepage sections, policy pages, FAQs, contact details and announcements for the storefront." />
      <DemoNotice><strong>Publishing is simulated.</strong> Changes and “Published (demo)” states exist only in this browser. The Mithren Agro customer storefront is not updated.</DemoNotice>
      <Tabs defaultValue="homepage">
        <TabsList aria-label="Content sections">
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="policies">Policy pages</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="contact">Contact details</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>
        <TabsContent value="homepage"><HomepageTab /></TabsContent>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
        <TabsContent value="faqs"><FaqTab /></TabsContent>
        <TabsContent value="contact"><ContactTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
      </Tabs>
    </>
  );
}

function HomepageTab() {
  const { db, act } = useAdmin();
  const sections = [...db.content.homepageSections].sort((a, b) => a.position - b.position);
  return (
    <Card title="Homepage sections" description="Order and visibility of storefront homepage sections (local draft).">
      <ol className="divide-y divide-border rounded-xl border border-border">
        {sections.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => act(setHomepageSection, { sectionId: s.id, move: "up" })} aria-label={`Move ${s.title} up`}><ArrowUp /></Button>
              <Button size="icon-sm" variant="ghost" disabled={i === sections.length - 1} onClick={() => act(setHomepageSection, { sectionId: s.id, move: "down" })} aria-label={`Move ${s.title} down`}><ArrowDown /></Button>
              <Switch className="ml-2" checked={s.enabled} onCheckedChange={(v) => act(setHomepageSection, { sectionId: s.id, enabled: v })} aria-label={`Show ${s.title}`} />
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function PoliciesTab() {
  const { db, run, toast, confirm, confirmDialog } = useAdmin();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const editing = db.content.policies.find((p) => p.id === editingId);
  return (
    <Card title="Policy pages">
      <ul className="grid gap-3 md:grid-cols-2">
        {db.content.policies.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between gap-2"><p className="font-medium">{p.title}</p><StatusBadge domain="policy" value={p.state} /></div>
            <p className="mt-1 text-xs text-muted-foreground">/{p.slug} · updated {formatDateTime(p.updatedAt)}</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditingId(p.id)}><Pencil aria-hidden="true" />Edit &amp; preview<span className="sr-only"> {p.title}</span></Button>
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditingId(null)}>
        {editing && (
          <PolicyEditor
            key={editing.id}
            policy={editing}
            onCancel={() => setEditingId(null)}
            onSave={(title, body, publish) => {
              if (publish) {
                confirm({
                  title: `Publish “${title}” (demo)?`,
                  description: "The page will be marked Published (demo) in this browser only. The customer storefront is not changed.",
                  confirmLabel: "Publish (demo)",
                  onConfirm: () => {
                    const r = run(savePolicy, { policyId: editing.id, title, body, publish: true });
                    if (r.ok) setEditingId(null);
                    return r;
                  },
                });
                return null;
              }
              const r = run(savePolicy, { policyId: editing.id, title, body, publish: false });
              if (r.ok) { toast.success(r.message); setEditingId(null); return null; }
              return r.error;
            }}
          />
        )}
      </Dialog>
      {confirmDialog}
    </Card>
  );
}

function PolicyEditor({ policy, onSave, onCancel }: { policy: PolicyPage; onSave: (title: string, body: string, publish: boolean) => string | null; onCancel: () => void }) {
  const [title, setTitle] = React.useState(policy.title);
  const [body, setBody] = React.useState(policy.body);
  const [preview, setPreview] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const submit = (publish: boolean) => {
    if (!title.trim() || !body.trim()) return setError("Title and body text are required.");
    setError(onSave(title, body, publish));
  };
  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Edit policy page</DialogTitle>
        <DialogDescription>Plain text; blank lines separate paragraphs. Current state: {policy.state === "draft" ? "Draft" : "Published (demo)"}.</DialogDescription>
      </DialogHeader>
      <div className="flex gap-2">
        <Button size="sm" variant={preview ? "outline" : "secondary"} onClick={() => setPreview(false)} aria-pressed={!preview}><Pencil aria-hidden="true" />Edit</Button>
        <Button size="sm" variant={preview ? "secondary" : "outline"} onClick={() => setPreview(true)} aria-pressed={preview}><Eye aria-hidden="true" />Preview</Button>
      </div>
      {preview ? (
        <article className="max-h-[50vh] overflow-y-auto rounded-2xl border border-border bg-white px-5 py-4" aria-label="Preview">
          <p className="mb-2 text-xs font-medium text-info">Preview (local, not published)</p>
          <h2 className="text-xl font-semibold">{title || "Untitled"}</h2>
          {body.split(/\n{2,}/).map((para, i) => <p key={i} className="mt-3 text-sm leading-[1.7] whitespace-pre-wrap text-foreground">{para}</p>)}
        </article>
      ) : (
        <div className="grid gap-4">
          <Field label="Title" required><Input value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} maxLength={100} /></Field>
          <Field label="Body" required><Textarea value={body} onChange={(e) => { setBody(e.target.value); setError(null); }} className="min-h-56" /></Field>
        </div>
      )}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="secondary" onClick={() => submit(false)}>Save draft</Button>
        <Button onClick={() => submit(true)}>Publish (demo)</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function FaqTab() {
  const { db, run, toast, confirm, confirmDialog } = useAdmin();
  const [editing, setEditing] = React.useState<Faq | "new" | null>(null);
  return (
    <Card title="FAQs" actions={<Button onClick={() => setEditing("new")}><Plus aria-hidden="true" />Add FAQ</Button>}>
      {db.content.faqs.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {db.content.faqs.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><p className="font-medium">{f.question}</p><p className="mt-0.5 text-sm text-muted-foreground">{f.answer}</p></div>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(f)} aria-label={`Edit FAQ: ${f.question}`}><Pencil /></Button>
              <Button size="icon-sm" variant="ghost" aria-label={`Remove FAQ: ${f.question}`} onClick={() => confirm({ title: "Remove this FAQ?", description: f.question, confirmLabel: "Remove FAQ", tone: "danger", onConfirm: () => run(deleteFaq, { faqId: f.id }) })}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No FAQs" description="Add the first question." />}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <FaqForm key={editing === "new" ? "new" : editing.id} faq={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSave={(input) => { const r = run(saveFaq, input); if (r.ok) { toast.success(r.message); setEditing(null); return null; } return r.error; }} />
        )}
      </Dialog>
      {confirmDialog}
    </Card>
  );
}

function FaqForm({ faq, onSave, onCancel }: { faq: Faq | null; onSave: (input: { id?: string; question: string; answer: string }) => string | null; onCancel: () => void }) {
  const [question, setQuestion] = React.useState(faq?.question ?? "");
  const [answer, setAnswer] = React.useState(faq?.answer ?? "");
  const [errors, setErrors] = React.useState<{ q?: string; a?: string; form?: string | null }>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { q: question.trim() ? undefined : "Question is required.", a: answer.trim() ? undefined : "Answer is required." };
    setErrors(next);
    if (next.q || next.a) return;
    setErrors({ form: onSave({ id: faq?.id, question, answer }) });
  };
  return (
    <DialogContent>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader><DialogTitle>{faq ? "Edit FAQ" : "Add FAQ"}</DialogTitle><DialogDescription>Local draft only.</DialogDescription></DialogHeader>
        <Field label="Question" required error={errors.q}><Input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={160} /></Field>
        <Field label="Answer" required error={errors.a}><Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={800} /></Field>
        {errors.form && <p role="alert" className="text-sm font-medium text-destructive">{errors.form}</p>}
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Save FAQ</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function ContactTab() {
  const { db, run, toast } = useAdmin();
  const [form, setForm] = React.useState<ContactDetails>(db.content.contact);
  const [errors, setErrors] = React.useState<Partial<Record<keyof ContactDetails, string>>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const set = (key: keyof ContactDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: undefined })); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof ContactDetails, string>> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? undefined : "Enter a valid email address.",
      phone: /^\+?[0-9][0-9\s-]{7,16}$/.test(form.phone.trim()) ? undefined : "Enter a valid phone number, e.g. +91 90000 00000.",
      address: form.address.trim() ? undefined : "Address is required.",
      hours: form.hours.trim() ? undefined : "Support hours are required.",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const r = run(updateContact, form);
    if (r.ok) { toast.success(r.message); setFormError(null); } else setFormError(r.error);
  };
  return (
    <Card title="Contact details" description="Shown on the storefront contact page (local draft).">
      <form onSubmit={submit} noValidate className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="Support email" required error={errors.email}><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Support phone" required error={errors.phone}><Input type="tel" value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Address" required error={errors.address} className="sm:col-span-2"><Textarea value={form.address} onChange={set("address")} className="min-h-16" /></Field>
        <Field label="Support hours" required error={errors.hours} className="sm:col-span-2"><Input value={form.hours} onChange={set("hours")} /></Field>
        {formError && <div className="sm:col-span-2"><InlineAlert tone="danger">{formError}</InlineAlert></div>}
        <div className="sm:col-span-2"><Button type="submit">Save contact details</Button></div>
      </form>
    </Card>
  );
}

function AnnouncementsTab() {
  const { db, run, act, toast } = useAdmin();
  const [editing, setEditing] = React.useState<Announcement | "new" | null>(null);
  return (
    <Card title="Announcements" description="Short messages for the storefront announcement bar." actions={<Button onClick={() => setEditing("new")}><Plus aria-hidden="true" />New announcement</Button>}>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {db.content.announcements.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.message}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(a.startsAt)} – {formatDate(a.endsAt)}</p>
            </div>
            <StatusBadge domain="schedule" value={scheduleState(a.startsAt, a.endsAt)} />
            <Switch checked={a.enabled} onCheckedChange={(v) => act(saveAnnouncement, { ...a, enabled: v })} aria-label={`Announcement enabled: ${a.message}`} />
            <Button size="icon-sm" variant="ghost" onClick={() => setEditing(a)} aria-label={`Edit announcement: ${a.message}`}><Pencil /></Button>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <AnnouncementForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSave={(input) => { const r = run(saveAnnouncement, input); if (r.ok) { toast.success(r.message); setEditing(null); return null; } return r.error; }} />
        )}
      </Dialog>
    </Card>
  );
}

function AnnouncementForm({ item, onSave, onCancel }: { item: Announcement | null; onSave: (input: Omit<Announcement, "id"> & { id?: string }) => string | null; onCancel: () => void }) {
  const [message, setMessage] = React.useState(item?.message ?? "");
  const [startsAt, setStartsAt] = React.useState(item?.startsAt ?? "");
  const [endsAt, setEndsAt] = React.useState(item?.endsAt ?? "");
  const [errors, setErrors] = React.useState<{ message?: string; dates?: string; form?: string | null }>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      message: !message.trim() ? "Message is required." : message.trim().length > 160 ? "Keep it to 160 characters or fewer." : undefined,
      dates: validateRange({ from: startsAt, to: endsAt }) ?? undefined,
    };
    setErrors(next);
    if (next.message || next.dates) return;
    setErrors({ form: onSave({ id: item?.id, message, startsAt, endsAt, enabled: item?.enabled ?? true }) });
  };
  return (
    <DialogContent>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <DialogHeader><DialogTitle>{item ? "Edit announcement" : "New announcement"}</DialogTitle><DialogDescription>Local draft only; not shown on the storefront.</DialogDescription></DialogHeader>
        <Field label="Message" required error={errors.message} hint={`${message.trim().length}/160`}><Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-16" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" required error={errors.dates}><Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Field>
          <Field label="Ends" required><Input type="date" value={endsAt} min={startsAt || undefined} onChange={(e) => setEndsAt(e.target.value)} /></Field>
        </div>
        {errors.form && <p role="alert" className="text-sm font-medium text-destructive">{errors.form}</p>}
        <DialogFooter><Button variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Save announcement</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
