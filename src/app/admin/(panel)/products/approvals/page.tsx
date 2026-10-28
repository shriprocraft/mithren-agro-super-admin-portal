import type { Metadata } from "next";
import { ProductsView } from "@/components/products/products-view";

export const metadata: Metadata = { title: "Product approvals" };

export default function ProductsApprovalsPage() {
  return <ProductsView mode="approvals" />;
}
