import type { ChartData, ChartShape, ChartType } from "./types";

/**
 * Chart types per data shape, in the order the switcher lists them. Only
 * types that can show the data honestly are offered:
 *
 * - categorical: label → value;
 * - time series: ordered time buckets (stacked area needs 2+ series);
 * - multi-series: categories × series.
 */
export const chartTypesByShape: Record<ChartShape, readonly ChartType[]> = {
  categorical: [
    "bar",
    "horizontalBar",
    "line",
    "area",
    "pie",
    "donut",
    "rose",
    "treemap",
    "funnel",
  ],
  timeSeries: ["line", "smoothLine", "area", "stackedArea", "bar", "step"],
  multiSeries: ["groupedBar", "stackedBar", "line", "area"],
};

/** Part-to-whole types: they need non-negative values that add up. */
const partToWhole = new Set<ChartType>([
  "pie",
  "donut",
  "rose",
  "treemap",
  "funnel",
]);

/** Most slices a part-to-whole chart shows; the rest fold into "Other". */
export const MAX_SLICES = 8;

function hasNegative(data: ChartData): boolean {
  return data.series.some((s) => s.values.some((v) => v < 0));
}

/**
 * The chart types that fit `data`. Part-to-whole types drop out when a value
 * is negative or there is only one category; stacked area needs at least two
 * series to stack.
 */
export function chartTypesFor(data: ChartData): ChartType[] {
  const types = chartTypesByShape[data.shape];
  return types.filter((type) => {
    if (partToWhole.has(type)) {
      return data.categories.length > 1 && !hasNegative(data);
    }
    if (type === "stackedArea") return data.series.length > 1;
    return true;
  });
}

/** `preferred` when it fits the data, else the shape's first type. */
export function resolveChartType(
  data: ChartData,
  preferred: ChartType | null | undefined,
): ChartType {
  const types = chartTypesFor(data);
  if (preferred && types.includes(preferred)) return preferred;
  return types[0] ?? chartTypesByShape[data.shape][0]!;
}

/** Types drawn on x/y axes (as opposed to pie, treemap, funnel). */
export function isCartesian(type: ChartType): boolean {
  return !partToWhole.has(type);
}

/** True for types where data zoom makes sense (time series on an x axis). */
export function canZoom(data: ChartData, type: ChartType): boolean {
  return data.shape === "timeSeries" && isCartesian(type);
}
