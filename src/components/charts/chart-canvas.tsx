"use client";

import type { EChartsCoreOption } from "echarts/core";
import { useEffect, useRef } from "react";
import { type EChartsType, init } from "./echarts";

export interface ChartCanvasProps {
  option: EChartsCoreOption;
  className?: string;
  /** Gets the ECharts instance after init, and `null` before it's disposed. */
  onInstance?: (chart: EChartsType | null) => void;
}

/**
 * Thin ECharts wrapper (no `echarts-for-react`): init on mount, resize with
 * the container (`ResizeObserver`), `setOption` whenever the option changes,
 * dispose on unmount. The default export is what `next/dynamic` loads.
 */
export default function ChartCanvas({
  option,
  className,
  onInstance,
}: ChartCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const onInstanceRef = useRef(onInstance);

  useEffect(() => {
    onInstanceRef.current = onInstance;
  }, [onInstance]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const chart = init(element, null, { renderer: "canvas" });
    chartRef.current = chart;
    onInstanceRef.current?.(chart);

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!chart.isDisposed()) chart.resize();
      });
    });
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      onInstanceRef.current?.(null);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    // `notMerge` so a new chart type replaces the old series and axes; the
    // series ids let ECharts morph one type into the next.
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={ref} className={className} />;
}
