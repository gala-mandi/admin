import { isCartesian, MAX_SLICES } from "./registry";
import { chartText, chartTypeLabels } from "./text";
import type { ChartData, ChartType, ValueFormatter } from "./types";

const t = chartText.summary;

/** True when there is nothing to draw: no categories or every value is 0. */
export function isChartEmpty(data: ChartData | undefined): boolean {
  if (!data || data.categories.length === 0 || data.series.length === 0) {
    return true;
  }
  return data.series.every((s) => s.values.every((v) => !v));
}

/**
 * A one-paragraph text version of the chart for screen readers: type, how
 * many items, highest and lowest, and the total of a single series.
 */
export function describeChart(
  data: ChartData,
  type: ChartType,
  formatValue: ValueFormatter,
): string {
  const parts: string[] = [
    t.type(chartTypeLabels[type]),
    t.categories(data.categories.length),
  ];
  const seriesNames = t.series(data.series.map((s) => s.name));
  if (seriesNames) parts.push(seriesNames);

  // Highest/lowest of the per-category totals across series.
  const totals = data.categories.map((_, i) =>
    data.series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
  );
  if (totals.length > 0) {
    let hi = 0;
    let lo = 0;
    totals.forEach((v, i) => {
      if (v > totals[hi]!) hi = i;
      if (v < totals[lo]!) lo = i;
    });
    parts.push(t.highest(data.categories[hi]!.label, formatValue(totals[hi]!)));
    if (totals.length > 1 && lo !== hi) {
      parts.push(
        t.lowest(data.categories[lo]!.label, formatValue(totals[lo]!)),
      );
    }
    parts.push(t.total(formatValue(totals.reduce((a, b) => a + b, 0))));
  }
  return `${parts.join(". ")}.`;
}

export interface LegendItem {
  key: string;
  name: string;
  /** Index in the palette (series or category position). */
  index: number;
  colorVar?: string;
}

/**
 * What the legend toggles: the series when there are two or more, else the
 * categories of a part-to-whole chart with few enough slices. A single
 * series on an axis needs no legend: the title names it.
 */
export function legendItems(data: ChartData, type: ChartType): LegendItem[] {
  if (data.series.length > 1) {
    return data.series.map((s, index) => ({
      key: s.key,
      name: s.name,
      index,
      colorVar: s.colorVar,
    }));
  }
  if (!isCartesian(type) && data.categories.length <= MAX_SLICES) {
    return data.categories.map((c, index) => ({
      key: c.key,
      name: c.label,
      index,
      colorVar: c.colorVar,
    }));
  }
  return [];
}

/**
 * `data` without the hidden legend items. Series keep their `colorVar` or,
 * when they have none, their original palette slot, so a colour follows its
 * entity when others are hidden.
 */
export function hideItems(
  data: ChartData,
  hidden: ReadonlySet<string>,
  palette: readonly string[],
): ChartData {
  if (hidden.size === 0) return data;
  if (data.series.length > 1) {
    return {
      ...data,
      series: data.series
        .map((s, i) => ({
          ...s,
          colorVar: s.colorVar ?? paletteVar(i, palette),
        }))
        .filter((s) => !hidden.has(s.key)),
    };
  }
  const keep = data.categories
    .map((c, i) => ({
      c: { ...c, colorVar: c.colorVar ?? paletteVar(i, palette) },
      i,
    }))
    .filter(({ c }) => !hidden.has(c.key));
  return {
    ...data,
    categories: keep.map(({ c }) => c),
    series: data.series.map((s) => ({
      ...s,
      values: keep.map(({ i }) => s.values[i] ?? 0),
    })),
  };
}

/** `--chart-<n>` for palette slot `i`. */
function paletteVar(i: number, palette: readonly string[]): string {
  return `--chart-${(i % palette.length) + 1}`;
}
