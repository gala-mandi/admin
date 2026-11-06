import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toApiError } from "@/lib/api-error";
import {
  getActivity,
  getInactiveShops,
  getNewShops,
  getPlatformStats,
} from "./api";
import type { InactiveShopsParams } from "./types";

/** Months in the new-shops chart, this month included. */
export const NEW_SHOPS_MONTHS = 12;
/** Rows in the recent activity feed. */
export const ACTIVITY_LIMIT = 20;
/**
 * Changes read for the activity charts (the endpoint's maximum). The feed
 * shows the newest `ACTIVITY_LIMIT` of the same response: one request.
 */
export const ACTIVITY_ANALYTICS_LIMIT = 100;
/** Rows per page of the inactive shops table. */
export const INACTIVE_SHOPS_PAGE_SIZE = 10;

/** Platform counts move slowly; a minute old is fresh enough. */
const STATS_STALE_TIME = 60_000;
/** The feed is the part that changes; refresh it sooner. */
const ACTIVITY_STALE_TIME = 15_000;

export const statsKeys = {
  all: ["stats"] as const,
  summary: () => [...statsKeys.all, "summary"] as const,
  newShops: (months: number) =>
    [...statsKeys.all, "new-shops", months] as const,
  activity: (limit: number) => [...statsKeys.all, "activity", limit] as const,
  inactiveShops: (params: InactiveShopsParams) =>
    [...statsKeys.all, "inactive-shops", params] as const,
};

/** 403 won't change on a retry. */
function retryUnlessForbidden(failureCount: number, error: unknown) {
  if (toApiError(error).status === 403) return false;
  return failureCount < 1;
}

/** `GET /admin/stats`: shops by status and user counts. */
export function usePlatformStats() {
  return useQuery({
    queryKey: statsKeys.summary(),
    queryFn: ({ signal }) => getPlatformStats(signal),
    staleTime: STATS_STALE_TIME,
    retry: retryUnlessForbidden,
  });
}

/** `GET /admin/stats/new-shops`. */
export function useNewShops(months = NEW_SHOPS_MONTHS) {
  return useQuery({
    queryKey: statsKeys.newShops(months),
    queryFn: ({ signal }) => getNewShops(months, signal),
    staleTime: STATS_STALE_TIME,
    retry: retryUnlessForbidden,
  });
}

/** `GET /admin/stats/activity`. */
export function useActivity(limit = ACTIVITY_LIMIT) {
  return useQuery({
    queryKey: statsKeys.activity(limit),
    queryFn: ({ signal }) => getActivity(limit, signal),
    staleTime: ACTIVITY_STALE_TIME,
    retry: retryUnlessForbidden,
  });
}

/** `GET /admin/stats/inactive-shops`; keeps the page on screen while the next loads. */
export function useInactiveShops(params: InactiveShopsParams) {
  return useQuery({
    queryKey: statsKeys.inactiveShops(params),
    queryFn: ({ signal }) => getInactiveShops(params, signal),
    placeholderData: keepPreviousData,
    staleTime: STATS_STALE_TIME,
    retry: retryUnlessForbidden,
  });
}
