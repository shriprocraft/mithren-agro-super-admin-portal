"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { DataTable, RowLink, type Column } from "@/components/admin/data-table";
import { ClearFilters, FilterSelect, SearchField, Toolbar } from "@/components/admin/filters";
import { Card, DemoNotice, EmptyState, NeedsClarification, PageHeader, StatusBadge } from "@/components/admin/primitives";
import { useAdmin } from "@/components/admin/use-admin";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { formatDate, formatINR } from "@/lib/format";
import { acknowledgeInventoryAlert, resolveProductReport } from "@/lib/mock/actions";
import { byId } from "@/lib/mock/selectors";
import { statusOptions } from "@/lib/status";
import { matchesSearch } from "@/lib/table";
import type { InventoryAlert, Product, ProductReport } from "@/lib/types";
import { CertificationLabel, ProductDetailDrawer } from "./product-detail";

const totalStock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);
const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.pricePaise));

export function ProductsView({ mode }: { mode: "all" | "approvals" }) {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [approval, setApproval] = React.useState(mode === "approvals" ? "pending" : "");
  const [listing, setListing] = React.useState("");
  const [seller, setSeller] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(params.get("product"));
  const view = mode === "all" ? (params.get("view") ?? "catalogue") : "catalogue";

  const rows = db.products.filter(
    (p) =>
      (!category || p.categoryId === category) &&
      (!approval || p.approvalStatus === approval) &&
      (!listing || (p.approvalStatus === "approved" && p.listingStatus === listing)) &&
      (!seller || p.sellerId === seller) &&
      matchesSearch(query, [p.name, p.id, byId(db.sellers, p.sellerId)?.businessName, ...p.variants.map((v) => v.sku)]),
  );

  const productCell = (p: Product) => (
    <div className="flex items-center gap-3">
      <Image src={p.images[0]?.src ?? ""} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg border border-border bg-white object-contain" />
      <RowLink onClick={() => setSelectedId(p.id)} sub={`${p.id} · ${p.variants.length} variant${p.variants.length > 1 ? "s" : ""}`}>{p.name}</RowLink>
    </div>
  );

  const columns: Column<Product>[] =
    mode === "approvals"
      ? [
          { key: "name", header: "Product", sortValue: (p) => p.name, cell: productCell },
          { key: "seller", header: "Seller", sortValue: (p) => byId(db.sellers, p.sellerId)?.businessName, cell: (p) => byId(db.sellers, p.sellerId)?.businessName },
          { key: "category", header: "Category", sortValue: (p) => byId(db.categories, p.categoryId)?.name, cell: (p) => byId(db.categories, p.categoryId)?.name },
          { key: "submitted", header: "Submitted", sortValue: (p) => p.submittedAt, cell: (p) => formatDate(p.submittedAt) },
          { key: "cert", header: "Certification", cell: (p) => <StatusBadge domain="certification" value={p.certification} /> },
          { key: "status", header: "Status", sortValue: (p) => p.approvalStatus, cell: (p) => <StatusBadge domain="approval" value={p.approvalStatus} /> },
          { key: "review", header: "Review", srOnlyHeader: true, align: "right", cell: (p) => <button type="button" onClick={() => setSelectedId(p.id)} className={buttonVariants({ size: "sm", variant: p.approvalStatus === "pending" ? "default" : "outline" })}>{p.approvalStatus === "pending" ? "Review" : "View"}<span className="sr-only"> {p.name}</span></button> },
        ]
      : [
          { key: "name", header: "Product", sortValue: (p) => p.name, cell: productCell },
          { key: "category", header: "Category", sortValue: (p) => byId(db.categories, p.categoryId)?.name, cell: (p) => byId(db.categories, p.categoryId)?.name },
          { key: "seller", header: "Seller", sortValue: (p) => byId(db.sellers, p.sellerId)?.businessName, cell: (p) => byId(db.sellers, p.sellerId)?.businessName },
          { key: "price", header: "From", align: "right", sortValue: minPrice, cell: (p) => formatINR(minPrice(p)) },
          { key: "stock", header: "Stock", align: "right", sortValue: totalStock, cell: (p) => totalStock(p) },
          {
            key: "status",
            header: "Status",
            sortValue: (p) => `${p.approvalStatus}-${p.listingStatus}`,
            cell: (p) => (
              <div className="flex flex-wrap gap-1">
                {p.approvalStatus === "approved" ? <StatusBadge domain="listing" value={p.listingStatus} /> : <StatusBadge domain="approval" value={p.approvalStatus} />}
                <CertificationLabel product={p} />
              </div>
            ),
          },
        ];

  const filtersActive = Boolean(query || category || listing || seller || approval !== (mode === "approvals" ? "pending" : ""));
  const clear = () => { setQuery(""); setCategory(""); setListing(""); setSeller(""); setApproval(mode === "approvals" ? "pending" : ""); };
  const toolbar = (
    <Toolbar>
      <SearchField label="Search products" placeholder="Name, ID, SKU or seller" value={query} onChange={setQuery} />
      <FilterSelect label="Category" value={category} onChange={setCategory} options={db.categories.map((c) => ({ value: c.id, label: c.name }))} />
      <FilterSelect label="Approval" value={approval} onChange={setApproval} options={statusOptions("approval")} />
      {mode === "all" && <FilterSelect label="Listing" value={listing} onChange={setListing} options={statusOptions("listing")} />}
      <FilterSelect label="Seller" value={seller} onChange={setSeller} options={db.sellers.filter((s) => db.products.some((p) => p.sellerId === s.id)).map((s) => ({ value: s.id, label: s.businessName }))} />
      <ClearFilters active={filtersActive} onClear={clear} />
    </Toolbar>
  );
  const table =
    mode === "approvals" && approval === "pending" && !rows.length && !filtersActive ? (
      <EmptyState icon={PackageCheck} title="Approval queue is empty" description="No products are awaiting review." />
    ) : (
      <DataTable caption={mode === "approvals" ? "Product approval queue" : "Product catalogue"} rows={rows} columns={columns} getRowId={(p) => p.id} initialSort={mode === "approvals" ? { key: "submitted", direction: "asc" } : { key: "name", direction: "asc" }} resetKey={`${query}|${category}|${approval}|${listing}|${seller}`} />
    );

  return (
    <>
      <PageHeader
        title={mode === "approvals" ? "Product approvals" : "Products"}
        description={mode === "approvals" ? "Review submitted listings — images, variants, seller and certification record — then approve or reject." : "The marketplace catalogue with variants, stock, approval and listing moderation, product reports and low-stock alerts."}
        actions={mode === "all" ? <Link href="/admin/products/approvals" className={buttonVariants({ variant: "outline" })}><PackageCheck aria-hidden="true" />Approval queue ({db.products.filter((p) => p.approvalStatus === "pending").length})</Link> : undefined}
      />
      <DemoNotice>Products are demo records. No origin, freshness or certification claim is made unless a mock review record supports it, and nothing here changes the customer storefront.</DemoNotice>
      {mode === "approvals" ? (
        <Card>{toolbar}{table}</Card>
      ) : (
        <Tabs value={view} onValueChange={(v) => router.replace(v === "catalogue" ? "/admin/products" : `/admin/products?view=${v}`, { scroll: false })}>
          <TabsList aria-label="Product views">
            <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
            <TabsTrigger value="reports">Product reports ({db.productReports.filter((r) => r.status === "open").length} open)</TabsTrigger>
            <TabsTrigger value="low-stock">Low-stock alerts ({db.inventoryAlerts.filter((a) => a.status === "open").length})</TabsTrigger>
          </TabsList>
          <TabsContent value="catalogue"><Card>{toolbar}{table}</Card></TabsContent>
          <TabsContent value="reports"><ReportsTab onOpen={setSelectedId} /></TabsContent>
          <TabsContent value="low-stock"><AlertsTab onOpen={setSelectedId} /></TabsContent>
        </Tabs>
      )}
      <ProductDetailDrawer db={db} productId={selectedId} onClose={() => setSelectedId(null)} run={run} confirm={confirm} />
      {confirmDialog}
    </>
  );
}

function ReportsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { db, run, confirm, confirmDialog } = useAdmin();
  const [status, setStatus] = React.useState("open");
  const [product, setProduct] = React.useState("");
  const [seller, setSeller] = React.useState("");
  const rows = db.productReports.filter((r) => (!status || r.status === status) && (!product || r.productId === product) && (!seller || byId(db.products, r.productId)?.sellerId === seller));
  const close = (r: ProductReport, next: "resolved" | "dismissed") =>
    confirm({
      title: `${next === "resolved" ? "Resolve" : "Dismiss"} report ${r.id}?`,
      description: next === "resolved" ? "Mark the report as handled. Unlisting the product, if needed, is a separate moderation action." : "Close the report without action.",
      confirmLabel: next === "resolved" ? "Resolve report" : "Dismiss report",
      reason: { label: "Resolution note", placeholder: "What was done or why it was dismissed" },
      onConfirm: (note) => run(resolveProductReport, { reportId: r.id, status: next, note }),
    });
  const columns: Column<ProductReport>[] = [
    { key: "product", header: "Product", sortValue: (r) => byId(db.products, r.productId)?.name, cell: (r) => <RowLink onClick={() => onOpen(r.productId)} sub={r.id}>{byId(db.products, r.productId)?.name}</RowLink> },
    { key: "reason", header: "Reason", cell: (r) => <span className="line-clamp-2 max-w-xs">{r.reason}</span> },
    { key: "reported", header: "Reported", sortValue: (r) => r.reportedAt, cell: (r) => formatDate(r.reportedAt) },
    { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge domain="report" value={r.status} /> },
    {
      key: "actions", header: "Actions", srOnlyHeader: true, align: "right",
      cell: (r) => r.status === "open" ? (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => close(r, "resolved")}>Resolve</Button>
          <Button size="sm" variant="ghost" onClick={() => close(r, "dismissed")}>Dismiss</Button>
        </div>
      ) : <span className="text-xs text-muted-foreground">{r.resolutionNote}</span>,
    },
  ];
  return (
    <Card title="Product reports" description="Reports raised by customers about listings.">
      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("report").filter((o) => o.value !== "actioned")} />
        <FilterSelect label="Product" value={product} onChange={setProduct} options={db.products.filter((p) => db.productReports.some((r) => r.productId === p.id)).map((p) => ({ value: p.id, label: p.name }))} />
        <FilterSelect label="Seller" value={seller} onChange={setSeller} options={db.sellers.filter((s) => db.products.some((p) => p.sellerId === s.id)).map((s) => ({ value: s.id, label: s.businessName }))} />
        <ClearFilters active={Boolean(product || seller || status !== "open")} onClear={() => { setStatus("open"); setProduct(""); setSeller(""); }} />
      </Toolbar>
      <DataTable caption="Product reports" rows={rows} columns={columns} getRowId={(r) => r.id} initialSort={{ key: "reported", direction: "desc" }} resetKey={`${status}|${product}|${seller}`} emptyTitle="No reports" emptyDescription="No product reports match this filter." />
      {confirmDialog}
    </Card>
  );
}

function AlertsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { db, act } = useAdmin();
  const [status, setStatus] = React.useState("open");
  const [seller, setSeller] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [stock, setStock] = React.useState("");
  const rows = db.inventoryAlerts.filter((a) => {
    const product = byId(db.products, a.productId);
    const current = product?.variants.find((v) => v.id === a.variantId)?.stock ?? 0;
    if (stock === "out" && current > 0) return false;
    if (stock === "in" && current === 0) return false;
    return (!status || a.status === status) && (!seller || product?.sellerId === seller) && (!category || product?.categoryId === category);
  });
  const columns: Column<InventoryAlert>[] = [
    { key: "product", header: "Product", sortValue: (a) => byId(db.products, a.productId)?.name, cell: (a) => <RowLink onClick={() => onOpen(a.productId)} sub={byId(db.sellers, byId(db.products, a.productId)?.sellerId)?.businessName}>{byId(db.products, a.productId)?.name}</RowLink> },
    { key: "variant", header: "Variant", cell: (a) => byId(db.products, a.productId)?.variants.find((v) => v.id === a.variantId)?.label },
    { key: "raised", header: "Stock when raised", align: "right", sortValue: (a) => a.stockAtAlert, cell: (a) => a.stockAtAlert },
    { key: "current", header: "Current stock", align: "right", cell: (a) => byId(db.products, a.productId)?.variants.find((v) => v.id === a.variantId)?.stock },
    { key: "date", header: "Raised", sortValue: (a) => a.raisedAt, cell: (a) => formatDate(a.raisedAt) },
    { key: "status", header: "Status", cell: (a) => <StatusBadge domain="alert" value={a.status} /> },
    { key: "ack", header: "Acknowledge", srOnlyHeader: true, align: "right", cell: (a) => a.status === "open" ? <Button size="sm" variant="outline" onClick={() => act(acknowledgeInventoryAlert, { alertId: a.id })}>Acknowledge</Button> : null },
  ];
  return (
    <Card title="Low-stock alerts" description="Alerts as raised by the (mock) inventory feed.">
      <div className="mb-4"><NeedsClarification refId="Q-STOCK">The stock threshold that raises a low-stock alert is not specified, so this demo shows the alerts recorded in the fixtures instead of calculating its own.</NeedsClarification></div>
      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions("alert")} />
        <FilterSelect label="Seller" value={seller} onChange={setSeller} options={db.sellers.filter((s) => db.products.some((p) => p.sellerId === s.id)).map((s) => ({ value: s.id, label: s.businessName }))} />
        <FilterSelect label="Category" value={category} onChange={setCategory} options={db.categories.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect label="Current stock" value={stock} onChange={setStock} options={[{ value: "out", label: "Out of stock" }, { value: "in", label: "Still in stock" }]} allLabel="Any" />
        <ClearFilters active={Boolean(seller || category || stock || status !== "open")} onClear={() => { setStatus("open"); setSeller(""); setCategory(""); setStock(""); }} />
      </Toolbar>
      <DataTable caption="Low-stock alerts" rows={rows} columns={columns} getRowId={(a) => a.id} initialSort={{ key: "raised", direction: "asc" }} resetKey={`${status}|${seller}|${category}|${stock}`} emptyTitle="No alerts" emptyDescription="No low-stock alerts match this filter." />
    </Card>
  );
}
