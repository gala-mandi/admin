import type {
  ActivityFeed,
  ActivityItem,
  InactiveShop,
  InactiveShopPage,
  NewShops,
  PlatformStats,
} from "./types";

export function platformStats(
  over: Partial<PlatformStats> = {},
): PlatformStats {
  return {
    shops: {
      total: 1240,
      trial: 300,
      active: 860,
      suspended: 60,
      cancelled: 20,
    },
    users: { total: 5321, active: 4980 },
    ...over,
  };
}

/** Twelve months ending Nov 2026, with `counts` (default one per month). */
export function newShops(counts?: number[]): NewShops {
  const values = counts ?? Array.from({ length: 12 }, () => 1);
  return {
    data: values.map((count, i) => {
      const date = new Date(Date.UTC(2026, 10 - (values.length - 1 - i), 1));
      return { month: date.toISOString().slice(0, 7), count };
    }),
  };
}

export function activityItem(over: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 101,
    tenant: { id: "t1", name: "Demo Mandi" },
    user: { id: "u1", name: "Haji Aslam", role: "owner" },
    entity: "traders",
    entityId: "e1",
    action: "update",
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...over,
  };
}

export const activityFeed = (items: ActivityItem[]): ActivityFeed => ({
  data: items,
});

export function inactiveShop(over: Partial<InactiveShop> = {}): InactiveShop {
  return {
    id: "t9",
    name: "Quiet Traders",
    city: "Okara",
    status: "trial",
    lastActivityAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    ...over,
  };
}

export function inactivePage(
  rows: InactiveShop[],
  total = rows.length,
  page = 1,
  limit = 10,
): InactiveShopPage {
  return { data: rows, meta: { page, limit, total } };
}
