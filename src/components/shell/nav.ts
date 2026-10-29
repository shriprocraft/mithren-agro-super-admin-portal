import {
  ArrowLeftRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileStack,
  FileText,
  FolderKanban,
  FolderTree,
  HandCoins,
  History,
  Landmark,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Package,
  PackageCheck,
  Percent,
  PieChart,
  ScrollText,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Star,
  Store,
  TicketPercent,
  Truck,
  Undo2,
  UserRoundCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type BadgeKey = "pendingSellers" | "pendingProducts" | "requestedRefunds" | "openTickets" | "openApplications" | "contributionsToVerify" | "pendingAllocations";

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

const INV = "/admin/investments";

// Every route required by the scope (§7) appears exactly once; investment routes are a separate group.
export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Marketplace operations",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/sellers", label: "Sellers", icon: Store },
      { href: "/admin/sellers/approvals", label: "Seller approvals", icon: ClipboardCheck, badge: "pendingSellers", parent: "/admin/sellers" },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/products/approvals", label: "Product approvals", icon: PackageCheck, badge: "pendingProducts", parent: "/admin/products" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/refunds", label: "Refunds", icon: Undo2, badge: "requestedRefunds" },
      { href: "/admin/commissions", label: "Commissions", icon: Percent },
      { href: "/admin/settlements", label: "Settlements", title: "Seller settlements", icon: Landmark },
      { href: "/admin/delivery", label: "Delivery", icon: Truck },
      { href: "/admin/coupons", label: "Promotions", icon: TicketPercent },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/support", label: "Support", icon: LifeBuoy, badge: "openTickets" },
      { href: "/admin/content", label: "Content", icon: FileText },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Investment management",
    items: [
      { href: INV, label: "Investment overview", icon: PieChart },
      { href: `${INV}/investors`, label: "Investors", icon: UserRoundCheck, parent: INV },
      { href: `${INV}/applications`, label: "Investor applications", icon: ClipboardList, badge: "openApplications", parent: INV },
      { href: `${INV}/plans`, label: "Investment plans", icon: HandCoins, parent: INV },
      { href: `${INV}/sectors`, label: "Agricultural sectors", icon: Layers, parent: INV },
      { href: `${INV}/projects`, label: "Project portfolio", icon: Sprout, parent: INV },
      { href: `${INV}/participations`, label: "Participations", title: "Investment participations", icon: FolderKanban, parent: INV },
      { href: `${INV}/transactions`, label: "Contributions", title: "Contributions & transactions", icon: ArrowLeftRight, badge: "contributionsToVerify", parent: INV },
      { href: `${INV}/allocations`, label: "Project allocations", icon: ListChecks, badge: "pendingAllocations", parent: INV },
      { href: `${INV}/payouts`, label: "Returns & payouts", icon: Wallet, parent: INV },
      { href: `${INV}/reports`, label: "Investment reports", icon: BarChart3, parent: INV },
      { href: `${INV}/documents`, label: "Investment documents", icon: FileStack, parent: INV },
      { href: `${INV}/audit`, label: "Investment audit trail", icon: History, parent: INV },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/staff", label: "Staff & permissions", icon: ShieldCheck },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: `${INV}/settings`, label: "Investment rules", title: "Investment rules & settings", icon: SlidersHorizontal, parent: "/admin/settings" },
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
