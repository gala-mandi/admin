/**
 * The only module that imports the ECharts runtime. Tree-shaken: the charts,
 * components and renderer the option builders use, nothing else. It is
 * loaded through `chart-canvas.tsx`, which pages get via `next/dynamic`, so a
 * page without charts never downloads it.
 */
import {
  BarChart,
  FunnelChart,
  LineChart,
  PieChart,
  TreemapChart,
} from "echarts/charts";
import {
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { init, use as registerModules } from "echarts/core";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

registerModules([
  BarChart,
  LineChart,
  PieChart,
  TreemapChart,
  FunnelChart,
  GridComponent,
  TooltipComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);

export { init };
export type { EChartsType } from "echarts/core";
