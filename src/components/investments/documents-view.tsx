"use client";

import * as React from "react";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, PageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { humanize } from "@/lib/format";
import type { InvestmentDocument } from "@/lib/investment/types";
import { reviewDocument } from "@/lib/mock/investment-actions";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import { AddDocumentButton, DOC_TYPES } from "./document-dialog";
import { DocumentsTable } from "./record-tables";
import { InvestmentNotice, useInvestmentAdmin } from "./shared";

export function DocumentsView() {
  const { state, can, runAsync, confirm, confirmDialog } = useInvestmentAdmin();
  const [query, setQuery] = React.useState("");
  const [entity, setEntity] = React.useState("");
  const [docType, setDocType] = React.useState("");
  const [review, setReview] = React.useState("");
  const privateOk = can("inv.documents.private");
  // Private investor documents are not searchable by file name for roles that cannot see them.
  const rows = state.documents.filter((d) => (!entity || d.entityType === entity) && (!docType || d.docType === docType) && (!review || d.reviewStatus === review) && matchesSearch(query, [d.id, d.entityId, d.visibility === "private_investor" && !privateOk ? "" : d.fileName]));

  const act = (d: InvestmentDocument, status: "reviewed_manual" | "issue_noted") =>
    confirm({
      title: status === "reviewed_manual" ? `Mark ${d.id} as reviewed?` : `Note an issue with ${d.id}?`,
      description: "Records a manual review in this demo. No external document, identity or KYC verification is performed, and no verification badge is created.",
      confirmLabel: status === "reviewed_manual" ? "Mark reviewed" : "Record issue",
      tone: status === "issue_noted" ? "danger" : "default",
      reason: status === "issue_noted" ? { label: "Issue", placeholder: "Describe the problem with the document" } : undefined,
      onConfirm: (note) => runAsync(reviewDocument, { documentId: d.id, status, note }),
    });

  return (
    <>
      <PageHeader title="Investment documents" description="Document references for projects, investors, plans, participations, transactions, returns and payouts." actions={<AddDocumentButton />} />
      <InvestmentNotice>File handling is a <strong>demo-only document reference workflow</strong>: only the name, type and size of a chosen file are recorded. Nothing is uploaded to a server. Private investor documents are hidden from roles without the “View private investor documents” permission.</InvestmentNotice>
      <Card title={`${rows.length} document${rows.length === 1 ? "" : "s"}`}>
        <Toolbar>
          <SearchField label="Search documents" placeholder="Search by document ID, record ID or file name" value={query} onChange={setQuery} />
          <FilterSelect label="Related record" value={entity} onChange={setEntity} options={["investor", "application", "project", "plan", "participation", "transaction", "return", "payout"].map((v) => ({ value: v, label: humanize(v) }))} />
          <FilterSelect label="Document type" value={docType} onChange={setDocType} options={DOC_TYPES.map((t) => ({ value: t, label: humanize(t) }))} className="sm:w-56" />
          <FilterSelect label="Review status" value={review} onChange={setReview} options={statusOptions("invDocument")} />
          <ClearFilters active={Boolean(query || entity || docType || review)} onClear={() => { setQuery(""); setEntity(""); setDocType(""); setReview(""); }} />
        </Toolbar>
        <DocumentsTable
          rows={rows}
          actions={(d) =>
            d.visibility === "private_investor" && !privateOk ? null : (
              <span className="inline-flex gap-1.5">
                {d.reviewStatus !== "reviewed_manual" && <Button size="sm" variant="outline" onClick={() => act(d, "reviewed_manual")}>Mark reviewed<span className="sr-only"> {d.id}</span></Button>}
                {d.reviewStatus !== "issue_noted" && <Button size="sm" variant="ghost" onClick={() => act(d, "issue_noted")}>Note issue<span className="sr-only"> {d.id}</span></Button>}
              </span>
            )
          }
        />
      </Card>
      {confirmDialog}
    </>
  );
}
