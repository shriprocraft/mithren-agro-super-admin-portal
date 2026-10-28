import {
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderTree,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Package,
  PackageCheck,
  Percent,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  TicketPercent,
  Truck,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type BadgeKey = "pendingSellers" | "pendingProducts" | "requestedRefunds" | "openTickets";

export interface NavItem {
  href: string;
  label: string;
  /** Page title shown in the header (defaults to label). */
  title?: string;
  icon: LucideIcon;
  badge?: BadgeKey;
  /** Parent route for breadcrumbs (e.g. approvals → sellers). */
  parent?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Every route required by the scope (§7) appears exactly once.
export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Marketplace",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/sellers", label: "Sellers", icon: Store },
      { href: "/admin/sellers/approvals", label: "Seller approvals", icon: ClipboardCheck, badge: "pendingSellers", parent: "/admin/sellers" },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/products/approvals", label: "Product approvals", icon: PackageCheck, badge: "pendingProducts", parent: "/admin/products" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
    ],
  },
  {
    label: "Orders & finance",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/refunds", label: "Refunds", icon: Undo2, badge: "requestedRefunds" },
      { href: "/admin/commissions", label: "Commissions", icon: Percent },
      { href: "/admin/settlements", label: "Settlements", title: "Seller settlements", icon: Landmark },
      { href: "/admin/delivery", label: "Delivery", icon: Truck },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/admin/coupons", label: "Promotions", icon: TicketPercent },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/support", label: "Support", icon: LifeBuoy, badge: "openTickets" },
      { href: "/admin/content", label: "Content", icon: FileText },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/staff", label: "Staff & permissions", icon: ShieldCheck },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.href === pathname);
}

/** The nav item to highlight: exact match first, otherwise the longest matching prefix. */
export function activeHref(pathname: string): string | undefined {
  if (findNavItem(pathname)) return pathname;
  return NAV_ITEMS.filter((i) => i.href !== "/admin" && pathname.startsWith(`${i.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function breadcrumbsFor(pathname: string): { href: string; label: string }[] {
  const crumbs = [{ href: "/admin", label: "Super Admin" }];
  const item = findNavItem(activeHref(pathname) ?? "");
  if (!item) return crumbs;
  if (item.href === "/admin") return [...crumbs, { href: item.href, label: item.label }];
  const parent = item.parent ? findNavItem(item.parent) : undefined;
  if (parent) crumbs.push({ href: parent.href, label: parent.label });
  crumbs.push({ href: item.href, label: item.label });
  return crumbs;
}
