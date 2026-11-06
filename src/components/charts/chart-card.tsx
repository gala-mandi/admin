"use client";

import { ChevronDown, ImageDown, Table2, ZoomIn } from "lucide-react";
import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_TIME_ZONE } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Chart, type ChartProps } from "./chart";
import type { EChartsType } from "./echarts";
import { chartTypeIcons } from "./icons";
import { canZoom, chartTypesFor, resolveChartType } from "./registry";
import { useStoredChartType } from "./storage";
import { hideItems, isChartEmpty, legendItems } from "./summary";
import { chartText, chartTypeLabels } from "./text";
import { colorFor, useChartTheme } from "./theme";
import type { ChartType } from "./types";

const t = chartText.toolbar;

const karachiDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `shops-by-city` → `shops-by-city-2026-11-06.png` (Karachi date). */
export function chartFileName(base: string, now: Date = new Date()): string {
  return `${base}-${karachiDay.format(now)}.png`;
}

export interface ChartTypeSwitcherProps {
  value: ChartType;
  types: readonly ChartType[];
  onChange: (type: ChartType) => void;
  disabled?: boolean;
}

/** Dropdown of the chart types that fit the data, each with its icon. */
export function ChartTypeSwitcher({
  value,
  types,
  onChange,
  disabled,
}: ChartTypeSwitcherProps) {
  const Icon = chartTypeIcons[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || types.length < 2}>
        <Button
          variant="outline"
          size="sm"
          aria-label={t.typeButton(chartTypeLabels[value])}
          className="h-8 gap-1.5 rounded-lg px-2.5"
        >
          <Icon aria-hidden />
          <span className="hidden sm:inline">{chartTypeLabels[value]}</span>
          <ChevronDown aria-hidden className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>{t.type}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as ChartType)}
        >
          {types.map((type) => {
            const TypeIcon = chartTypeIcons[type];
            return (
              <DropdownMenuRadioItem key={type} value={type}>
                <TypeIcon aria-hidden className="text-muted-foreground" />
                {chartTypeLabels[type]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarToggle({
  label,
  pressed,
  onClick,
  children,
  title,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      onClick={onClick}
      className={cn(
        "text-muted-foreground rounded-lg",
        pressed && "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </Button>
  );
}

export interface ChartCardProps extends Omit<
  ChartProps,
  "type" | "showTable" | "onInstance" | "zoom"
> {
  /** Remembers the chosen type under this id (`localStorage`). */
  id: string;
  description?: ReactNode;
  /** Used until the person picks another type (if it fits the data). */
  defaultType?: ChartType;
  /** Time series: start with the zoom bar on (default true). */
  defaultZoom?: boolean;
  /** Extra controls under the title (e.g. "Group by" / "Measure"). */
  controls?: ReactNode;
  /** A note under the chart (e.g. what the data is based on). */
  footer?: ReactNode;
  /** `plain` drops the card frame, for a chart inside another card. */
  variant?: "card" | "plain";
  headingLevel?: "h2" | "h3";
  /** Base name of the PNG; default `id`. */
  fileName?: string;
}

const emptyHidden: ReadonlySet<string> = new Set();

/**
 * A chart in a card: title, chart-type switcher (only types that fit the
 * data, remembered per chart), and a toolbar with zoom (time series),
 * "Download PNG" and "View data"; under the chart, legend toggles when there
 * is more than one series or slice.
 */
export function ChartCard({
  id,
  title,
  description,
  data,
  defaultType,
  defaultZoom = true,
  controls,
  footer,
  variant = "card",
  headingLevel: Heading = "h2",
  fileName,
  className,
  testId,
  ...chartProps
}: ChartCardProps) {
  const titleId = useId();
  const theme = useChartTheme();
  const [stored, saveType] = useStoredChartType(id);
  const [zoom, setZoom] = useState(defaultZoom);
  const [showTable, setShowTable] = useState(false);
  const [hiddenState, setHidden] = useState<{
    type: ChartType | null;
    keys: ReadonlySet<string>;
  }>({ type: null, keys: emptyHidden });
  const chartRef = useRef<EChartsType | null>(null);
  const onInstance = useCallback((chart: EChartsType | null) => {
    chartRef.current = chart;
  }, []);

  const types = data ? chartTypesFor(data) : [];
  // The stored choice if it fits this data, else the default, else the
  // shape's first type.
  const type: ChartType = data
    ? stored && types.includes(stored)
      ? stored
      : resolveChartType(data, defaultType)
    : (stored ?? defaultType ?? "bar");
  // Hidden items belong to one type; switching type shows everything again.
  const hidden = hiddenState.type === type ? hiddenState.keys : emptyHidden;
  const legend = data ? legendItems(data, type) : [];
  const shown = data ? hideItems(data, hidden, theme.palette) : data;
  const allHidden = legend.length > 0 && legend.every((i) => hidden.has(i.key));
  const hasChart =
    !chartProps.isLoading && !chartProps.isError && !isChartEmpty(data);
  const zoomable = data ? canZoom(data, type) : false;

  const toggleItem = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden({ type, keys: next });
  };

  const download = () => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      const url = chart.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: theme.surface,
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = chartFileName(fileName ?? id);
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      toast.error(t.downloadFailed);
    }
  };

  return (
    <section
      aria-labelledby={titleId}
      data-chart-card={id}
      className={cn(
        "flex min-w-0 flex-col gap-4",
        variant === "card" &&
          "bg-card text-card-foreground rounded-card shadow-panel border p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
          <Heading
            id={titleId}
            className="font-heading text-base font-bold tracking-tight"
          >
            {title}
          </Heading>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        <div
          role="toolbar"
          aria-label={t.label(title)}
          className="flex shrink-0 items-center gap-1"
        >
          <ChartTypeSwitcher
            value={type}
            types={types}
            disabled={!hasChart}
            onChange={saveType}
          />
          {zoomable && hasChart ? (
            <ToolbarToggle
              label={t.zoom}
              title={t.zoomHint}
              pressed={zoom}
              onClick={() => setZoom((z) => !z)}
            >
              <ZoomIn aria-hidden />
            </ToolbarToggle>
          ) : null}
          {hasChart ? (
            <>
              <ToolbarToggle
                label={t.viewData}
                pressed={showTable}
                onClick={() => setShowTable((s) => !s)}
              >
                <Table2 aria-hidden />
              </ToolbarToggle>
              <ToolbarToggle label={t.download} onClick={download}>
                <ImageDown aria-hidden />
              </ToolbarToggle>
            </>
          ) : null}
        </div>
      </div>

      {controls ? (
        <div className="flex flex-wrap items-end gap-3">{controls}</div>
      ) : null}

      {allHidden ? (
        <p
          className="text-muted-foreground flex items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm"
          style={{ minHeight: chartProps.height ?? 288 }}
        >
          {t.allHidden}
        </p>
      ) : (
        <Chart
          {...chartProps}
          title={title}
          data={shown}
          type={type}
          zoom={zoomable && zoom}
          showTable={showTable}
          onInstance={onInstance}
          testId={testId}
        />
      )}

      {hasChart && legend.length > 1 ? (
        <ul
          aria-label={t.legend}
          className="-mt-1 flex flex-wrap items-center gap-1.5"
        >
          {legend.map((item) => {
            const on = !hidden.has(item.key);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleItem(item.key)}
                  className={cn(
                    "focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-[opacity,background-color] outline-none focus-visible:ring-3",
                    on
                      ? "bg-background/60 text-foreground hover:bg-muted"
                      : "text-muted-foreground line-through opacity-60 hover:opacity-90",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      background: on
                        ? colorFor(theme, item.index, item.colorVar)
                        : "currentColor",
                    }}
                  />
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {footer ? (
        <div className="text-muted-foreground text-xs">{footer}</div>
      ) : null}
    </section>
  );
}
