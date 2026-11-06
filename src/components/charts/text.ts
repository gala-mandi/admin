import type { ChartType } from "./types";

/**
 * User-facing strings of the shared charts. Kept out of the components so an
 * Urdu version can be added later.
 */

const percentFormat = new Intl.NumberFormat("en-PK", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const chartTypeLabels: Record<ChartType, string> = {
  bar: "Bar",
  horizontalBar: "Horizontal bar",
  groupedBar: "Grouped bar",
  stackedBar: "Stacked bar",
  line: "Line",
  smoothLine: "Smooth line",
  step: "Step",
  area: "Area",
  stackedArea: "Stacked area",
  pie: "Pie",
  donut: "Donut",
  rose: "Rose",
  treemap: "Treemap",
  funnel: "Funnel",
};

export const chartText = {
  loading: "Loading chart…",
  errorTitle: "Couldn’t load this chart",
  errorBody: "Check your internet and try again.",
  retry: "Try again",
  empty: "No data to chart yet.",
  other: (n: number) => `Other (${n})`,
  total: "Total",
  share: "Share",
  percent: (ratio: number) => percentFormat.format(ratio),
  table: {
    category: "Item",
    caption: (title: string) => `${title}: data`,
  },
  toolbar: {
    label: (title: string) => `${title} chart options`,
    type: "Chart type",
    typeButton: (type: string) => `Chart type: ${type}`,
    zoom: "Zoom",
    zoomHint: "Show the zoom bar. Ctrl + scroll also zooms.",
    download: "Download PNG",
    downloadFailed: "Couldn’t create the image. Please try again.",
    viewData: "View data",
    hideData: "Hide data",
    legend: "Show or hide",
    legendItem: (name: string, shown: boolean) =>
      `${name}: ${shown ? "shown" : "hidden"}`,
    allHidden: "Everything is hidden. Turn an item back on to see the chart.",
  },
  /** Spoken summary of a chart (its `aria-label` with the title). */
  summary: {
    type: (type: string) => `${type} chart`,
    categories: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    series: (names: string[]) =>
      names.length > 1 ? `Series: ${names.join(", ")}` : "",
    highest: (label: string, value: string) => `Highest: ${label}, ${value}`,
    lowest: (label: string, value: string) => `Lowest: ${label}, ${value}`,
    total: (value: string) => `Total: ${value}`,
  },
} as const;
