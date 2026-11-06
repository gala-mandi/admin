"use client";

import type { RowData } from "@tanstack/react-table";
import { type ReactNode, useId, useMemo, useState } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { calendarLabelLong } from "@/components/charts/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type DataTableColumn, getChartColumns } from "./columns";
import { groupOptions, groupRows, measureOptions } from "./chart-data";
import { dataTableText } from "./text";

const t = dataTableText.chart;

export interface DataTableChartViewProps<TData extends RowData> {
  /** Remembers the chart type per table and grouping. */
  id: string;
  columns: DataTableColumn<TData>[];
  /** The rows to chart (the table's current filtered rows). */
  rows: readonly TData[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  /** Name of the "count" measure, e.g. "Shops"; default "Number of rows". */
  countLabel?: string;
  /** Column id (or `<id>:month` / `<id>:day`) to group by first. */
  defaultGroupBy?: string;
  /** Note under the chart (what rows it's based on). */
  footer?: ReactNode;
}

function LabelledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const triggerId = useId();
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-56">
      <label
        id={labelId}
        htmlFor={triggerId}
        className="text-[13px] font-semibold"
      >
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={triggerId}
          aria-labelledby={labelId}
          className="rounded-field bg-card data-[size=default]:h-10 w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * The chart side of the DataTable "Table | Chart" toggle: pick a column to
 * group by and a measure (count, or the total/average of a number column);
 * the chart can switch type like every other chart.
 */
export default function DataTableChartView<TData extends RowData>({
  id,
  columns,
  rows,
  isLoading,
  isError,
  onRetry,
  countLabel,
  defaultGroupBy,
  footer,
}: DataTableChartViewProps<TData>) {
  const { groups, measures } = useMemo(
    () => getChartColumns(columns),
    [columns],
  );
  const groupList = useMemo(() => groupOptions(groups), [groups]);
  const measureList = useMemo(
    () => measureOptions(measures, countLabel),
    [measures, countLabel],
  );

  const [groupId, setGroupId] = useState(
    () =>
      groupList.find((g) => g.id === defaultGroupBy)?.id ?? groupList[0]?.id,
  );
  const [measureId, setMeasureId] = useState("count");
  const group = groupList.find((g) => g.id === groupId) ?? groupList[0];
  const measure =
    measureList.find((m) => m.id === measureId) ?? measureList[0]!;

  const data = useMemo(
    () => (rows && group ? groupRows(rows, group, measure) : undefined),
    [rows, group, measure],
  );

  if (!group) return null;

  return (
    <ChartCard
      id={`table-${id}-${group.id}`}
      fileName={`${id}-chart`}
      variant="plain"
      testId="data-table-chart"
      title={t.title(measure.label, group.label)}
      data={data}
      defaultType={group.bucket ? "area" : "bar"}
      categoryLabel={group.label}
      formatCategoryLong={group.bucket ? calendarLabelLong : undefined}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      emptyText={t.empty}
      footer={footer}
      controls={
        <>
          <LabelledSelect
            label={t.groupBy}
            value={group.id}
            options={groupList}
            onChange={setGroupId}
          />
          <LabelledSelect
            label={t.measure}
            value={measure.id}
            options={measureList}
            onChange={setMeasureId}
          />
        </>
      }
    />
  );
}
