/**
 * One data model for every chart. A chart's *shape* decides which chart types
 * fit it (see `registry.ts`); the option builders (`options.ts`) turn the same
 * model into an ECharts option for each type.
 *
 * Values are plain numbers: counts and averages of counts. Money never goes
 * through a chart as a float; a money chart must be built from server totals
 * and formatted with `formatRs`.
 */

/**
 * - `categorical`: label → value (one series), e.g. shops per city.
 * - `timeSeries`: ordered time buckets (months, days) with one or more series.
 * - `multiSeries`: categories with two or more series, e.g. actions per role.
 */
export type ChartShape = "categorical" | "timeSeries" | "multiSeries";

export interface ChartCategory {
  /** Stable key (a month `YYYY-MM`, a day `YYYY-MM-DD`, a status…). */
  key: string;
  /** Short label for the axis and the legend. */
  label: string;
  /**
   * CSS custom property (e.g. `--success`) for this category's colour in a
   * single-series chart. Leave out to use the categorical palette.
   */
  colorVar?: string;
}

export interface ChartSeries {
  key: string;
  name: string;
  /** One value per category, in category order. */
  values: number[];
  /** CSS custom property for this series; default its palette slot. */
  colorVar?: string;
}

export interface ChartData {
  shape: ChartShape;
  categories: ChartCategory[];
  series: ChartSeries[];
}

export const chartTypes = [
  "bar",
  "horizontalBar",
  "groupedBar",
  "stackedBar",
  "line",
  "smoothLine",
  "step",
  "area",
  "stackedArea",
  "pie",
  "donut",
  "rose",
  "treemap",
  "funnel",
] as const;

export type ChartType = (typeof chartTypes)[number];

/** Formats a value for tooltips, labels and the data table. */
export type ValueFormatter = (value: number) => string;
