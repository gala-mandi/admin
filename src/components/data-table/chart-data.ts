import type { RowData } from "@tanstack/react-table";
import {
  categoricalData,
  dayLabel,
  daysBetween,
  karachiDayKey,
  karachiMonthKey,
  monthLabel,
  monthsBetween,
} from "@/components/charts/data";
import type { ChartData } from "@/components/charts/types";
import type { ChartGroupColumn, ChartMeasureColumn } from "./columns";
import { dataTableText } from "./text";

const t = dataTableText.chart;

/**
 * "Group by" / "Measure" maths of the DataTable chart view. Counts and plain
 * numbers only (never money): a sum adds finite numbers, an average is the
 * sum over the rows that have a number, rounded to 2 decimals.
 */

/** Most groups drawn; the rest fold into "Other (n)". */
export const MAX_GROUPS = 12;

export interface GroupOption<TData extends RowData> {
  id: string;
  label: string;
  column: ChartGroupColumn<TData>;
  /** Date columns: per month or per day (Pakistan time). */
  bucket: "month" | "day" | null;
}

export type MeasureKind = "count" | "sum" | "avg";

export interface MeasureOption<TData extends RowData> {
  id: string;
  label: string;
  kind: MeasureKind;
  column: ChartMeasureColumn<TData> | null;
}

export function groupOptions<TData extends RowData>(
  groups: ChartGroupColumn<TData>[],
): GroupOption<TData>[] {
  return groups.flatMap<GroupOption<TData>>((column) =>
    column.kind === "date"
      ? [
          {
            id: `${column.id}:month`,
            label: t.byMonth(column.label),
            column,
            bucket: "month",
          },
          {
            id: `${column.id}:day`,
            label: t.byDay(column.label),
            column,
            bucket: "day",
          },
        ]
      : [{ id: column.id, label: column.label, column, bucket: null }],
  );
}

export function measureOptions<TData extends RowData>(
  measures: ChartMeasureColumn<TData>[],
  countLabel: string = t.count,
): MeasureOption<TData>[] {
  return [
    { id: "count", label: countLabel, kind: "count", column: null },
    ...measures.flatMap<MeasureOption<TData>>((column) => [
      {
        id: `sum:${column.id}`,
        label: t.sum(column.label),
        kind: "sum",
        column,
      },
      {
        id: `avg:${column.id}`,
        label: t.avg(column.label),
        kind: "avg",
        column,
      },
    ]),
  ];
}

const NONE = "__none__";

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function categoryKey(value: unknown): string {
  if (value === null || value === undefined) return NONE;
  const text = String(value).trim();
  return text === "" ? NONE : text;
}

function dateKey(value: unknown, bucket: "month" | "day"): string | null {
  const iso =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string"
        ? value
        : null;
  if (!iso) return null;
  return bucket === "month" ? karachiMonthKey(iso) : karachiDayKey(iso);
}

interface Accumulator {
  count: number;
  sum: number;
  /** Rows that had a number for the measure (for the average). */
  measured: number;
}

function measureValue(acc: Accumulator | undefined, kind: MeasureKind): number {
  if (!acc) return 0;
  if (kind === "count") return acc.count;
  if (kind === "sum") return acc.sum;
  return acc.measured > 0
    ? Math.round((acc.sum / acc.measured) * 100) / 100
    : 0;
}

/**
 * Rows → chart data: one point per group (category) or per month/day (date,
 * with empty buckets between the first and last filled in as 0), valued by
 * the measure.
 */
export function groupRows<TData extends RowData>(
  rows: readonly TData[],
  group: GroupOption<TData>,
  measure: MeasureOption<TData>,
): ChartData {
  const groups = new Map<string, Accumulator>();
  rows.forEach((row, index) => {
    const raw = group.column.value(row, index);
    const key = group.bucket ? dateKey(raw, group.bucket) : categoryKey(raw);
    if (key === null) return;
    const acc = groups.get(key) ?? { count: 0, sum: 0, measured: 0 };
    acc.count += 1;
    if (measure.column) {
      const n = toNumber(measure.column.value(row, index));
      if (n !== null) {
        acc.sum += n;
        acc.measured += 1;
      }
    }
    groups.set(key, acc);
  });

  if (group.bucket) {
    const keys = [...groups.keys()].sort();
    const all = keys.length
      ? group.bucket === "month"
        ? monthsBetween(keys[0]!, keys.at(-1)!)
        : daysBetween(keys[0]!, keys.at(-1)!)
      : [];
    const label = group.bucket === "month" ? monthLabel : dayLabel;
    return {
      shape: "timeSeries",
      categories: all.map((key) => ({ key, label: label(key) })),
      series: [
        {
          key: measure.id,
          name: measure.label,
          values: all.map((key) => measureValue(groups.get(key), measure.kind)),
        },
      ],
    };
  }

  const { groupLabel, order, colors } = group.column;
  const points = [...groups].map(([key, acc]) => ({
    key,
    label: key === NONE ? t.none : (groupLabel?.(key) ?? key),
    value: measureValue(acc, measure.kind),
    colorVar: colors?.[key],
  }));
  if (order) {
    const rank = (key: string) => {
      const i = order.indexOf(key);
      return i === -1 ? order.length : i;
    };
    points.sort((a, b) => rank(a.key) - rank(b.key) || b.value - a.value);
  }
  return categoricalData(points, {
    seriesName: measure.label,
    sort: order ? "none" : "desc",
    max: MAX_GROUPS,
  });
}
