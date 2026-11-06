import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toApiError } from "@/lib/api-error";
import { planKeys } from "@/features/plans/hooks";
import {
  activateTenant,
  assignSubscription,
  extendSubscription,
  createTenant,
  getTenant,
  listAllTenants,
  listTenants,
  suspendTenant,
  updateTenant,
} from "./api";
import {
  type AssignSubscriptionInput,
  type CreateTenantInput,
  type ExtendSubscriptionInput,
  type SubscriptionView,
  type TenantDetail,
  type TenantList,
  type TenantListParams,
  type TenantStatus,
  tenantStatuses,
  type UpdateTenantInput,
} from "./types";

export const tenantKeys = {
  all: ["tenants"] as const,
  lists: () => [...tenantKeys.all, "list"] as const,
  list: (params: TenantListParams) => [...tenantKeys.lists(), params] as const,
  /** Every matching shop (all pages), for charts. */
  everyRow: (params: Omit<TenantListParams, "page" | "limit">) =>
    [...tenantKeys.lists(), "every-row", params] as const,
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

/** Charts over every shop: a minute old is fresh enough. */
const ALL_TENANTS_STALE_TIME = 60_000;

/**
 * Every shop matching `params` (all pages of `GET /admin/tenants`), for the
 * charts. Under `tenantKeys.lists()`, so creating or suspending a shop
 * refreshes it. `enabled: false` until a chart needs it.
 */
export function useAllTenants(
  params: Omit<TenantListParams, "page" | "limit"> = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: tenantKeys.everyRow(params),
    queryFn: ({ signal }) => listAllTenants(params, signal),
    staleTime: ALL_TENANTS_STALE_TIME,
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
    enabled,
  });
}

/** `all` (no status filter) or one status. */
export type TenantCountKey = "all" | TenantStatus;

export interface TenantCount {
  total: number | undefined;
  isPending: boolean;
  isError: boolean;
}

export const tenantCountKeys = [
  "all",
  ...tenantStatuses,
] as const satisfies readonly TenantCountKey[];

const countParams = (key: TenantCountKey): TenantListParams =>
  key === "all" ? { page: 1, limit: 1 } : { page: 1, limit: 1, status: key };

const selectTotal = (list: TenantList) => list.meta.total;

function combineCounts(
  results: UseQueryResult<number>[],
): Record<TenantCountKey, TenantCount> {
  return Object.fromEntries(
    tenantCountKeys.map((key, i) => [
      key,
      {
        total: results[i]?.data,
        isPending: results[i]?.isPending ?? true,
        isError: results[i]?.isError ?? false,
      },
    ]),
  ) as Record<TenantCountKey, TenantCount>;
}

/**
 * Platform-wide number of shops, in all and per status, for the overview
 * cards. No extra endpoint: one `GET /admin/tenants?limit=1[&status=]` each,
 * reading `meta.total`. Ignores the list's search on purpose. The keys sit
 * under `tenantKeys.lists()`, so creating or suspending a shop refreshes them.
 */
export function useTenantCounts(): Record<TenantCountKey, TenantCount> {
  return useQueries({
    queries: tenantCountKeys.map((key) => {
      const params = countParams(key);
      return {
        queryKey: tenantKeys.list(params),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listTenants(params, signal),
        select: selectTotal,
        retry: retryUnlessClientError,
      };
    }),
    combine: combineCounts,
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

/**
 * Puts the new subscription on the cached shop at once (the card never
 * blanks), then refreshes the shops list (plan column) and the plans list
 * (shops-on-plan counts) in the background.
 */
function useStoreSubscription(id: string) {
  const queryClient = useQueryClient();
  return (subscription: SubscriptionView) => {
    queryClient.setQueryData<TenantDetail>(tenantKeys.detail(id), (tenant) =>
      tenant ? { ...tenant, subscription } : tenant,
    );
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: planKeys.lists() }),
    ]);
  };
}

/** `POST /admin/tenants/:id/subscription`. */
export function useAssignSubscription(id: string) {
  const store = useStoreSubscription(id);
  return useMutation({
    mutationFn: (input: AssignSubscriptionInput) =>
      assignSubscription(id, input),
    onSuccess: store,
  });
}

/** `PATCH /admin/tenants/:id/subscription`. */
export function useExtendSubscription(id: string) {
  const store = useStoreSubscription(id);
  return useMutation({
    mutationFn: (input: ExtendSubscriptionInput) =>
      extendSubscription(id, input),
    onSuccess: store,
  });
}
