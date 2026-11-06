import { accessStateText, tenantStatusText } from "./text";
import type { AccessState, TenantStatus } from "./types";

/** Chart-view hints shared by the shop tables (`meta.chart`). */

/** Status colours carry meaning, so the chart uses the status tokens. */
export const statusChartColors: Record<TenantStatus, string> = {
  active: "--success",
  trial: "--primary",
  suspended: "--destructive",
  cancelled: "--chart-other",
};

/** Chart view: group by status in the status cards' order, coloured. */
export const statusChartMeta = {
  group: "category",
  groupLabel: (key: string) => tenantStatusText[key as TenantStatus] ?? key,
  order: ["active", "trial", "suspended", "cancelled"] as const,
  colors: statusChartColors,
} as const;

/** Chart view: group by city, "Okara " and "Okara" being one city. */
export const cityChartMeta = {
  group: "category",
  value: (row: { city: string | null }) => row.city?.trim() || null,
} as const;

/** Chart view: group shops by their plan's state today (no plan = "none"). */
export const planStateChartMeta = {
  group: "category",
  value: (row: { subscription?: { state: AccessState } | null }) =>
    row.subscription?.state ?? null,
  groupLabel: (key: string) => accessStateText[key as AccessState] ?? key,
  order: ["active", "grace", "read_only"] as const,
  colors: {
    active: "--success",
    grace: "--notice",
    read_only: "--destructive",
  } satisfies Record<AccessState, string>,
} as const;
