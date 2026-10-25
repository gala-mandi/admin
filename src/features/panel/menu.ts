import type { Role } from "@/features/auth/types";
import { can, type Permission } from "@/lib/can";

export interface MenuItem {
  key: string;
  label: string;
  permission: Permission;
  /** null until the page exists (added by later tickets). */
  href: string | null;
}

/** The admin panel menu; each item is shown only to roles with its permission. */
export const menuItems: readonly MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    permission: "dashboard:view",
    href: "/dashboard",
  },
  { key: "shops", label: "Shops", permission: "shops:manage", href: null },
  { key: "plans", label: "Plans", permission: "plans:manage", href: null },
  { key: "users", label: "Users", permission: "users:manage", href: null },
  { key: "audit", label: "Audit logs", permission: "audit:view", href: null },
  {
    key: "settings",
    label: "Settings",
    permission: "settings:manage",
    href: null,
  },
];

export function menuFor(role: Role | null | undefined): MenuItem[] {
  return menuItems.filter((item) => can(role, item.permission));
}
