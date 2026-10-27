import {
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  ScrollText,
  Settings,
  Store,
  Users,
} from "lucide-react";
import type { Role } from "@/features/auth/types";
import { can, type Permission } from "@/lib/can";
import { type PanelSection, panelRoutes } from "@/lib/routes";
import { panelText } from "./text";

export interface MenuItem {
  key: PanelSection;
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
}

const item = (
  key: PanelSection,
  icon: LucideIcon,
  permission: Permission,
): MenuItem => ({
  key,
  label: panelText.sections[key].label,
  href: panelRoutes[key],
  icon,
  permission,
});

/** The admin panel menu; each item is shown only to roles with its permission. */
export const menuItems: readonly MenuItem[] = [
  item("dashboard", LayoutDashboard, "dashboard:view"),
  item("shops", Store, "shops:manage"),
  item("plans", CreditCard, "plans:manage"),
  item("users", Users, "users:manage"),
  item("auditLogs", ScrollText, "audit:view"),
  item("settings", Settings, "settings:manage"),
];

/** Permission needed to open each panel page. */
export const sectionPermission = Object.fromEntries(
  menuItems.map((m) => [m.key, m.permission]),
) as Record<PanelSection, Permission>;

export function menuFor(role: Role | null | undefined): MenuItem[] {
  return menuItems.filter((m) => can(role, m.permission));
}
