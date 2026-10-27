/** Pages that never need a session (used by `proxy.ts` and the client). */
export const publicPaths = ["/", "/login", "/account-disabled"] as const;

/**
 * Pages of the logged-in panel (`src/app/(admin)/`). Not in `publicPaths`, so
 * `proxy.ts` protects them; `AuthGuard` checks the session on the client.
 */
export const panelRoutes = {
  dashboard: "/dashboard",
  shops: "/shops",
  plans: "/plans",
  users: "/users",
  auditLogs: "/audit-logs",
  settings: "/settings",
} as const;

export type PanelSection = keyof typeof panelRoutes;

/** Pages below Shops. `new` is a fixed segment, so it never matches `[id]`. */
export const shopRoutes = {
  list: panelRoutes.shops,
  create: `${panelRoutes.shops}/new`,
  detail: (id: string) => `${panelRoutes.shops}/${encodeURIComponent(id)}`,
  edit: (id: string) => `${panelRoutes.shops}/${encodeURIComponent(id)}/edit`,
} as const;

export const panelPaths: readonly string[] = Object.values(panelRoutes);

export function isPublicPath(pathname: string): boolean {
  return (publicPaths as readonly string[]).includes(pathname);
}

/** True for a menu page and anything below it (`/shops/42`). */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
