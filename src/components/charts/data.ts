import { APP_TIME_ZONE } from "@/lib/format";
import { chartText } from "./text";
import type { ChartCategory, ChartData } from "./types";

/**
 * Helpers that turn API rows into the chart data model. Counts only; values
 * stay plain integers (averages are rounded where they're made).
 */

export interface CategoricalPoint {
  key: string;
  label: string;
  value: number;
  colorVar?: string;
}

export interface CategoricalOptions {
  /** Name of the one series (tooltip and table header), e.g. "Shops". */
  seriesName: string;
  /** `desc` sorts biggest first (default); `none` keeps the given order. */
  sort?: "desc" | "none";
  /** Keep this many points; the rest fold into one "Other (n)" point. */
  max?: number;
  /** Keep only the first `top` points and drop the rest (a "top N"). */
  top?: number;
}

export const OTHER_KEY = "__other__";

/** Label → value data, sorted and folded as asked. */
export function categoricalData(
  points: CategoricalPoint[],
  { seriesName, sort = "desc", max, top }: CategoricalOptions,
): ChartData {
  let list =
    sort === "desc"
      ? [...points].sort(
          (a, b) => b.value - a.value || a.label.localeCompare(b.label),
        )
      : [...points];
  if (top !== undefined) list = list.slice(0, top);
  if (max !== undefined && list.length > max) {
    const rest = list.slice(max - 1);
    list = [
      ...list.slice(0, max - 1),
      {
        key: OTHER_KEY,
        label: chartText.other(rest.length),
        value: rest.reduce((sum, p) => sum + p.value, 0),
        colorVar: "--chart-other",
      },
    ];
  }
  return {
    shape: "categorical",
    categories: list.map(({ key, label, colorVar }) => ({
      key,
      label,
      colorVar,
    })),
    series: [
      { key: "value", name: seriesName, values: list.map((p) => p.value) },
    ],
  };
}

const karachiDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `2026-11-05T20:30:00Z` → `2026-11-06` (the day in Karachi). */
export function karachiDayKey(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : karachiDay.format(date);
}

/** `2026-11-05T20:30:00Z` → `2026-11` (the month in Karachi). */
export function karachiMonthKey(iso: string): string | null {
  return karachiDayKey(iso)?.slice(0, 7) ?? null;
}

const DAY_MS = 86_400_000;

/** Every `YYYY-MM-DD` from `from` to `to`, both included. */
export function daysBetween(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const out: string[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** Every `YYYY-MM` from `from` to `to`, both included. */
export function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  if (!fy || !fm || !ty || !tm) return [];
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/* Calendar keys are dates, not instants, so they're formatted in UTC. */
const dayShort = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const dayLong = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const monthShort = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  month: "short",
  year: "2-digit",
});
const monthLong = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const utc = (key: string) =>
  new Date(`${key.length === 7 ? `${key}-01` : key}T00:00:00Z`);

/** `2026-11-06` → `6 Nov`. */
export const dayLabel = (key: string) => dayShort.format(utc(key));
/** `2026-11-06` → `Fri, 6 Nov 2026`. */
export const dayLabelLong = (key: string) => dayLong.format(utc(key));
/** `2026-11` → `Nov 26`. */
export const monthLabel = (key: string) => monthShort.format(utc(key));
/** `2026-11` → `November 2026`. */
export const monthLabelLong = (key: string) => monthLong.format(utc(key));

/** Long tooltip label of a day or month category. */
export function calendarLabelLong(category: ChartCategory): string {
  return category.key.length === 7
    ? monthLabelLong(category.key)
    : dayLabelLong(category.key);
}
