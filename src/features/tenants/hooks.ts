import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toApiError } from "@/lib/api-error";
import {
  activateTenant,
  createTenant,
  getTenant,
  listTenants,
  suspendTenant,
  updateTenant,
} from "./api";
import type {
  CreateTenantInput,
  TenantDetail,
  TenantListParams,
  UpdateTenantInput,
} from "./types";

export const tenantKeys = {
  all: ["tenants"] as const,
  lists: () => [...tenantKeys.all, "list"] as const,
  list: (params: TenantListParams) => [...tenantKeys.lists(), params] as const,
  details: () => [...tenantKeys.all, "detail"] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

/** 403/404 won't change on a retry. */
function retryUnlessClientError(failureCount: number, error: unknown) {
  const { status } = toApiError(error);
  if (status === 403 || status === 404) return false;
  return failureCount < 1;
}

/** `GET /admin/tenants`; keeps the previous page on screen while the next loads. */
export function useTenants(params: TenantListParams) {
  return useQuery({
    queryKey: tenantKeys.list(params),
    queryFn: ({ signal }) => listTenants(params, signal),
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });
}

/** `GET /admin/tenants/:id`. */
export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: ({ signal }) => getTenant(id, signal),
    retry: retryUnlessClientError,
  });
}

function useStoreTenant() {
  const queryClient = useQueryClient();
  return (tenant: TenantDetail) => {
    queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant);
    return queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
  };
}

/**
 * `POST /admin/tenants`. The response holds the owner's temporary password,
 * so only the tenant goes into the query cache, and the mutation is dropped
 * from the mutation cache as soon as nothing observes it (`gcTime: 0`); call
 * `reset()` when the password has been shown.
 */
export function useCreateTenant() {
  const storeTenant = useStoreTenant();
  return useMutation({
    mutationFn: (input: CreateTenantInput) => createTenant(input),
    gcTime: 0,
    onSuccess: ({ tenant }) => storeTenant(tenant),
  });
}

/** `PATCH /admin/tenants/:id`. */
export function useUpdateTenant(id: string) {
  const storeTenant = useStoreTenant();
  return useMutation({
    mutationFn: (input: UpdateTenantInput) => updateTenant(id, input),
    onSuccess: storeTenant,
  });
}

export type TenantStatusAction = "suspend" | "activate";

/** `POST /admin/tenants/:id/suspend` or `/activate`. */
export function useTenantStatusAction(id: string) {
  const storeTenant = useStoreTenant();
  return useMutation({
    mutationFn: (action: TenantStatusAction) =>
      action === "suspend" ? suspendTenant(id) : activateTenant(id),
    onSuccess: storeTenant,
  });
}
