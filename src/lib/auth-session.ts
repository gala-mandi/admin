import type { Session, User } from "@/features/auth/types";
import { toApiError } from "@/lib/api-error";
import { hardRedirect } from "@/lib/navigation";
import { getQueryClient } from "@/lib/query-client";
import { isPublicPath } from "@/lib/routes";
import { useSessionStore } from "@/stores/session";

/** Login page explaining that a shop account can't use the admin panel. */
export const notAdminPath = "/login?reason=not-admin";

/**
 * 403 codes that end the session. Only shop users belong to a tenant, so a
 * suspended shop means a shop account: show the "not an admin" message.
 */
export const blockedPages = {
  ACCOUNT_DISABLED: "/account-disabled",
  TENANT_SUSPENDED: notAdminPath,
} as const;

export type BlockedCode = keyof typeof blockedPages;

export function blockedPageFor(code: string | undefined): string | null {
  if (code && code in blockedPages) return blockedPages[code as BlockedCode];
  return null;
}

/** Thrown when a valid login/refresh belongs to a shop user. */
export class NotSuperAdminError extends Error {
  constructor() {
    super("Only super_admin can sign in to the admin panel");
    this.name = "NotSuperAdminError";
  }
}

/**
 * Stores a session from login or refresh (memory only). Only `super_admin`
 * is accepted. A shop user's session is dropped from memory WITHOUT calling
 * `/auth/logout`: the refresh cookie is shared with the shop panel on the
 * same host, and logging out here would sign them out there too.
 */
export function startSession(session: Session): Session {
  if (session.user.role !== "super_admin") {
    useSessionStore.getState().clear();
    throw new NotSuperAdminError();
  }
  useSessionStore.getState().setSession(session);
  return session;
}

/** Where to go right after a successful sign-in. */
export function homePathFor(user: User, next: string | null): string {
  if (user.mustChangePassword) return "/change-password";
  return next ?? "/dashboard";
}

/** Clears everything the browser knows about the user. */
export function clearSession(): void {
  useSessionStore.getState().clear();
  getQueryClient().clear();
}

/**
 * Called when the session cannot be restored (refresh failed, the account is
 * blocked, or it is not a super-admin). Clears the session and leaves the page.
 */
export function handleAuthFailure(error: unknown): void {
  clearSession();

  if (error instanceof NotSuperAdminError) {
    hardRedirect(notAdminPath);
    return;
  }

  const blocked = blockedPageFor(toApiError(error).code);
  if (blocked) {
    hardRedirect(blocked);
    return;
  }

  const params = new URLSearchParams({ reason: "session-expired" });
  const { pathname, search } = window.location;
  if (!isPublicPath(pathname)) params.set("next", pathname + search);
  hardRedirect(`/login?${params.toString()}`);
}
