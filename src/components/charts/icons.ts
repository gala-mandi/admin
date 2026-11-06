import {
  ChartArea,
  ChartBar,
  ChartColumn,
  ChartColumnBig,
  ChartColumnStacked,
  ChartLine,
  ChartNoAxesGantt,
  ChartPie,
  ChartSpline,
  Donut,
  Filter,
  Flower,
  Layers,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type { ChartType } from "./types";

/** Icon of each chart type in the switcher. */
export const chartTypeIcons: Record<ChartType, LucideIcon> = {
  bar: ChartColumn,
  horizontalBar: ChartBar,
  groupedBar: ChartColumnBig,
  stackedBar: ChartColumnStacked,
  line: ChartLine,
  smoothLine: ChartSpline,
  step: ChartNoAxesGantt,
  area: ChartArea,
  stackedArea: Layers,
  pie: ChartPie,
  donut: Donut,
  rose: Flower,
  treemap: LayoutGrid,
  funnel: Filter,
};
