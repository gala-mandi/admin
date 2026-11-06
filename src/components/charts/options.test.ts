import { describe, expect, it } from "vitest";
import { formatCount } from "@/lib/format";
import { buildOption, escapeHtml, optionBuilders, slicesFor } from "./options";
import { chartTypesByShape } from "./registry";
import { describeChart, hideItems, legendItems } from "./summary";
import { colorFor, fallbackTheme as theme, withAlpha } from "./theme";
import { type ChartData, type ChartType, chartTypes } from "./types";

interface Series {
  type: string;
  stack?: string;
  smooth?: number | false;
  step?: string;
  areaStyle?: unknown;
  roseType?: string;
  radius?: string[];
  data: unknown[];
  itemStyle?: { color?: unknown };
}
interface Option {
  series: Series[];
  xAxis?: { type: string };
  yAxis?: { type: string };
  dataZoom?: { type: string }[];
  tooltip: { formatter: (p: unknown) => string };
  animation: boolean;
}

const cities: ChartData = {
  shape: "categorical",
  categories: [
    { key: "okara", label: "Okara" },
    { key: "sahiwal", label: "Sahiwal" },
    { key: "<b>", label: "<b>Lahore</b>" },
  ],
  series: [{ key: "v", name: "Shops", values: [5, 3, 1] }],
};

const months: ChartData = {
  shape: "timeSeries",
  categories: [
    { key: "2026-09", label: "Sep 26" },
    { key: "2026-10", label: "Oct 26" },
    { key: "2026-11", label: "Nov 26" },
  ],
  series: [
    { key: "create", name: "Created", values: [1, 2, 3] },
    { key: "update", name: "Updated", values: [4, 0, 2] },
  ],
};

const build = (data: ChartData, type: ChartType, zoom = false) =>
  buildOption({
    data,
    type,
    theme,
    formatValue: formatCount,
    zoom,
  }) as unknown as Option;

describe("option builders", () => {
  it("has a builder for every chart type", () => {
    for (const type of chartTypes) {
      expect(typeof optionBuilders[type]).toBe("function");
    }
  });

  it.each([
    ["bar", "bar"],
    ["horizontalBar", "bar"],
    ["line", "line"],
    ["area", "line"],
    ["pie", "pie"],
    ["donut", "pie"],
    ["rose", "pie"],
    ["treemap", "treemap"],
    ["funnel", "funnel"],
  ] as const)("builds a %s chart as ECharts %s series", (type, series) => {
    expect(build(cities, type).series.map((s) => s.type)).toEqual([series]);
  });

  it("swaps the axes for a horizontal bar", () => {
    const bar = build(cities, "bar");
    expect(bar.xAxis?.type).toBe("category");
    const horizontal = build(cities, "horizontalBar");
    expect(horizontal.xAxis?.type).toBe("value");
    expect(horizontal.yAxis?.type).toBe("category");
  });

  it("tells donut, rose and pie apart", () => {
    expect(build(cities, "donut").series[0]!.radius).toEqual(["54%", "78%"]);
    expect(build(cities, "rose").series[0]!.roseType).toBe("radius");
    expect(build(cities, "pie").series[0]!.roseType).toBeUndefined();
  });

  it("draws time-series variants: smooth, step, gradient area, stacked", () => {
    expect(build(months, "line").series[0]!.smooth).toBe(false);
    expect(build(months, "smoothLine").series[0]!.smooth).toBeTruthy();
    expect(build(months, "step").series[0]!.step).toBe("middle");
    const area = build(months, "area").series[0]!;
    expect(area.areaStyle).toMatchObject({ color: { type: "linear" } });
    expect(area.stack).toBeUndefined();
    const stacked = build(months, "stackedArea").series;
    expect(stacked.map((s) => s.stack)).toEqual(["total", "total"]);
    // Bars of several time series stack, so a day reads as one total.
    expect(build(months, "bar").series.map((s) => s.stack)).toEqual([
      "total",
      "total",
    ]);
  });

  it("groups or stacks multi-series bars", () => {
    const multi = { ...months, shape: "multiSeries" as const };
    expect(build(multi, "groupedBar").series.map((s) => s.stack)).toEqual([
      undefined,
      undefined,
    ]);
    expect(build(multi, "stackedBar").series.map((s) => s.stack)).toEqual([
      "total",
      "total",
    ]);
  });

  it("adds data zoom only to a zoomed time series", () => {
    expect(build(months, "area", true).dataZoom?.map((z) => z.type)).toEqual([
      "inside",
      "slider",
    ]);
    expect(build(months, "area", false).dataZoom).toBeUndefined();
    expect(build(cities, "bar", true).dataZoom).toBeUndefined();
  });

  it("formats tooltip values with the panel helpers and escapes labels", () => {
    const big: ChartData = {
      ...cities,
      series: [{ key: "v", name: "Shops", values: [12345, 3, 1] }],
    };
    const html = build(big, "bar").tooltip.formatter([
      { dataIndex: 0, seriesIndex: 0 },
    ]);
    expect(html).toContain("12,345");
    expect(html).toContain("Okara");
    const evil = build(cities, "bar").tooltip.formatter([
      { dataIndex: 2, seriesIndex: 0 },
    ]);
    expect(evil).toContain("&lt;b&gt;Lahore&lt;/b&gt;");
    expect(evil).not.toContain("<b>Lahore");
    expect(escapeHtml(`"a" & 'b'`)).toBe("&quot;a&quot; &amp; &#39;b&#39;");
  });

  it("shows a total in the tooltip of stacked series", () => {
    const html = build(months, "stackedArea").tooltip.formatter([
      { dataIndex: 0, seriesIndex: 0 },
      { dataIndex: 0, seriesIndex: 1 },
    ]);
    expect(html).toContain("Total");
    expect(html).toContain(">5<");
  });

  it("turns animation off for reduced motion", () => {
    const calm = buildOption({
      data: cities,
      type: "bar",
      theme: { ...theme, reducedMotion: true },
      formatValue: formatCount,
    }) as unknown as Option;
    expect(calm.animation).toBe(false);
    expect(build(cities, "bar").animation).toBe(true);
  });

  it("builds every type a shape offers without throwing", () => {
    const multi = { ...months, shape: "multiSeries" as const };
    const byShape = {
      categorical: cities,
      timeSeries: months,
      multiSeries: multi,
    };
    for (const [shape, types] of Object.entries(chartTypesByShape)) {
      for (const type of types) {
        expect(() =>
          build(byShape[shape as keyof typeof byShape], type),
        ).not.toThrow();
      }
    }
  });
});

describe("slices", () => {
  const many: ChartData = {
    shape: "categorical",
    categories: Array.from({ length: 10 }, (_, i) => ({
      key: `k${i}`,
      label: `City ${i}`,
    })),
    series: [
      { key: "v", name: "Shops", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ],
  };

  it("keeps up to 8 slices, biggest first, folding the rest into Other", () => {
    const slices = slicesFor({
      data: many,
      type: "pie",
      theme,
      formatValue: formatCount,
    });
    expect(slices).toHaveLength(8);
    expect(slices[0]).toMatchObject({ label: "City 9", value: 10 });
    expect(slices.at(-1)).toMatchObject({
      label: "Other (3)",
      value: 1 + 2 + 3,
      color: theme.other,
    });
  });

  it("colours a slice by its category, not its rank", () => {
    const slices = slicesFor({
      data: cities,
      type: "pie",
      theme,
      formatValue: formatCount,
    });
    expect(slices.map((s) => s.color)).toEqual(theme.palette.slice(0, 3));
  });

  it("uses a category's colour token when it has one", () => {
    const status: ChartData = {
      ...cities,
      categories: [
        { key: "active", label: "Active", colorVar: "--success" },
        { key: "suspended", label: "Suspended", colorVar: "--destructive" },
        { key: "x", label: "X" },
      ],
    };
    const [active, suspended] = slicesFor({
      data: status,
      type: "donut",
      theme,
      formatValue: formatCount,
    });
    expect(active!.color).toBe(theme.vars["--success"]);
    expect(suspended!.color).toBe(theme.vars["--destructive"]);
  });
});

describe("summary, legend and hiding", () => {
  it("describes the chart in words for screen readers", () => {
    expect(describeChart(cities, "bar", formatCount)).toBe(
      "Bar chart. 3 items. Highest: Okara, 5. Lowest: <b>Lahore</b>, 1. Total: 9.",
    );
    expect(describeChart(months, "stackedArea", formatCount)).toContain(
      "Series: Created, Updated",
    );
  });

  it("toggles series when there are several, slices of a pie, nothing on a single-series axis", () => {
    expect(legendItems(months, "line").map((l) => l.name)).toEqual([
      "Created",
      "Updated",
    ]);
    expect(legendItems(cities, "donut")).toHaveLength(3);
    expect(legendItems(cities, "bar")).toEqual([]);
  });

  it("hides items but keeps each one's colour", () => {
    const hidden = hideItems(months, new Set(["create"]), theme.palette);
    expect(hidden.series.map((s) => s.key)).toEqual(["update"]);
    expect(hidden.series[0]!.colorVar).toBe("--chart-2");
    expect(colorFor(theme, 0, hidden.series[0]!.colorVar)).toBe(
      theme.palette[1],
    );

    const slices = hideItems(cities, new Set(["okara"]), theme.palette);
    expect(slices.categories.map((c) => c.key)).toEqual(["sahiwal", "<b>"]);
    expect(slices.series[0]!.values).toEqual([3, 1]);
  });

  it("makes rgba colours from hex tokens", () => {
    expect(withAlpha("#6d28d9", 0.3)).toBe("rgba(109, 40, 217, 0.3)");
    expect(withAlpha("#fff", 1)).toBe("rgba(255, 255, 255, 1)");
    expect(withAlpha("oklch(0.5 0.1 200)", 0.3)).toBe("oklch(0.5 0.1 200)");
  });
});
