"use client";

import { ChartNoAxesColumn, CircleAlert } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EChartsType } from "./echarts";
import { buildOption } from "./options";
import { describeChart, isChartEmpty } from "./summary";
import { chartText as t } from "./text";
import { useChartTheme } from "./theme";
import type {
  ChartCategory,
  ChartData,
  ChartType,
  ValueFormatter,
} from "./types";

/** The ECharts runtime only loads in the browser, and only with a chart. */
const ChartCanvas = dynamic(() => import("./chart-canvas"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-2xl opacity-60" />,
});

export interface ChartProps {
  /** Names the chart for screen readers and captions its data table. */
  title: string;
  data: ChartData | undefined;
  type: ChartType;
  formatValue?: ValueFormatter;
  /** Tooltip / table heading of a category; default its label. */
  formatCategoryLong?: (category: ChartCategory) => string;
  /** Heading of the category column of the data table. */
  categoryLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Shown when there's no data or every value is 0. */
  emptyText?: string;
  /** Body of the error state; default a generic "check your internet". */
  errorText?: string;
  /** Data-zoom slider (time series). */
  zoom?: boolean;
  zoomStart?: number;
  /** Height of the plot in px. */
  height?: number;
  /** "View data": show the data table on screen instead of only to readers. */
  showTable?: boolean;
  onInstance?: (chart: EChartsType | null) => void;
  /** `data-testid` of the drawn chart. */
  testId?: string;
  className?: string;
}

const defaultFormat: ValueFormatter = formatCount;

/** Bars of different heights while the data loads. */
const skeletonBars = [45, 70, 55, 85, 60, 95, 75];

/**
 * One chart with its states: a loading skeleton, an error with retry, an
 * empty state, else the ECharts canvas (themed from the panel tokens). The
 * canvas has a text description (`aria-label`) and the numbers are always in
 * a data table, visually hidden unless `showTable`.
 */
export function Chart({
  title,
  data,
  type,
  formatValue = defaultFormat,
  formatCategoryLong,
  categoryLabel = t.table.category,
  isLoading = false,
  isError = false,
  onRetry,
  emptyText = t.empty,
  errorText = t.errorBody,
  zoom = false,
  zoomStart,
  height = 288,
  showTable = false,
  onInstance,
  testId,
  className,
}: ChartProps) {
  const theme = useChartTheme();
  const ready = !isLoading && !isError && data && !isChartEmpty(data);

  const option = useMemo(
    () =>
      ready
        ? buildOption({
            data,
            type,
            theme,
            formatValue,
            formatCategoryLong,
            zoom,
            zoomStart,
          })
        : null,
    [
      ready,
      data,
      type,
      theme,
      formatValue,
      formatCategoryLong,
      zoom,
      zoomStart,
    ],
  );

  const style = { minHeight: height };

  if (isLoading) {
    return (
      <div
        role="status"
        className={cn("flex items-end gap-3 px-2 pb-2", className)}
        style={{ height }}
      >
        <span className="sr-only">{t.loading}</span>
        {skeletonBars.map((h, i) => (
          <Skeleton
            key={i}
            aria-hidden
            data-testid="chart-skeleton"
            className="flex-1 rounded-t-lg rounded-b-sm"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-6 text-center",
          className,
        )}
        style={style}
      >
        <span className="bg-destructive-soft text-destructive mb-1 flex size-11 items-center justify-center rounded-full">
          <CircleAlert aria-hidden className="size-5" />
        </span>
        <p className="font-heading text-sm font-bold">{t.errorTitle}</p>
        <p className="text-muted-foreground max-w-xs text-sm">{errorText}</p>
        {onRetry ? (
          <Button variant="outline" className="mt-1" onClick={onRetry}>
            {t.retry}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!ready || !option) {
    return (
      <div
        data-testid="chart-empty"
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-6 text-center",
          className,
        )}
        style={style}
      >
        <span className="bg-secondary text-secondary-foreground mb-1 flex size-11 items-center justify-center rounded-full">
          <ChartNoAxesColumn aria-hidden className="size-5" />
        </span>
        <p className="text-muted-foreground max-w-xs text-sm">{emptyText}</p>
      </div>
    );
  }

  const description = describeChart(data, type, formatValue);

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div
        role="img"
        aria-label={`${title}. ${description}`}
        data-testid={testId}
        data-chart-type={type}
        dir="ltr"
        className="relative w-full"
        style={{ height }}
      >
        <ChartCanvas
          option={option}
          onInstance={onInstance}
          className="absolute inset-0"
        />
      </div>
      <ChartDataTable
        title={title}
        data={data}
        formatValue={formatValue}
        categoryLabel={categoryLabel}
        visible={showTable}
      />
    </div>
  );
}

interface ChartDataTableProps {
  title: string;
  data: ChartData;
  formatValue: ValueFormatter;
  categoryLabel: string;
  visible: boolean;
}

/** The chart's numbers as a table: for screen readers, or on "View data". */
function ChartDataTable({
  title,
  data,
  formatValue,
  categoryLabel,
  visible,
}: ChartDataTableProps) {
  return (
    <div
      className={cn(
        visible ? "max-h-72 overflow-auto rounded-xl border" : "sr-only",
      )}
      data-testid={visible ? "chart-data-table" : undefined}
    >
      <table className="w-full text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="bg-surface-muted/60 sticky top-0">
          <tr>
            <th
              scope="col"
              className="text-muted-foreground px-3 py-2 text-start text-[11px] font-semibold tracking-[0.06em] uppercase"
            >
              {categoryLabel}
            </th>
            {data.series.map((s) => (
              <th
                key={s.key}
                scope="col"
                className="text-muted-foreground px-3 py-2 text-end text-[11px] font-semibold tracking-[0.06em] uppercase"
              >
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.categories.map((c, i) => (
            <tr key={c.key} className="border-border/70 border-t">
              <th scope="row" className="px-3 py-2 text-start font-medium">
                {c.label}
              </th>
              {data.series.map((s) => (
                <td key={s.key} className="px-3 py-2 text-end tabular-nums">
                  {formatValue(s.values[i] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
