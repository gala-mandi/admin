import type { TenantStatus } from "@/features/auth/types";
import type { ListResponse } from "@/lib/list-query";

/** Shapes of the shop (tenant) admin API (see the tenants contract). */
export type { TenantStatus };

export const tenantStatuses = [
  "trial",
  "active",
  "suspended",
  "cancelled",
] as const satisfies readonly TenantStatus[];

export const tenantSorts = [
  "-createdAt",
  "createdAt",
  "name",
  "-name",
] as const;
export type TenantSort = (typeof tenantSorts)[number];

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  /** Shop phone. */
  phone: string;
  ownerName: string;
  status: TenantStatus;
  /** Active (not deleted) users of the shop. */
  userCount: number;
  /** ISO timestamp. */
  createdAt: string;
  /** Current plan, end date and access state; `null` without a plan. */
  subscription?: SubscriptionBrief | null;
}

/**
 * What a shop may do today (Pakistan date): `active` until the end date,
 * `grace` for the grace days after it (full access, warned), then
 * `read_only` (view and print only).
 */
export const accessStates = ["active", "grace", "read_only"] as const;
export type AccessState = (typeof accessStates)[number];

export interface SubscriptionBrief {
  planName: string;
  /** `YYYY-MM-DD`, last day with full access. */
  endsOn: string;
  state: AccessState;
  daysLeft: number;
}

export interface SubscriptionView {
  id: string;
  plan: {
    id: string;
    name: string;
    maxUsers: number;
    maxBranches: number;
    priceMonthly: string;
  };
  /** Calendar days `YYYY-MM-DD` (Pakistan). */
  startsOn: string;
  endsOn: string;
  graceDays: number;
  /** Last day before read-only mode. */
  graceEndsOn: string;
  status: "active" | "expired" | "cancelled";
  state: AccessState;
  /** Days until `endsOn` (0 on the last day). */
  daysLeft: number;
  graceDaysLeft: number;
  /** Active users plus invites not yet accepted. */
  usersUsed: number;
}

export interface AssignSubscriptionInput {
  planId: string;
  startsOn?: string;
  endsOn: string;
  graceDays: number;
}

export interface ExtendSubscriptionInput {
  endsOn: string;
}

export interface TenantOwner {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface TenantDetail extends Omit<TenantSummary, "subscription"> {
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  updatedAt: string;
  owner: TenantOwner | null;
  /** The shop's current plan; `null` when it has none. */
  subscription?: SubscriptionView | null;
}

export interface TenantListParams {
  page: number;
  limit: number;
  search?: string;
  status?: TenantStatus;
  sort?: TenantSort;
}

export type TenantList = ListResponse<TenantSummary>;

export interface CreateTenantInput {
  name: string;
  city?: string;
  address?: string;
  phone: string;
  email?: string;
  owner: { name: string; phone: string; email?: string };
}

export interface CreateTenantResult {
  tenant: TenantDetail;
  /** The owner's one-time password. Shown once, never stored. */
  temporaryPassword: string;
}

/** `null` clears an optional field. */
export interface UpdateTenantInput {
  name?: string;
  city?: string | null;
  address?: string | null;
  phone?: string;
  email?: string | null;
  logoUrl?: string | null;
}
