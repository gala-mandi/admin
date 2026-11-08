"use client";

import {
  type ColumnVisibilityState,
  functionalUpdate,
  type Header,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChartColumn,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Inbox,
  Table2,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type DataTableColumn,
  type DataTableFeatures,
  dataTableColumnHelper,
  dataTableFeatures,
  getChartColumns,
  getLabelledColumns,
} from "./columns";
import type { DataTableChartViewProps } from "./chart-view";
import { dataTableText as t } from "./text";
import { formatCount } from "@/lib/format";

/**
 * The chart view (and with it the chart UI and ECharts) only loads when
 * someone switches a table to "Chart".
 */
const DataTableChartView = dynamic(() => import("./chart-view"), {
  ssr: false,
  loading: () => (
    <div className="p-5">
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  ),
}) as <TData extends RowData>(
  props: DataTableChartViewProps<TData>,
) => ReactNode;

export type DataTableView = "table" | "chart";

/** Options of the "Table | Chart" toggle. */
export interface DataTableChartViewOptions<TData extends RowData> {
  /** Remembers the chart type (`localStorage`); default the caption. */
  id?: string;
  /**
   * Rows to chart, e.g. every row matching the filters. Default the loaded
   * page (`data`); then the pager stays to chart other pages.
   */
  rows?: TData[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** How many rows `rows` stands for (shows "first N of M" when more). */
  total?: number;
  /** Name of the count measure, e.g. "Shops". */
  countLabel?: string;
  /** Group by this column (or `<id>:month` / `<id>:day`) first. */
  defaultGroupBy?: string;
}

export interface DataTableProps<TData extends RowData> {
  /** Stable (module scope or memoised) column definitions. */
  columns: DataTableColumn<TData>[];
  /** The current page from the server; `undefined` while nothing is loaded. */
  data: TData[] | undefined;
  getRowId: (row: TData) => string;
  /** Total rows on the server (for the page count). */
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: (next: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (next: SortingState) => void;
  /** First load: skeleton rows instead of data. */
  isLoading: boolean;
  /** A later page is loading while the previous one is still shown. */
  isFetching?: boolean;
  isError: boolean;
  onRetry?: () => void;
  /** Shown in place of the rows when the server returned none. */
  empty?: ReactNode;
  /** Accessible name of the table (visually hidden caption). */
  caption: string;
  /** Mouse convenience; every row must also have a keyboard link. */
  onRowClick?: (row: TData) => void;
  /**
   * Bulk select: pass both to get a checkbox column. Keyed by `getRowId`;
   * the selection survives paging, so clear it when the list changes if
   * that suits the page.
   */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (next: RowSelectionState) => void;
  /** Name of a row for its checkbox label ("Select <name>"); default the id. */
  getRowLabel?: (row: TData) => string;
  /**
   * Buttons shown in the bar above the table while rows are selected. Gets
   * the selected rows of the loaded page and every selected id.
   */
  bulkActions?: (selectedRows: TData[], selectedIds: string[]) => ReactNode;
  /** Hidden columns (`{ [columnId]: false }`); see `useColumnVisibility`. */
  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: (next: ColumnVisibilityState) => void;
  /**
   * Bar inside the card, above the table: search, filters, result count,
   * column menu, export… (usually a `DataTableToolbar` with `inline`).
   */
  toolbar?: ReactNode;
  /** Shown inside the card below the pager (notes, totals…). */
  footer?: ReactNode;
  /**
   * "Table | Chart" toggle. Shown when a column has `meta.chart.group`;
   * `false` turns it off, an object sets what the chart uses.
   */
  chartView?: false | DataTableChartViewOptions<TData>;
  /** Controlled view; leave out to let the table keep it. */
  view?: DataTableView;
  onViewChange?: (view: DataTableView) => void;
}

const emptyRows: never[] = [];
const emptyObject = {};

function alignClass(align: "start" | "end" | undefined) {
  return align === "end" ? "text-end" : "text-start";
}

/** Roomier padding at the start and end of every row. */
const edgeCell = "px-3 first:ps-4 last:pe-4 sm:first:ps-5 sm:last:pe-5";

function ariaSort(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return "ascending" as const;
  if (sorted === "desc") return "descending" as const;
  return "none" as const;
}

/**
 * Clicks on links, buttons and inputs inside a row keep their own action, and
 * so do clicks in a portal (a row's menu) that React bubbles up to the row.
 */
function fromInteractive(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement;
  if (!event.currentTarget.contains(target)) return true;
  return Boolean(
    target.closest(
      "a, button, input, select, textarea, [role='button'], [role='checkbox'], [role='menuitem']",
    ),
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") {
    return <ArrowUp aria-hidden className="text-link size-3.5 shrink-0" />;
  }
  if (sorted === "desc") {
    return <ArrowDown aria-hidden className="text-link size-3.5 shrink-0" />;
  }
  return (
    <ChevronsUpDown
      aria-hidden
      className="size-3.5 shrink-0 opacity-50 transition-opacity group-hover/sort:opacity-100"
    />
  );
}

function HeaderCell<TData extends RowData>({
  header,
  render,
}: {
  header: Header<DataTableFeatures, TData, unknown>;
  render: ReactNode;
}) {
  const meta = header.column.columnDef.meta;
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();
  const hintId = useId();

  return (
    <TableHead
      scope="col"
      aria-sort={canSort ? ariaSort(sorted) : undefined}
      className={cn(
        "text-muted-foreground h-10 text-[11px] font-semibold tracking-[0.06em] uppercase",
        edgeCell,
        alignClass(meta?.align),
        meta?.className,
      )}
    >
      {header.isPlaceholder ? null : canSort ? (
        <button
          type="button"
          onClick={header.column.getToggleSortingHandler()}
          aria-describedby={hintId}
          className={cn(
            "group/sort hover:text-foreground focus-visible:ring-ring/50 -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 tracking-[0.06em] uppercase transition-colors outline-none focus-visible:ring-3",
            sorted && "text-foreground",
            meta?.align === "end" && "flex-row-reverse",
          )}
        >
          {render}
          <SortIcon sorted={sorted} />
          <span id={hintId} className="sr-only">
            {t.sortHint[sorted || "none"]}
          </span>
        </button>
      ) : (
        render
      )}
    </TableHead>
  );
}

const SELECT_COLUMN_ID = "select";

function selectColumn<TData extends RowData>(
  getRowLabel: (row: TData, id: string) => string,
): DataTableColumn<TData> {
  const col = dataTableColumnHelper<TData>();
  return col.display({
    id: SELECT_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    meta: { className: "w-10" },
    header: ({ table }) => (
      <Checkbox
        aria-label={t.selection.selectPage}
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
        }
        disabled={table.getRowModel().rows.length === 0}
        onCheckedChange={(value) =>
          table.toggleAllPageRowsSelected(value === true)
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={t.selection.selectRow(getRowLabel(row.original, row.id))}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(value === true)}
      />
    ),
  });
}

/** "Table | Chart": two pressed-state buttons. */
function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: DataTableView;
  onChange: (view: DataTableView) => void;
  className?: string;
}) {
  const options = [
    { view: "table" as const, label: t.viewMode.table, icon: Table2 },
    { view: "chart" as const, label: t.viewMode.chart, icon: ChartColumn },
  ];
  return (
    <div
      role="group"
      aria-label={t.viewMode.label}
      className={cn(
        "bg-surface-muted/70 inline-flex shrink-0 self-start rounded-xl p-1 lg:self-center",
        className,
      )}
    >
      {options.map(({ view, label, icon: Icon }) => {
        const on = value === view;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(view)}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,box-shadow] outline-none focus-visible:ring-3",
              on
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** What the chart is based on, under the chart. */
function chartBasis(
  rows: readonly unknown[] | undefined,
  page: boolean,
  rowCount: number,
  total: number | undefined,
): string | null {
  if (!rows) return null;
  const n = rows.length;
  if (page) {
    return rowCount > n
      ? t.chart.basis.page(formatCount(n), formatCount(rowCount))
      : t.chart.basis.all(formatCount(n));
  }
  const all = total ?? n;
  return all > n
    ? t.chart.basis.truncated(formatCount(n), formatCount(all))
    : t.chart.basis.all(formatCount(n));
}

/**
 * Shared list table (TanStack Table v9) with server-side paging and sorting,
 * optional bulk select and column visibility, loading skeleton rows, an empty
 * state and an error state with retry. Tables whose columns have
 * `meta.chart.group` also get a "Table | Chart" toggle (see `chart-view`).
 */
/**
 * The empty and error messages span every column; on a phone the table
 * scrolls sideways, so they stay on the visible part (sticky at the start,
 * as wide as the card) instead of being centred off screen.
 */
const visibleWidthClass = "sticky start-0 w-[var(--data-table-width,100%)]";

/** Keeps `--data-table-width` on the card at its inner width. */
function useVisibleWidth() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () =>
      el.style.setProperty("--data-table-width", `${el.clientWidth}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  rowCount,
  pagination,
  onPaginationChange,
  sorting = emptyRows,
  onSortingChange,
  isLoading,
  isFetching = false,
  isError,
  onRetry,
  empty,
  caption,
  onRowClick,
  rowSelection = emptyObject,
  onRowSelectionChange,
  getRowLabel,
  bulkActions,
  columnVisibility = emptyObject,
  onColumnVisibilityChange,
  toolbar,
  footer,
  chartView,
  view: controlledView,
  onViewChange,
}: DataTableProps<TData>) {
  const selectable = Boolean(onRowSelectionChange);
  const chartable =
    chartView !== false && getChartColumns(columns).groups.length > 0;
  const [ownView, setOwnView] = useState<DataTableView>("table");
  const view: DataTableView = chartable ? (controlledView ?? ownView) : "table";
  const setView = (next: DataTableView) => {
    setOwnView(next);
    onViewChange?.(next);
  };
  const chartOptions = chartView || {};
  const chartRows = chartOptions.rows ?? data;
  const chartsPage = !chartOptions.rows;

  const allColumns = useMemo(
    () =>
      selectable
        ? [
            selectColumn<TData>((row, id) =>
              getRowLabel ? getRowLabel(row) : id,
            ),
            ...columns,
          ]
        : columns,
    [selectable, columns, getRowLabel],
  );

  // Only labelled columns can be hidden, whatever was stored.
  const visibility = useMemo(() => {
    const hideable = new Set(getLabelledColumns(columns).map((c) => c.id));
    return Object.fromEntries(
      Object.entries(columnVisibility).filter(([id]) => hideable.has(id)),
    );
  }, [columns, columnVisibility]);

  const handleSorting: OnChangeFn<SortingState> = (updater) =>
    onSortingChange?.(functionalUpdate(updater, sorting));
  const handlePagination: OnChangeFn<PaginationState> = (updater) =>
    onPaginationChange(functionalUpdate(updater, pagination));
  const handleSelection: OnChangeFn<RowSelectionState> = (updater) =>
    onRowSelectionChange?.(functionalUpdate(updater, rowSelection));
  const handleVisibility: OnChangeFn<ColumnVisibilityState> = (updater) =>
    onColumnVisibilityChange?.(functionalUpdate(updater, visibility));

  const table = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    columns: allColumns,
    data: data ?? (emptyRows as TData[]),
    getRowId: (row) => getRowId(row),
    rowCount,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnVisibility: visibility,
    },
    onSortingChange: handleSorting,
    onPaginationChange: handlePagination,
    onRowSelectionChange: handleSelection,
    onColumnVisibilityChange: handleVisibility,
    manualSorting: true,
    manualPagination: true,
    enableSorting: Boolean(onSortingChange),
    enableMultiSort: false,
    enableSortingRemoval: false,
    enableRowSelection: selectable,
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const columnCount = Math.max(1, visibleColumns.length);
  const rows = table.getRowModel().rows;
  const pageCount = Math.max(1, table.getPageCount());
  const page = pagination.pageIndex + 1;
  const from =
    rowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min(rowCount, from + rows.length - 1);
  const showPager =
    !isLoading &&
    !isError &&
    rowCount > 0 &&
    (view === "table" || (chartsPage && rowCount > rows.length));
  const busy = isLoading || isFetching;

  const selectedIds = Object.keys(rowSelection);
  const selectedRows = selectable
    ? (data ?? []).filter((row) => rowSelection[getRowId(row)])
    : [];

  const frame = useVisibleWidth();

  return (
    <div
      ref={frame}
      className="bg-card text-card-foreground rounded-card shadow-panel overflow-hidden border"
    >
      {toolbar || chartable ? (
        <div
          data-slot="data-table-toolbar"
          className="flex flex-col gap-3 border-b px-4 py-3 sm:px-5 lg:flex-row lg:items-center"
        >
          {toolbar ? <div className="min-w-0 flex-1">{toolbar}</div> : null}
          {chartable ? (
            <ViewToggle
              value={view}
              onChange={setView}
              className={toolbar ? undefined : "ms-auto"}
            />
          ) : null}
        </div>
      ) : null}

      {view === "chart" ? (
        <div data-slot="data-table-chart" className="px-4 py-5 sm:px-5">
          <DataTableChartView
            id={chartOptions.id ?? caption}
            columns={columns}
            rows={chartRows}
            isLoading={chartOptions.isLoading ?? isLoading}
            isError={chartOptions.isError ?? isError}
            onRetry={chartOptions.onRetry ?? onRetry}
            countLabel={chartOptions.countLabel}
            defaultGroupBy={chartOptions.defaultGroupBy}
            footer={chartBasis(
              chartRows,
              chartsPage,
              rowCount,
              chartOptions.total,
            )}
          />
        </div>
      ) : null}

      {view === "table" && selectable && selectedIds.length > 0 ? (
        <div
          role="region"
          aria-label={t.selection.bar}
          className="bg-secondary/60 text-secondary-foreground flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm sm:px-5"
        >
          <span className="font-semibold">
            {t.selection.count(selectedIds.length)}
          </span>
          {bulkActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {bulkActions(selectedRows, selectedIds)}
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => onRowSelectionChange?.({})}
          >
            {t.selection.clear}
          </Button>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading || isError ? "" : t.results(rowCount)}
      </p>

      {view === "table" ? (
        <Table
          aria-busy={busy || undefined}
          className={cn(isFetching && !isLoading && "opacity-60")}
        >
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader className="bg-surface-muted/50">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => (
                  <HeaderCell
                    key={header.id}
                    header={header}
                    render={<table.FlexRender header={header} />}
                  />
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from(
                { length: Math.min(pagination.pageSize, 8) },
                (_, i) => (
                  <TableRow
                    key={`skeleton-${i}`}
                    data-testid="data-table-skeleton-row"
                    className="hover:bg-transparent"
                  >
                    {(visibleColumns.length ? visibleColumns : [null]).map(
                      (column, j) => (
                        <TableCell
                          key={column?.id ?? j}
                          className={cn(
                            "py-4",
                            edgeCell,
                            column?.columnDef.meta?.className,
                          )}
                        >
                          {i === 0 && j === 0 ? (
                            <span className="sr-only" role="status">
                              {t.loading}
                            </span>
                          ) : null}
                          <Skeleton
                            className={cn(
                              "h-4 w-full max-w-40",
                              j === 0 && "max-w-56",
                            )}
                          />
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ),
              )
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columnCount}
                  className="p-0 whitespace-normal"
                >
                  <div
                    role="alert"
                    className={cn(
                      "flex flex-col items-center gap-2 px-6 py-14 text-center",
                      visibleWidthClass,
                    )}
                  >
                    <span className="bg-destructive-soft text-destructive mb-1 flex size-12 items-center justify-center rounded-full">
                      <CircleAlert aria-hidden className="size-5" />
                    </span>
                    <p className="font-heading text-base font-bold">
                      {t.errorTitle}
                    </p>
                    <p className="text-muted-foreground max-w-sm text-sm">
                      {t.errorBody}
                    </p>
                    {onRetry ? (
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={onRetry}
                      >
                        {t.retry}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columnCount}
                  className="p-0 whitespace-normal"
                >
                  <div className={visibleWidthClass}>
                    {empty ?? (
                      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                        <span className="bg-secondary text-secondary-foreground mb-1 flex size-12 items-center justify-center rounded-full">
                          <Inbox aria-hidden className="size-5" />
                        </span>
                        <p className="text-muted-foreground">{t.emptyTitle}</p>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={
                    selectable && row.getIsSelected() ? "selected" : undefined
                  }
                  onClick={
                    onRowClick
                      ? (event) => {
                          if (!fromInteractive(event)) onRowClick(row.original);
                        }
                      : undefined
                  }
                  className={cn(
                    "border-border/70 hover:bg-muted/40",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-3.5",
                          edgeCell,
                          alignClass(meta?.align),
                          meta?.className,
                        )}
                      >
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}

      {showPager ? (
        <nav
          aria-label={t.pagination.label}
          className="bg-surface-muted/30 flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <p className="text-muted-foreground tabular-nums">
            {t.pagination.range(from, to, rowCount)}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground me-1 tabular-nums">
              {t.pagination.page(page, pageCount)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t.pagination.previous}
              disabled={!table.getCanPreviousPage() || busy}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft aria-hidden className="rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t.pagination.next}
              disabled={!table.getCanNextPage() || busy}
              onClick={() => table.nextPage()}
            >
              <ChevronRight aria-hidden className="rtl:rotate-180" />
            </Button>
          </div>
        </nav>
      ) : null}

      {footer ? (
        <div
          data-slot="data-table-footer"
          className="border-t px-4 py-3 text-sm sm:px-5"
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
