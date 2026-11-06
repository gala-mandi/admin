import { api } from "@/lib/api";
import type {
  CreateTenantInput,
  CreateTenantResult,
  TenantDetail,
  TenantList,
  TenantListParams,
  UpdateTenantInput,
} from "./types";

const base = "/admin/tenants";
const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

export async function listTenants(
  params: TenantListParams,
  signal?: AbortSignal,
): Promise<TenantList> {
  const { data } = await api.get<TenantList>(base, { params, signal });
  return data;
}

export async function getTenant(
  id: string,
  signal?: AbortSignal,
): Promise<TenantDetail> {
  const { data } = await api.get<TenantDetail>(one(id), { signal });
  return data;
}

export async function createTenant(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  const { data } = await api.post<CreateTenantResult>(base, input);
  return data;
}

export async function updateTenant(
  id: string,
  input: UpdateTenantInput,
): Promise<TenantDetail> {
  const { data } = await api.patch<TenantDetail>(one(id), input);
  return data;
}

export async function suspendTenant(id: string): Promise<TenantDetail> {
  const { data } = await api.post<TenantDetail>(`${one(id)}/suspend`);
  return data;
}

export async function activateTenant(id: string): Promise<TenantDetail> {
  const { data } = await api.post<TenantDetail>(`${one(id)}/activate`);
  return data;
}

/** Rows per request when reading every shop (the server's maximum). */
export const ALL_TENANTS_PAGE_SIZE = 100;
/** Stop after this many pages (10 × 100 shops) to keep the load bounded. */
export const ALL_TENANTS_MAX_PAGES = 10;

export interface AllTenants {
  rows: TenantList["data"];
  /** Shops on the server that match. */
  total: number;
  /** More shops match than were read (`ALL_TENANTS_MAX_PAGES` reached). */
  truncated: boolean;
}

/**
 * Every shop that matches `params`, read page by page (one request at a time
 * so the server isn't hit with a burst). For charts over a whole list.
 */
export async function listAllTenants(
  params: Omit<TenantListParams, "page" | "limit">,
  signal?: AbortSignal,
): Promise<AllTenants> {
  const limit = ALL_TENANTS_PAGE_SIZE;
  const first = await listTenants({ ...params, page: 1, limit }, signal);
  const pages = Math.min(
    Math.ceil(first.meta.total / limit),
    ALL_TENANTS_MAX_PAGES,
  );
  const rows = [...first.data];
  for (let page = 2; page <= pages; page++) {
    const next = await listTenants({ ...params, page, limit }, signal);
    rows.push(...next.data);
    if (next.data.length < limit) break;
  }
  return {
    rows,
    total: first.meta.total,
    truncated: first.meta.total > rows.length,
  };
}
