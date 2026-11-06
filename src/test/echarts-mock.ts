import type { EChartsCoreOption } from "echarts/core";

/**
 * Stand-in for `src/components/charts/echarts.ts` in jsdom, which has no
 * canvas. Records every chart and the options it was given so tests can
 * check which option builder ran.
 */
export interface FakeChart {
  element: HTMLElement;
  options: EChartsCoreOption[];
  disposed: boolean;
  setOption: (option: EChartsCoreOption) => void;
  resize: () => void;
  dispose: () => void;
  isDisposed: () => boolean;
  getDataURL: () => string;
}

export const fakeCharts: FakeChart[] = [];

export function init(element: HTMLElement): FakeChart {
  const chart: FakeChart = {
    element,
    options: [],
    disposed: false,
    setOption(option) {
      this.options.push(option);
    },
    resize() {},
    dispose() {
      this.disposed = true;
    },
    isDisposed() {
      return this.disposed;
    },
    getDataURL: () => "data:image/png;base64,AAAA",
  };
  fakeCharts.push(chart);
  return chart;
}

/** The live (not disposed) charts. */
export const liveCharts = () => fakeCharts.filter((c) => !c.disposed);

/** Series `type`s of a chart's latest option, e.g. `["pie"]`. */
export function seriesTypes(chart: FakeChart | undefined): string[] {
  const option = chart?.options.at(-1) as
    { series?: { type: string }[] } | undefined;
  return option?.series?.map((s) => s.type) ?? [];
}

export function resetFakeCharts(): void {
  fakeCharts.length = 0;
}
