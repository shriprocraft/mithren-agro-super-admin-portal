"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CircleCheck, CircleX, EyeOff, RotateCcw } from "lucide-react";
import type { ConfirmOptions } from "@/components/admin/confirm-dialog";
import { Badge, DetailList, InlineAlert, SectionTitle, StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { formatDate, formatINR } from "@/lib/format";
import { approveProduct, rejectProduct, relistProduct, reviewCertification, unlistProduct, type ActionResult, type MockAction } from "@/lib/mock/actions";
import { byId } from "@/lib/mock/selectors";
import type { DemoDb, Product } from "@/lib/types";

interface Props {
  db: DemoDb;
  productId: string | null;
  onClose: () => void;
  run: <P>(action: MockAction<P>, payload: P) => ActionResult;
  confirm: (options: ConfirmOptions) => void;
}

/** Shown only when the mock review record supports it; never says "certified organic". */
export function CertificationLabel({ product }: { product: Product }) {
  if (product.certification !== "reviewed_mock") return null;
  return (
    <Badge tone="info" icon={false}>
      <BadgeCheck className="mr-0.5 inline size-3" aria-hidden="true" />
      Organic certificate reviewed (mock)
    </Badge>
  );
}

export function ProductDetailDrawer({ db, productId, onClose, run, confirm }: Props) {
  const product = byId(db.products, productId);
  return (
    <Dialog open={Boolean(product)} onOpenChange={(o) => !o && onClose()}>
      {product && (
        <SheetContent title={product.name} description={`${product.id} · ${byId(db.sellers, product.sellerId)?.businessName ?? "Unknown seller"}`}>
          <ProductDetail db={db} product={product} run={run} confirm={confirm} />
        </SheetContent>
      )}
    </Dialog>
  );
}

function ProductDetail({ db, product, run, confirm }: { db: DemoDb; product: Product } & Pick<Props, "run" | "confirm">) {
  const seller = byId(db.sellers, product.sellerId);
  const category = byId(db.categories, product.categoryId);
  const reports = db.productReports.filter((r) => r.productId === product.id);
  const alerts = db.inventoryAlerts.filter((a) => a.productId === product.id && a.status === "open");

  const approve = () =>
    confirm({
      title: `Approve “${product.name}”?`,
      description: "The product becomes Approved and Listed in this demo. The customer storefront is not changed.",
      confirmLabel: "Approve and list",
      details:
        product.certification === "submitted_not_reviewed" ? (
          <InlineAlert tone="info">A certification document is awaiting mock review. Approving the listing does not review it; no certification label will show until it is reviewed.</InlineAlert>
        ) : undefined,
      onConfirm: () => run(approveProduct, { productId: product.id }),
    });
  const reject = () =>
    confirm({
      title: `Reject “${product.name}”?`,
      description: "The listing is marked Rejected. The seller is not notified in this demo.",
      confirmLabel: "Reject product",
      tone: "danger",
      reason: { label: "Rejection reason", placeholder: "e.g. Images do not match the listing title" },
      onConfirm: (reason) => run(rejectProduct, { productId: product.id, reason }),
    });
  const unlist = () =>
    confirm({
      title: `Unlist “${product.name}”?`,
      description: "Listing moderation: the product stays approved but is marked Unlisted.",
      confirmLabel: "Unlist product",
      tone: "danger",
      reason: { label: "Moderation reason", placeholder: "e.g. Weight complaint under investigation" },
      onConfirm: (reason) => run(unlistProduct, { productId: product.id, reason }),
    });
  const relist = () =>
    confirm({
      title: `Relist “${product.name}”?`,
      description: seller?.status === "suspended" ? "Note: this seller is currently suspended. Whether suspended sellers may have listed products is not specified (Q-SUSPENSION)." : "The product is marked Listed again.",
      confirmLabel: "Relist product",
      onConfirm: () => run(relistProduct, { productId: product.id }),
    });
  const certify = (outcome: "reviewed_mock" | "not_submitted") =>
    confirm({
      title: outcome === "reviewed_mock" ? "Mark certificate as reviewed (mock)?" : "Decline the certification document (mock)?",
      description:
        outcome === "reviewed_mock"
          ? "Records a mock review only. The admin panel will show “Organic certificate reviewed (mock)”. Nothing has been verified with a certification body."
          : "The document is not accepted; no certification label will show for this product.",
      confirmLabel: outcome === "reviewed_mock" ? "Record mock review" : "Decline document",
      tone: outcome === "reviewed_mock" ? "default" : "danger",
      onConfirm: () => run(reviewCertification, { productId: product.id, outcome }),
    });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge domain="approval" value={product.approvalStatus} />
        {product.approvalStatus === "approved" && <StatusBadge domain="listing" value={product.listingStatus} />}
        <CertificationLabel product={product} />
      </div>
      <div className="flex flex-wrap gap-2">
        {product.approvalStatus === "pending" && (
          <>
            <Button onClick={approve}><CircleCheck aria-hidden="true" />Approve</Button>
            <Button variant="destructive" onClick={reject}><CircleX aria-hidden="true" />Reject</Button>
          </>
        )}
        {product.approvalStatus === "approved" && product.listingStatus === "listed" && <Button variant="destructive" onClick={unlist}><EyeOff aria-hidden="true" />Unlist</Button>}
        {product.approvalStatus === "approved" && product.listingStatus === "unlisted" && <Button variant="outline" onClick={relist}><RotateCcw aria-hidden="true" />Relist</Button>}
      </div>
      {product.rejectionReason && product.approvalStatus === "rejected" && <InlineAlert tone="danger" title="Rejection reason">{product.rejectionReason}</InlineAlert>}
      {product.moderationNote && product.listingStatus === "unlisted" && <InlineAlert tone="warning" title="Moderation note">{product.moderationNote}</InlineAlert>}

      <section>
        <SectionTitle>Images</SectionTitle>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {product.images.map((img) => (
            <li key={img.src} className="overflow-hidden rounded-xl border border-border bg-white">
              <Image src={img.src} alt={img.alt} width={400} height={400} className="aspect-square w-full object-contain" />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Generic illustration images reused from the storefront; not photographs of this seller&apos;s produce.</p>
      </section>

      <DetailList
        items={[
          { label: "Category", value: category ? `${category.name}${category.status === "inactive" ? " (inactive)" : ""}` : "—" },
          { label: "Seller", value: seller ? <Link href={`/admin/sellers?seller=${seller.id}`} className="text-primary hover:underline">{seller.businessName}</Link> : "—" },
          { label: "Seller status", value: seller ? <StatusBadge domain="seller" value={seller.status} /> : "—" },
          { label: "Submitted", value: formatDate(product.submittedAt) },
          { label: "Reviewed", value: product.reviewedAt ? formatDate(product.reviewedAt) : "Not yet" },
          { label: "Description", value: product.description },
        ]}
      />

      <section>
        <SectionTitle>Variants and stock</SectionTitle>
        <div className="relative overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[420px] text-sm">
            <caption className="sr-only">Variants</caption>
            <thead className="bg-secondary/70 text-left text-[13px] font-semibold text-muted-foreground">
              <tr><th scope="col" className="px-3 py-2">Variant</th><th scope="col" className="px-3 py-2">SKU</th><th scope="col" className="px-3 py-2 text-right">Price</th><th scope="col" className="px-3 py-2 text-right">Stock</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {product.variants.map((v) => (
                <tr key={v.id}>
                  <td className="px-3 py-2">{v.label}</td>
                  <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(v.pricePaise)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {v.stock}
                    {alerts.some((a) => a.variantId === v.id) && <span className="ml-1.5 text-xs font-medium text-warning">low-stock alert</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>Organic certification (mock review record)</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge domain="certification" value={product.certification} />
          {product.certificationDocument && <span className="text-xs text-muted-foreground">{product.certificationDocument}</span>}
        </div>
        {product.certification === "submitted_not_reviewed" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => certify("reviewed_mock")}>Mark reviewed (mock)</Button>
            <Button size="sm" variant="ghost" onClick={() => certify("not_submitted")}>Decline document</Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">The panel never labels a product “certified organic”. A mock review only records that an administrator looked at the uploaded document.</p>
      </section>

      <section>
        <SectionTitle>Reports ({reports.length})</SectionTitle>
        {reports.length ? (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-border px-3.5 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><span>{r.reason}</span><StatusBadge domain="report" value={r.status} /></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.id} · {formatDate(r.reportedAt)}{r.resolutionNote ? ` · ${r.resolutionNote}` : ""}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No reports for this product.</p>
        )}
      </section>
    </div>
  );
}
