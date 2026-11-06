import { api } from "@/lib/api";
import type {
  ActivityFeed,
  InactiveShopPage,
  InactiveShopsParams,
  NewShops,
  PlatformStats,
} from "./types";

const base = "/admin/stats";

export async function getPlatformStats(
  signal?: AbortSignal,
): Promise<PlatformStats> {
  const { data } = await api.get<PlatformStats>(base, { signal });
  return data;
}

export async function getNewShops(
  months: number,
  signal?: AbortSignal,
): Promise<NewShops> {
  const { data } = await api.get<NewShops>(`${base}/new-shops`, {
    params: { months },
    signal,
  });
  return data;
}

export async function getActivity(
  limit: number,
  signal?: AbortSignal,
): Promise<ActivityFeed> {
  const { data } = await api.get<ActivityFeed>(`${base}/activity`, {
    params: { limit },
    signal,
  });
  return data;
}

export async function getInactiveShops(
  params: InactiveShopsParams,
  signal?: AbortSignal,
): Promise<InactiveShopPage> {
  const { data } = await api.get<InactiveShopPage>(`${base}/inactive-shops`, {
    params,
    signal,
  });
  return data;
}
