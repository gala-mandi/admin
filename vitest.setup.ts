import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { resetChartTypeMemory } from "./src/components/charts/storage";
import { resetFakeCharts } from "./src/test/echarts-mock";
import { matches, resetMedia } from "./src/test/media";

// jsdom has no canvas: charts draw into a recording fake (see echarts-mock).
vi.mock(
  "./src/components/charts/echarts",
  () => import("./src/test/echarts-mock"),
);

// jsdom has no ResizeObserver; Radix (checkbox, radio) needs one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

// jsdom has no matchMedia; the sidebar (mobile) and theme (dark) read it.
window.matchMedia ??= (query: string) =>
  ({
    get matches() {
      return matches(query);
    },
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

afterEach(() => {
  cleanup();
  resetMedia();
  resetFakeCharts();
  resetChartTypeMemory();
});
