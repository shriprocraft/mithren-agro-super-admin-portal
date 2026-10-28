import type { Metadata } from "next";
import { DeliveryView } from "@/components/delivery/delivery-view";

export const metadata: Metadata = { title: "Delivery" };

export default function DeliveryPage() {
  return <DeliveryView />;
}
