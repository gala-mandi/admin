import { describe, expect, it } from "vitest";
import {
  canZoom,
  chartTypesByShape,
  chartTypesFor,
  resolveChartType,
} from "./registry";
import type { ChartData } from "./types";

const categorical = (values: number[]): ChartData => ({
  shape: "categorical",
  categories: values.map((_, i) => ({ key: `c${i}`, label: `C${i}` })),
  series: [{ key: "v", name: "Shops", values }],
});

const timeSeries = (seriesCount: number): ChartData => ({
  shape: "timeSeries",
  categories: [
    { key: "2026-10", label: "Oct 26" },
    { key: "2026-11", label: "Nov 26" },
  ],
  series: Array.from({ length: seriesCount }, (_, i) => ({
    key: `s${i}`,
    name: `S${i}`,
    values: [1, 2],
  })),
});

const multiSeries: ChartData = {
  shape: "multiSeries",
  categories: [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
  ],
  series: [
    { key: "x", name: "X", values: [1, 2] },
    { key: "y", name: "Y", values: [3, 4] },
  ],
};

describe("chart type registry", () => {
  it("offers every categorical type for label → value data", () => {
    expect(chartTypesFor(categorical([3, 1, 2]))).toEqual([
      "bar",
      "horizontalBar",
      "line",
      "area",
      "pie",
      "donut",
      "rose",
      "treemap",
      "funnel",
    ]);
  });

  it("drops part-to-whole types for a single category or a negative value", () => {
    const partToWhole = ["pie", "donut", "rose", "treemap", "funnel"];
    for (const data of [categorical([5]), categorical([3, -1])]) {
      const types = chartTypesFor(data);
      expect(types).toEqual(["bar", "horizontalBar", "line", "area"]);
      expect(types.some((t) => partToWhole.includes(t))).toBe(false);
    }
  });

  it("offers time-series types, with stacked area only for 2+ series", () => {
    expect(chartTypesFor(timeSeries(1))).toEqual([
      "line",
      "smoothLine",
      "area",
      "bar",
      "step",
    ]);
    expect(chartTypesFor(timeSeries(3))).toEqual(chartTypesByShape.timeSeries);
  });

  it("never offers pie-like types for a time series or multi-series data", () => {
    for (const data of [timeSeries(2), multiSeries]) {
      expect(chartTypesFor(data)).not.toContain("pie");
      expect(chartTypesFor(data)).not.toContain("treemap");
    }
    expect(chartTypesFor(multiSeries)).toEqual([
      "groupedBar",
      "stackedBar",
      "line",
      "area",
    ]);
  });

  it("keeps a preferred type that fits, else falls back to the first", () => {
    expect(resolveChartType(categorical([1, 2]), "donut")).toBe("donut");
    expect(resolveChartType(categorical([1]), "donut")).toBe("bar");
    expect(resolveChartType(timeSeries(1), "stackedArea")).toBe("line");
    expect(resolveChartType(multiSeries, "pie")).toBe("groupedBar");
    expect(resolveChartType(multiSeries, null)).toBe("groupedBar");
  });

  it("only zooms time series drawn on axes", () => {
    expect(canZoom(timeSeries(1), "area")).toBe(true);
    expect(canZoom(categorical([1, 2]), "bar")).toBe(false);
  });
});
