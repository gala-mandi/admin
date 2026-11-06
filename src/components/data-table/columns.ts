import {
  type ColumnDef,
  columnVisibilityFeature,
  createColumnHelper,
  metaHelper,
  type RowData,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

/** A cell value as it goes into the Excel export. */
export type DataTableExportValue =
  string | number | boolean | Date | null | undefined;

/** Per-column hints read by `DataTable` and its toolbar pieces. */
export interface DataTableColumnMeta {
  /** `end` for numbers. Logical, so it flips in RTL. */
  align?: "start" | "end";
  /** Extra classes for the header and body cells of this column. */
  className?: string;
  /**
   * Plain-text name of the column, used by the column menu and as the Excel
   * header. Columns without a label (row select, row actions) can't be hidden
   * and aren't exported.
   */
  label?: string;
  /**
   * The value written to Excel for a row; defaults to the accessor value.
   * Typed loosely because the meta type is shared by every table; annotate
   * the row type where you define it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportValue?: (row: any) => DataTableExportValue;
  /**
   * How the "Table | Chart" view may use this column. Optional: a table
   * without any `chart.group` column has no chart view. Needs `label`.
   */
  chart?: DataTableColumnChart;
}

/** Chart-view hints of one column (`meta.chart`). */
export interface DataTableColumnChart {
  /**
   * Rows can be grouped by this column: `category` (one bar/slice per
   * value) or `date` (per month or per day, Pakistan time).
   */
  group?: "category" | "date";
  /**
   * A plain-number column the chart can sum or average (counts, users…).
   * Never mark a money column: money isn't added up with floats.
   */
  measure?: boolean;
  /** Value to group or measure by; default the accessor value. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: (row: any) => unknown;
  /** Label of a group key, e.g. `active` → "Active"; default the key. */
  groupLabel?: (key: string) => string;
  /** Fixed order of the groups (e.g. statuses); default biggest first. */
  order?: readonly string[];
  /** Colour token per group key when the colour means something (status). */
  colors?: Readonly<Record<string, string>>;
}

/**
 * Features every `DataTable` registers. Paging and sorting are done by the
 * server (`manualPagination`, `manualSorting`), so no client row models.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;

/** Columns of one table have different value types, hence `any`. */
export type DataTableColumn<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

/** Typed column helper for a `DataTable` of `TData` rows. */
export function dataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

interface LooseColumnDef {
  id?: string;
  accessorKey?: unknown;
  accessorFn?: (row: unknown, index: number) => unknown;
  header?: unknown;
  meta?: DataTableColumnMeta;
}

/** The id TanStack gives a column (same rule as its `constructColumn`). */
export function getColumnId<TData extends RowData>(
  column: DataTableColumn<TData>,
): string | undefined {
  const def = column as LooseColumnDef;
  if (def.id) return def.id;
  if (def.accessorKey !== undefined) {
    return String(def.accessorKey).replaceAll(".", "_");
  }
  return typeof def.header === "string" ? def.header : undefined;
}

/** A column the user can hide and that is exported (it has `meta.label`). */
export interface LabelledColumn<TData extends RowData> {
  id: string;
  label: string;
  /** Export value of a row (`meta.exportValue`, else the accessor). */
  value: (row: TData, index: number) => DataTableExportValue;
}

function readPath(row: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value == null ? undefined : (value as Record<string, unknown>)[key],
      row,
    );
}

function toExportValue(value: unknown): DataTableExportValue {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value as DataTableExportValue;
  }
  return String(value);
}

/** Columns with a `meta.label`, in table order. */
export function getLabelledColumns<TData extends RowData>(
  columns: DataTableColumn<TData>[],
): LabelledColumn<TData>[] {
  const out: LabelledColumn<TData>[] = [];
  for (const column of columns) {
    const def = column as LooseColumnDef;
    const id = getColumnId(column);
    const label = def.meta?.label;
    if (!id || !label) continue;
    const exportValue = def.meta?.exportValue;
    const value = (row: TData, index: number): DataTableExportValue => {
      if (exportValue) return exportValue(row);
      if (def.accessorFn) return toExportValue(def.accessorFn(row, index));
      if (def.accessorKey !== undefined) {
        return toExportValue(readPath(row, String(def.accessorKey)));
      }
      return undefined;
    };
    out.push({ id, label, value });
  }
  return out;
}

/** A column the chart view can group by. */
export interface ChartGroupColumn<TData extends RowData> {
  id: string;
  label: string;
  kind: "category" | "date";
  value: (row: TData, index: number) => unknown;
  groupLabel?: (key: string) => string;
  order?: readonly string[];
  colors?: Readonly<Record<string, string>>;
}

/** A numeric column the chart view can sum or average. */
export interface ChartMeasureColumn<TData extends RowData> {
  id: string;
  label: string;
  value: (row: TData, index: number) => unknown;
}

function rawValue<TData extends RowData>(def: LooseColumnDef) {
  return (row: TData, index: number): unknown => {
    if (def.meta?.chart?.value) return def.meta.chart.value(row);
    if (def.accessorFn) return def.accessorFn(row, index);
    if (def.accessorKey !== undefined) {
      return readPath(row, String(def.accessorKey));
    }
    return undefined;
  };
}

/** The labelled columns with `meta.chart` hints, in table order. */
export function getChartColumns<TData extends RowData>(
  columns: DataTableColumn<TData>[],
): {
  groups: ChartGroupColumn<TData>[];
  measures: ChartMeasureColumn<TData>[];
} {
  const groups: ChartGroupColumn<TData>[] = [];
  const measures: ChartMeasureColumn<TData>[] = [];
  for (const column of columns) {
    const def = column as LooseColumnDef;
    const chart = def.meta?.chart;
    const id = getColumnId(column);
    const label = def.meta?.label;
    if (!chart || !id || !label) continue;
    const value = rawValue<TData>(def);
    if (chart.group) {
      groups.push({
        id,
        label,
        kind: chart.group,
        value,
        groupLabel: chart.groupLabel,
        order: chart.order,
        colors: chart.colors,
      });
    }
    if (chart.measure) measures.push({ id, label, value });
  }
  return { groups, measures };
}
