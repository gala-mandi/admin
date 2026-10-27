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
