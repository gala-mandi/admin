import type { EChartsCoreOption } from "echarts/core";
import { chartText } from "./text";
import { isCartesian, MAX_SLICES } from "./registry";
import { type ChartTheme, colorFor, withAlpha } from "./theme";
import type {
  ChartCategory,
  ChartData,
  ChartType,
  ValueFormatter,
} from "./types";

/**
 * Option builders: one function per chart type, all taking the same data
 * model. Pure (no DOM, no ECharts runtime), so they are unit-tested directly
 * and the ECharts bundle only loads where a chart is drawn.
 */

export interface BuildOptionInput {
  data: ChartData;
  type: ChartType;
  theme: ChartTheme;
  formatValue: ValueFormatter;
  /** Tooltip heading of a category, e.g. "November 2026"; default its label. */
  formatCategoryLong?: (category: ChartCategory) => string;
  /** Show the data-zoom slider (time series only). */
  zoom?: boolean;
  /** Where the zoom window starts, in % of the range (default 0). */
  zoomStart?: number;
}

export type OptionBuilder = (input: BuildOptionInput) => EChartsCoreOption;

/** A slice of a part-to-whole chart after folding the tail. */
export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Tooltips are HTML; shop names and cities come from users, so escape them. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => escapeMap[c]!);
}

interface TooltipRow {
  color: string;
  name: string;
  value: string;
}

function tooltipHtml(
  theme: ChartTheme,
  title: string,
  rows: TooltipRow[],
  footer?: TooltipRow,
): string {
  const row = ({ color, name, value }: TooltipRow, strong = false) =>
    `<div style="display:flex;align-items:center;gap:8px;min-width:150px;line-height:20px">` +
    (color
      ? `<span style="width:8px;height:8px;border-radius:9999px;background:${color};flex:none"></span>`
      : "") +
    `<span style="flex:1;color:${theme.muted}">${escapeHtml(name)}</span>` +
    `<span style="font-variant-numeric:tabular-nums;font-weight:${strong ? 700 : 600}">${escapeHtml(value)}</span>` +
    `</div>`;
  return (
    `<div style="font-weight:700;margin-bottom:6px">${escapeHtml(title)}</div>` +
    rows.map((r) => row(r)).join("") +
    (footer
      ? `<div style="border-top:1px solid ${theme.border};margin-top:6px;padding-top:6px">${row(footer, true)}</div>`
      : "")
  );
}

function base(theme: ChartTheme): EChartsCoreOption {
  return {
    animation: !theme.reducedMotion,
    animationDuration: 700,
    animationEasing: "cubicOut",
    animationDurationUpdate: 450,
    animationEasingUpdate: "cubicInOut",
    color: theme.palette,
    backgroundColor: "transparent",
    // ECharts' own aria stays off (not imported): the Chart wrapper gives a
    // text description and a data table instead.
    textStyle: { fontFamily: theme.fontFamily, color: theme.muted },
  };
}

function tooltipBase(theme: ChartTheme, trigger: "axis" | "item") {
  return {
    trigger,
    confine: true,
    backgroundColor: theme.popover,
    borderColor: theme.border,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: {
      color: theme.popoverText,
      fontSize: 12,
      fontFamily: theme.fontFamily,
    },
    extraCssText:
      "border-radius:12px;box-shadow:0 12px 32px -12px rgba(30,27,46,0.35);",
    axisPointer:
      trigger === "axis"
        ? {
            type: "line",
            lineStyle: { color: theme.border, width: 1 },
            shadowStyle: { color: withAlpha(theme.palette[0]!, 0.06) },
          }
        : undefined,
  };
}

function categoryTitle(input: BuildOptionInput, index: number): string {
  const category = input.data.categories[index];
  if (!category) return "";
  return input.formatCategoryLong?.(category) ?? category.label;
}

/** Fill colour of category `i` in a single-series chart. */
function categoryColor(input: BuildOptionInput, index: number): string {
  const category = input.data.categories[index];
  return colorFor(input.theme, 0, category?.colorVar);
}

function seriesColor(input: BuildOptionInput, index: number): string {
  return colorFor(input.theme, index, input.data.series[index]?.colorVar);
}

/** Vertical fade under a line: strong at the top, nearly clear at the base. */
function areaGradient(color: string, strength = 0.32) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, strength) },
      { offset: 1, color: withAlpha(color, 0.02) },
    ],
  };
}

/** Bars get a light top-to-base sheen instead of a flat fill. */
function barGradient(color: string, horizontal: boolean) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: horizontal ? 1 : 0,
    y2: horizontal ? 0 : 1,
    colorStops: horizontal
      ? [
          { offset: 0, color: withAlpha(color, 0.78) },
          { offset: 1, color },
        ]
      : [
          { offset: 0, color },
          { offset: 1, color: withAlpha(color, 0.78) },
        ],
  };
}

const allIntegers = (data: ChartData) =>
  data.series.every((s) => s.values.every((v) => Number.isInteger(v)));

function axes(input: BuildOptionInput, horizontal: boolean, gap: boolean) {
  const { theme, data, formatValue } = input;
  const categoryAxis = {
    type: "category",
    data: data.categories.map((c) => c.label),
    boundaryGap: gap,
    inverse: horizontal,
    axisLine: { show: !horizontal, lineStyle: { color: theme.border } },
    axisTick: { show: false },
    axisLabel: {
      color: theme.muted,
      fontSize: 11,
      hideOverlap: true,
      margin: 12,
      width: horizontal ? 110 : undefined,
      overflow: horizontal ? "truncate" : undefined,
    },
  };
  const valueAxis = {
    type: "value",
    minInterval: allIntegers(data) ? 1 : undefined,
    splitNumber: 4,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: theme.muted,
      fontSize: 11,
      formatter: (v: number) => formatValue(v),
    },
    splitLine: { lineStyle: { color: theme.grid, width: 1 } },
  };
  return horizontal
    ? { xAxis: valueAxis, yAxis: categoryAxis }
    : { xAxis: categoryAxis, yAxis: valueAxis };
}

function zoomOption(input: BuildOptionInput) {
  if (!input.zoom || input.data.shape !== "timeSeries") return undefined;
  const { theme } = input;
  const accent = theme.palette[0]!;
  const start = input.zoomStart ?? 0;
  return [
    {
      type: "inside",
      start,
      end: 100,
      // Plain wheel scrolls the page; Ctrl + wheel (or pinch) zooms.
      zoomOnMouseWheel: "ctrl",
      moveOnMouseWheel: false,
      moveOnMouseMove: true,
    },
    {
      type: "slider",
      start,
      end: 100,
      height: 22,
      bottom: 6,
      brushSelect: false,
      borderColor: "transparent",
      backgroundColor: withAlpha(accent, 0.04),
      fillerColor: withAlpha(accent, 0.14),
      dataBackground: {
        lineStyle: { color: withAlpha(accent, 0.5), width: 1 },
        areaStyle: { color: withAlpha(accent, 0.12) },
      },
      selectedDataBackground: {
        lineStyle: { color: accent, width: 1 },
        areaStyle: { color: withAlpha(accent, 0.24) },
      },
      handleStyle: { color: theme.surface, borderColor: accent },
      moveHandleStyle: { color: withAlpha(accent, 0.4) },
      textStyle: { color: theme.muted, fontSize: 10 },
      labelFormatter: (index: number) =>
        input.data.categories[index]?.label ?? "",
    },
  ];
}

interface AxisParam {
  dataIndex: number;
  seriesIndex: number;
}

/** Axis tooltip: category heading, a row per series, a total when stacked. */
function axisTooltip(input: BuildOptionInput, stacked: boolean) {
  const { data, theme, formatValue } = input;
  return {
    ...tooltipBase(theme, "axis"),
    formatter: (raw: AxisParam | AxisParam[]) => {
      const params = Array.isArray(raw) ? raw : [raw];
      const index = params[0]?.dataIndex ?? 0;
      const single = data.series.length === 1;
      const rows = params.map((p) => {
        const series = data.series[p.seriesIndex];
        const value = series?.values[index] ?? 0;
        return {
          color: single
            ? categoryColor(input, index)
            : seriesColor(input, p.seriesIndex),
          name: series?.name ?? "",
          value: formatValue(value),
        };
      });
      const total = stacked
        ? {
            color: "",
            name: chartText.total,
            value: formatValue(
              params.reduce(
                (sum, p) =>
                  sum + (data.series[p.seriesIndex]?.values[index] ?? 0),
                0,
              ),
            ),
          }
        : undefined;
      return tooltipHtml(theme, categoryTitle(input, index), rows, total);
    },
  };
}

interface CartesianStyle {
  kind: "bar" | "line";
  horizontal?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  step?: boolean;
  area?: boolean;
}

function cartesian(
  input: BuildOptionInput,
  style: CartesianStyle,
): EChartsCoreOption {
  const { data, theme } = input;
  const isBar = style.kind === "bar";
  const single = data.series.length === 1;
  const zoom = zoomOption(input);
  const many = data.categories.length > 24;
  const lastSeries = data.series.length - 1;

  const series = data.series.map((s, i) => {
    const color = seriesColor(input, i);
    if (isBar) {
      const radius = style.horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0];
      return {
        id: single ? "main" : s.key,
        name: s.name,
        type: "bar",
        stack: style.stacked ? "total" : undefined,
        barMaxWidth: style.horizontal ? 22 : 36,
        barCategoryGap: single ? "38%" : "28%",
        barGap: "12%",
        universalTransition: { enabled: true },
        // Stacked segments are separated by a hairline of the surface; only
        // the top segment is rounded.
        itemStyle: {
          borderRadius: style.stacked && i !== lastSeries ? 0 : radius,
          borderColor: style.stacked ? theme.surface : undefined,
          borderWidth: style.stacked ? 1 : 0,
          color: single ? undefined : barGradient(color, !!style.horizontal),
        },
        emphasis: { focus: single ? "none" : "series" },
        label:
          style.horizontal && single
            ? {
                show: true,
                position: "right",
                color: theme.muted,
                fontSize: 11,
                formatter: ({ value }: { value: number }) =>
                  input.formatValue(value),
              }
            : undefined,
        data: s.values.map((value, j) =>
          single
            ? {
                value,
                itemStyle: {
                  color: barGradient(
                    categoryColor(input, j),
                    !!style.horizontal,
                  ),
                },
              }
            : value,
        ),
      };
    }
    return {
      id: single ? "main" : s.key,
      name: s.name,
      type: "line",
      stack: style.stacked ? "total" : undefined,
      smooth: style.smooth ? 0.35 : false,
      step: style.step ? "middle" : undefined,
      symbol: "circle",
      symbolSize: 7,
      showSymbol: !many,
      universalTransition: { enabled: true },
      lineStyle: { width: 2.5, color },
      itemStyle: { color, borderColor: theme.surface, borderWidth: 2 },
      areaStyle: style.area
        ? { color: areaGradient(color, style.stacked ? 0.22 : 0.32) }
        : undefined,
      emphasis: { focus: single ? "none" : "series" },
      data: s.values,
    };
  });

  return {
    ...base(theme),
    grid: {
      left: 4,
      right: style.horizontal ? 40 : 16,
      top: 16,
      bottom: zoom ? 44 : 4,
      containLabel: true,
    },
    tooltip: axisTooltip(input, !!style.stacked && !single),
    ...axes(input, !!style.horizontal, isBar),
    dataZoom: zoom,
    series,
  };
}

/**
 * Slices of a part-to-whole chart: the biggest first, with everything past
 * `MAX_SLICES - 1` folded into "Other". Colours follow the category (its
 * position in the data), not its rank, unless folding had to happen.
 */
export function slicesFor(input: BuildOptionInput): Slice[] {
  const { data, theme } = input;
  const values = data.series[0]?.values ?? [];
  const items = data.categories.map((category, index) => ({
    category,
    index,
    value: values[index] ?? 0,
  }));
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const fold = sorted.length > MAX_SLICES;
  const kept = fold ? sorted.slice(0, MAX_SLICES - 1) : sorted;
  const slices: Slice[] = kept.map((item, rank) => ({
    key: item.category.key,
    label: item.category.label,
    value: item.value,
    color: colorFor(theme, fold ? rank : item.index, item.category.colorVar),
  }));
  if (fold) {
    const rest = sorted.slice(MAX_SLICES - 1);
    slices.push({
      key: "__other__",
      label: chartText.other(rest.length),
      value: rest.reduce((sum, item) => sum + item.value, 0),
      color: theme.other,
    });
  }
  return slices;
}

function itemTooltip(input: BuildOptionInput, slices: Slice[]) {
  const { theme, formatValue } = input;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  return {
    ...tooltipBase(theme, "item"),
    formatter: ({ name, dataIndex }: { name: string; dataIndex: number }) => {
      // Treemap numbers its nodes differently, so look the slice up by name.
      const slice = slices.find((s) => s.label === name) ?? slices[dataIndex];
      if (!slice) return "";
      return tooltipHtml(theme, slice.label, [
        {
          color: slice.color,
          name: input.data.series[0]?.name ?? "",
          value: formatValue(slice.value),
        },
        {
          color: "",
          name: chartText.share,
          value: chartText.percent(total > 0 ? slice.value / total : 0),
        },
      ]);
    },
  };
}

type PieKind = "pie" | "donut" | "rose";

function pie(input: BuildOptionInput, kind: PieKind): EChartsCoreOption {
  const { theme } = input;
  const slices = slicesFor(input);
  const radius =
    kind === "donut"
      ? ["54%", "78%"]
      : kind === "rose"
        ? ["16%", "80%"]
        : ["0%", "76%"];
  return {
    ...base(theme),
    tooltip: itemTooltip(input, slices),
    series: [
      {
        id: "main",
        name: input.data.series[0]?.name,
        type: "pie",
        radius,
        center: ["50%", "50%"],
        roseType: kind === "rose" ? "radius" : undefined,
        avoidLabelOverlap: true,
        padAngle: kind === "donut" ? 1.5 : 0,
        universalTransition: { enabled: true },
        itemStyle: {
          borderColor: theme.surface,
          borderWidth: 2,
          borderRadius: kind === "pie" ? 4 : 8,
        },
        label: {
          show: true,
          color: theme.muted,
          fontSize: 11,
          formatter: ({ dataIndex }: { dataIndex: number }) =>
            slices[dataIndex]?.label ?? "",
        },
        labelLine: { lineStyle: { color: theme.border }, length: 8 },
        emphasis: { scale: true, scaleSize: 6 },
        data: slices.map((s) => ({
          name: s.label,
          value: s.value,
          itemStyle: { color: s.color },
        })),
      },
    ],
  };
}

function treemap(input: BuildOptionInput): EChartsCoreOption {
  const { theme, formatValue } = input;
  const slices = slicesFor(input).filter((s) => s.value > 0);
  return {
    ...base(theme),
    tooltip: itemTooltip(input, slices),
    series: [
      {
        id: "main",
        name: input.data.series[0]?.name,
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        universalTransition: { enabled: true },
        itemStyle: { borderColor: theme.surface, borderWidth: 2, gapWidth: 2 },
        label: {
          show: true,
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 600,
          overflow: "truncate",
          formatter: ({ name, value }: { name: string; value: number }) =>
            `${name}\n${formatValue(value)}`,
        },
        levels: [{ itemStyle: { borderRadius: 8 } }],
        data: slices.map((s) => ({
          name: s.label,
          value: s.value,
          itemStyle: { color: s.color, borderRadius: 8 },
        })),
      },
    ],
  };
}

function funnel(input: BuildOptionInput): EChartsCoreOption {
  const { theme } = input;
  const slices = slicesFor(input);
  return {
    ...base(theme),
    tooltip: itemTooltip(input, slices),
    series: [
      {
        id: "main",
        name: input.data.series[0]?.name,
        type: "funnel",
        sort: "descending",
        gap: 3,
        minSize: "14%",
        top: 8,
        bottom: 8,
        left: "8%",
        width: "84%",
        universalTransition: { enabled: true },
        itemStyle: { borderColor: theme.surface, borderWidth: 1 },
        label: {
          show: true,
          position: "inside",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 600,
          formatter: ({ dataIndex }: { dataIndex: number }) =>
            slices[dataIndex]?.label ?? "",
        },
        data: slices.map((s) => ({
          name: s.label,
          value: s.value,
          itemStyle: { color: s.color },
        })),
      },
    ],
  };
}

/** Option builder per chart type. */
export const optionBuilders: Record<ChartType, OptionBuilder> = {
  bar: (i) =>
    cartesian(i, {
      kind: "bar",
      stacked: i.data.shape === "timeSeries" && i.data.series.length > 1,
    }),
  horizontalBar: (i) => cartesian(i, { kind: "bar", horizontal: true }),
  groupedBar: (i) => cartesian(i, { kind: "bar" }),
  stackedBar: (i) => cartesian(i, { kind: "bar", stacked: true }),
  line: (i) => cartesian(i, { kind: "line" }),
  smoothLine: (i) => cartesian(i, { kind: "line", smooth: true }),
  step: (i) => cartesian(i, { kind: "line", step: true }),
  area: (i) => cartesian(i, { kind: "line", area: true, smooth: true }),
  stackedArea: (i) =>
    cartesian(i, { kind: "line", area: true, smooth: true, stacked: true }),
  pie: (i) => pie(i, "pie"),
  donut: (i) => pie(i, "donut"),
  rose: (i) => pie(i, "rose"),
  treemap,
  funnel,
};

/** The ECharts option for `type`. */
export function buildOption(input: BuildOptionInput): EChartsCoreOption {
  return optionBuilders[input.type](input);
}

export { isCartesian };
