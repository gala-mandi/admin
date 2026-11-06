import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toApiError } from "@/lib/api-error";
import { createPlan, listPlans, removePlan, updatePlan } from "./api";
import type { Plan, PlanInput, PlanList, PlanListParams } from "./types";

export const planKeys = {
  all: ["plans"] as const,
  lists: () => [...planKeys.all, "list"] as const,
  list: (params: PlanListParams) => [...planKeys.lists(), params] as const,
};

/** Plans change rarely: half a minute old is fresh enough. */
const PLANS_STALE_TIME = 30_000;

function retryUnlessClientError(failureCount: number, error: unknown) {
  const { status } = toApiError(error);
  if (status === 403 || status === 404) return false;
  return failureCount < 1;
}

/** `GET /admin/plans`; keeps the rows on screen while a new page loads. */
export function usePlans(params: PlanListParams) {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: ({ signal }) => listPlans(params, signal),
    placeholderData: keepPreviousData,
    staleTime: PLANS_STALE_TIME,
    retry: retryUnlessClientError,
  });
}

/** Every active plan, for the "Assign plan" picker. */
export function useActivePlans({ enabled = true } = {}) {
  return usePlansQuery({ page: 1, limit: 100, isActive: "true" }, enabled);
}

function usePlansQuery(params: PlanListParams, enabled: boolean) {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: ({ signal }) => listPlans(params, signal),
    staleTime: PLANS_STALE_TIME,
    retry: retryUnlessClientError,
    enabled,
  });
}

/**
 * Puts a saved plan into every cached list at once (no blank table), then
 * refetches in the background so sorting, filters and counts catch up.
 */
function storePlan(queryClient: QueryClient, plan: Plan, isNew = false) {
  queryClient.setQueriesData<PlanList>(
    { queryKey: planKeys.lists() },
    (list) => {
      if (!list) return list;
      const found = list.data.some((p) => p.id === plan.id);
      if (found) {
        return {
          ...list,
          data: list.data.map((p) => (p.id === plan.id ? plan : p)),
        };
      }
      if (!isNew || list.meta.page !== 1) return list;
      return {
        data: [plan, ...list.data],
        meta: { ...list.meta, total: list.meta.total + 1 },
      };
    },
  );
  return queryClient.invalidateQueries({ queryKey: planKeys.lists() });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanInput) => createPlan(input),
    onSuccess: (plan) => storePlan(queryClient, plan, true),
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PlanInput>) => updatePlan(id, input),
    onSuccess: (plan) => storePlan(queryClient, plan),
  });
}

/** `PATCH` any plan by id (row actions such as "Turn on"). */
export function useUpdatePlanById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PlanInput> }) =>
      updatePlan(id, input),
    onSuccess: (plan) => storePlan(queryClient, plan),
  });
}

export function useRemovePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) => removePlan(plan.id),
    onSuccess: (removed) => {
      if (removed.result === "deactivated") {
        return storePlan(queryClient, removed.plan);
      }
      queryClient.setQueriesData<PlanList>(
        { queryKey: planKeys.lists() },
        (list) =>
          list && {
            data: list.data.filter((p) => p.id !== removed.plan.id),
            meta: { ...list.meta, total: Math.max(0, list.meta.total - 1) },
          },
      );
      return queryClient.invalidateQueries({ queryKey: planKeys.lists() });
    },
  });
}
