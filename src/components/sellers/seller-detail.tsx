"use client";

import * as React from "react";
import { Ban, CircleCheck, CircleX, FileText, RotateCcw, Star } from "lucide-react";
import type { ConfirmOptions } from "@/components/admin/confirm-dialog";
import { DetailList, InlineAlert, SectionTitle, StatusBadge, Timeline } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/format";
import { approveSeller, rejectSeller, reinstateSeller, setDocumentReview, suspendSeller, type ActionResult, type MockAction } from "@/lib/mock/actions";
import { byId, sellerPerformance } from "@/lib/mock/selectors";
import { statusMeta } from "@/lib/status";
import type { DemoDb, Seller } from "@/lib/types";

interface Props {
  db: DemoDb;
  sellerId: string | null;
  onClose: () => void;
  run: <P>(action: MockAction<P>, payload: P) => ActionResult;
  act: <P>(action: MockAction<P>, payload: P) => ActionResult;
  confirm: (options: ConfirmOptions) => void;
}

export function SellerDetailDrawer({ db, sellerId, onClose, run, act, confirm }: Props) {
  const seller = byId(db.sellers, sellerId);
  return (
    <Dialog open={Boolean(seller)} onOpenChange={(o) => !o && onClose()}>
      {seller && (
        <SheetContent title={seller.businessName} description={`${seller.id} · ${seller.city}, ${seller.state}`}>
          <SellerDetail db={db} seller={seller} run={run} act={act} confirm={confirm} />
        </SheetContent>
      )}
    </Dialog>
  );
}

function SellerDetail({ db, seller, run, act, confirm }: { db: DemoDb; seller: Seller } & Pick<Props, "run" | "act" | "confirm">) {
  const perf = sellerPerformance(db, seller.id);
  const unreviewed = seller.documents.filter((d) => d.reviewStatus === "not_reviewed").length;
  const issues = seller.documents.filter((d) => d.reviewStatus === "issue_noted_mock").length;

  const approve = () =>
    confirm({
      title: `Approve ${seller.businessName}?`,
      description: "The seller becomes Active in this demo. No KYC, bank or identity verification is performed by this frontend.",
      confirmLabel: "Approve seller",
      details:
        unreviewed || issues ? (
          <InlineAlert tone="warning" title="Document review incomplete">
            {unreviewed} document(s) not reviewed and {issues} with an issue noted. Whether approval requires completed review is not specified (Q-SELLER-APPROVAL); the demo allows it.
          </InlineAlert>
        ) : undefined,
      onConfirm: () => run(approveSeller, { sellerId: seller.id }),
    });
  const reject = () =>
    confirm({
      title: `Reject ${seller.businessName}'s application?`,
      description: "The application is marked Rejected with your reason. No email is sent to the applicant in this demo.",
      confirmLabel: "Reject application",
      tone: "danger",
      reason: { label: "Rejection reason", placeholder: "e.g. Business registration document is illegible", hint: "Shown in the seller's status history and the audit log." },
      onConfirm: (reason) => run(rejectSeller, { sellerId: seller.id, reason }),
    });
  const suspend = () =>
    confirm({
      title: `Suspend ${seller.businessName}?`,
      description: `The seller is marked Suspended. Their ${perf.products} product(s) and open sub-orders are not changed automatically: what suspension does to listings and orders is not specified (Q-SUSPENSION).`,
      confirmLabel: "Suspend seller",
      tone: "danger",
      reason: { label: "Suspension reason", placeholder: "e.g. Repeated late dispatch" },
      onConfirm: (reason) => run(suspendSeller, { sellerId: seller.id, reason }),
    });
  const reinstate = () =>
    confirm({
      title: `Reinstate ${seller.businessName}?`,
      description: "The seller returns to Active. Unlisted products stay unlisted until relisted on the Products page.",
      confirmLabel: "Reinstate seller",
      onConfirm: () => run(reinstateSeller, { sellerId: seller.id }),
    });
  const noteIssue = (docId: string, type: string) =>
    confirm({
      title: `Note an issue with “${type}”?`,
      description: "Records a mock review outcome. The document has not been verified with any external service.",
      confirmLabel: "Record issue (mock)",
      reason: { label: "Issue description", placeholder: "e.g. Account holder name does not match the business name" },
      onConfirm: (note) => run(setDocumentReview, { sellerId: seller.id, documentId: docId, status: "issue_noted_mock", note }),
    });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge domain="seller" value={seller.status} />
        <div className="flex flex-wrap gap-2">
          {seller.status === "pending" && (
            <>
              <Button variant="destructive" onClick={reject}>
                <CircleX aria-hidden="true" />
                Reject
              </Button>
              <Button onClick={approve}>
                <CircleCheck aria-hidden="true" />
                Approve
              </Button>
            </>
          )}
          {seller.status === "active" && (
            <Button variant="destructive" onClick={suspend}>
              <Ban aria-hidden="true" />
              Suspend
            </Button>
          )}
          {seller.status === "suspended" && (
            <Button variant="outline" onClick={reinstate}>
              <RotateCcw aria-hidden="true" />
              Reinstate
            </Button>
          )}
        </div>
      </div>
      {seller.status === "rejected" && seller.rejectionReason && <InlineAlert tone="danger" title="Rejection reason">{seller.rejectionReason}</InlineAlert>}
      {seller.status === "suspended" && seller.suspensionReason && <InlineAlert tone="danger" title="Suspension reason">{seller.suspensionReason}</InlineAlert>}

      <DetailList
        items={[
          { label: "Contact person", value: seller.contactName },
          { label: "Business email", value: seller.email },
          { label: "Business phone", value: seller.phone },
          { label: "Applied", value: formatDate(seller.appliedAt) },
          { label: "Categories", value: seller.categoryIds.map((id) => byId(db.categories, id)?.name ?? id).join(", ") },
          {
            label: "Rating (recorded)",
            value: seller.rating === null ? "No ratings yet" : (
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 fill-highlight text-warning" aria-hidden="true" />
                {seller.rating.toFixed(1)} from {seller.ratingCount} ratings
              </span>
            ),
          },
        ]}
      />

      <section>
        <SectionTitle>Performance (from demo orders)</SectionTitle>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["Sub-orders", perf.subOrders],
            ["Delivered", perf.delivered],
            ["In progress", perf.inProgress],
            ["Cancelled", perf.cancelled],
            ["Refund requests", perf.refundRequests],
            ["Products", perf.products],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-soft px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">Counts only. The rating is a recorded fixture value; how ratings are calculated is not specified (Q-RATING).</p>
      </section>

      <section>
        <SectionTitle>Documents — mock review</SectionTitle>
        <p className="mb-3 text-xs text-muted-foreground">Review outcomes are recorded locally for the demo. No document has been externally verified, and files are not stored in this demo.</p>
        <ul className="space-y-2.5">
          {seller.documents.map((doc) => (
            <li key={doc.id} className="rounded-xl border border-border p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{doc.type}</p>
                    <p className="truncate text-xs text-muted-foreground">{doc.fileName} · uploaded {formatDate(doc.uploadedAt)}</p>
                  </div>
                </div>
                <StatusBadge domain="document" value={doc.reviewStatus} />
              </div>
              {doc.reviewNote && <p className="mt-2 rounded-lg bg-warning/5 px-3 py-2 text-xs text-foreground">{doc.reviewNote}</p>}
              {seller.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={doc.reviewStatus === "reviewed_mock"} onClick={() => act(setDocumentReview, { sellerId: seller.id, documentId: doc.id, status: "reviewed_mock" })}>
                    Mark reviewed (mock)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => noteIssue(doc.id, doc.type)}>
                    Note an issue
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Status history</SectionTitle>
        <Timeline
          items={[...seller.statusHistory].reverse().map((h) => ({
            at: formatDateTime(h.at),
            title: (
              <>
                {statusMeta("seller", h.status).label}
                {h.note && <span className="text-muted-foreground"> — {h.note}</span>}
              </>
            ),
            meta: h.by,
          }))}
        />
      </section>
    </div>
  );
}
