"use client";

import type { ReactNode } from "react";
import { can, type Permission } from "@/lib/can";
import { selectRole, useSessionStore } from "@/stores/session";
import { ForbiddenState } from "./status-pages";

/**
 * Renders the page only for roles with `permission`, otherwise the 403 state.
 * UI only: the server checks every request again.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const role = useSessionStore(selectRole);
  if (!can(role, permission)) return <ForbiddenState />;
  return children;
}
