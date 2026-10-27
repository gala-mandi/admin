import type { TenantStatus } from "@/features/auth/types";

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
}

export interface TenantOwner {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface TenantDetail extends TenantSummary {
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  updatedAt: string;
  owner: TenantOwner | null;
}

export interface TenantListParams {
  page: number;
  limit: number;
  search?: string;
  status?: TenantStatus;
  sort?: TenantSort;
}

export interface TenantList {
  data: TenantSummary[];
  meta: { page: number; limit: number; total: number };
}

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
