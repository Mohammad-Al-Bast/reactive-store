import { FolderTree, Inbox, LayoutDashboard, Package, ShoppingBag, type LucideIcon } from "lucide-react";

export type AdminSection = { href: string; title: string; icon: LucideIcon; exact?: boolean };

/** The panel's sections, in sidebar order. Also gives the header its page title. */
export const adminSections: AdminSection[] = [
  { href: "/", title: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/orders", title: "Orders", icon: ShoppingBag },
  { href: "/enquiries", title: "Enquiries", icon: Inbox },
  { href: "/products", title: "Products", icon: Package },
  { href: "/departments", title: "Departments", icon: FolderTree },
];

export function isActive(section: AdminSection, pathname: string | null | undefined) {
  if (!pathname) return false;
  return section.exact ? pathname === section.href : pathname.startsWith(section.href);
}

export function sectionFor(pathname: string | null | undefined) {
  return adminSections.find((s) => isActive(s, pathname));
}
