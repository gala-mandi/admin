import {
  categoricalData,
  dayLabel,
  daysBetween,
  karachiDayKey,
  monthLabel,
} from "@/components/charts/data";
import type { ChartData } from "@/components/charts/types";
import type { TenantSummary } from "@/features/tenants/types";
import { tenantStatusText } from "@/features/tenants/text";
import { actionName, statsText } from "./text";
import type { ActivityItem, NewShopsMonth, PlatformStats } from "./types";

/**
 * API rows → chart data for the dashboard. Counts only; nothing here is
 * money.
 */

const t = statsText.analytics;

/** Most cities drawn; the rest fold into "Other (n)". */
export const CITY_CHART_MAX = 12;
/** Shops in the users-per-shop chart. */
export const USERS_TOP_N = 10;

/**
 * Status colours carry meaning (active = success, suspended = danger), so
 * the status chart uses the status tokens, not the categorical palette.
 */
const statusColorVar = {
  active: "--success",
  trial: "--primary",
  suspended: "--destructive",
  cancelled: "--chart-other",
} as const;

const statusOrder = ["active", "trial", "suspended", "cancelled"] as const;

export function shopsByStatusData(stats: PlatformStats): ChartData {
  return categoricalData(
    statusOrder.map((status) => ({
      key: status,
      label: tenantStatusText[status],
      value: stats.shops[status],
      colorVar: statusColorVar[status],
    })),
    { seriesName: t.status.series, sort: "none" },
  );
}

export function newShopsData(months: NewShopsMonth[]): ChartData {
  return {
    shape: "timeSeries",
    categories: months.map((m) => ({
      key: m.month,
      label: monthLabel(m.month),
    })),
    series: [
      {
        key: "shops",
        name: statsText.newShops.shops,
        values: months.map((m) => m.count),
      },
    ],
  };
}

const NO_CITY = "__none__";

export function shopsByCityData(shops: TenantSummary[]): ChartData {
  const counts = new Map<string, { label: string; value: number }>();
  for (const shop of shops) {
    const city = shop.city?.trim();
    // "Okara" and "okara " are the same city.
    const key = city ? city.toLocaleLowerCase("en") : NO_CITY;
    const entry = counts.get(key) ?? {
      label: city || t.cities.noCity,
      value: 0,
    };
    entry.value += 1;
    counts.set(key, entry);
  }
  return categoricalData(
    [...counts].map(([key, { label, value }]) => ({ key, label, value })),
    { seriesName: t.cities.series, max: CITY_CHART_MAX },
  );
}

export function usersPerShopData(
  shops: TenantSummary[],
  top = USERS_TOP_N,
): ChartData {
  return categoricalData(
    shops
      .filter((s) => s.userCount > 0)
      .map((s) => ({ key: s.id, label: s.name, value: s.userCount })),
    { seriesName: t.users.series, top },
  );
}

export function activityByActionData(items: ActivityItem[]): ChartData {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.action, (counts.get(item.action) ?? 0) + 1);
  }
  return categoricalData(
    [...counts].map(([action, value]) => ({
      key: action,
      label: actionName(action),
      value,
    })),
    { seriesName: t.actions.series },
  );
}

/**
 * Changes per Karachi day, one series per action (most frequent first), with
 * every day between the oldest and newest change, so quiet days show as 0.
 */
export function activityByDayData(items: ActivityItem[]): ChartData {
  const byDay = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  for (const item of items) {
    const day = karachiDayKey(item.createdAt);
    if (!day) continue;
    const perAction = byDay.get(day) ?? new Map<string, number>();
    perAction.set(item.action, (perAction.get(item.action) ?? 0) + 1);
    byDay.set(day, perAction);
    totals.set(item.action, (totals.get(item.action) ?? 0) + 1);
  }
  const keys = [...byDay.keys()].sort();
  const days = keys.length ? daysBetween(keys[0]!, keys.at(-1)!) : [];
  const actions = [...totals]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([action]) => action);
  return {
    shape: "timeSeries",
    categories: days.map((day) => ({ key: day, label: dayLabel(day) })),
    series: actions.map((action) => ({
      key: action,
      name: actionName(action),
      values: days.map((day) => byDay.get(day)?.get(action) ?? 0),
    })),
  };
}
