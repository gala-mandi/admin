import type { Role } from "@/features/auth/types";

/**
 * What a role may see in the admin panel. Only for showing/hiding UI: the
 * server checks every request again (`RolesGuard`).
 */
export const permissions = [
  "dashboard:view",
  "shops:manage",
  "plans:manage",
  "users:manage",
  "audit:view",
  "settings:manage",
] as const;

export type Permission = (typeof permissions)[number];

const byRole: Record<Role, readonly Permission[]> = {
  super_admin: permissions,
  // Shop roles never get into the admin panel.
  owner: [],
  manager: [],
  operator: [],
};

export function can(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return byRole[role].includes(permission);
}
