"use client";

import type { PaginationState } from "@tanstack/react-table";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  dataTableColumnHelper,
  type DataTableView,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { cityChartMeta, statusChartMeta } from "@/features/tenants/chart-meta";
import { StatusBadge } from "@/features/tenants/components/status-badge";
import { formatCount, formatDate, formatRelative } from "@/lib/format";
import { shopRoutes } from "@/lib/routes";
import {
  INACTIVE_SHOPS_CHART_LIMIT,
  INACTIVE_SHOPS_PAGE_SIZE,
  useInactiveShops,
} from "../hooks";
import { statsText } from "../text";
import type { InactiveShop } from "../types";

const t = statsText.inactive;

const col = dataTableColumnHelper<InactiveShop>();

const columns: DataTableColumn<InactiveShop>[] = col.columns([
  col.accessor("name", {
    header: t.columns.shop,
    enableSorting: false,
    meta: { label: t.columns.shop, className: "whitespace-normal" },
    cell: ({ row }) => (
      <Link
        href={shopRoutes.detail(row.original.id)}
        className="text-foreground focus-visible:ring-ring/50 rounded-sm font-semibold break-words outline-none hover:underline focus-visible:ring-3"
      >
        {row.original.name}
      </Link>
    ),
  }),
  col.accessor("city", {
    header: t.columns.city,
    enableSorting: false,
    meta: {
      label: t.columns.city,
      className: "hidden md:table-cell",
      chart: cityChartMeta,
    },
    cell: ({ getValue }) => getValue<string | null>() ?? statsText.none,
  }),
  col.accessor("status", {
    header: t.columns.status,
    enableSorting: false,
    meta: { label: t.columns.status, chart: statusChartMeta },
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  col.accessor("lastActivityAt", {
    header: t.columns.lastActivity,
    enableSorting: false,
    meta: { label: t.columns.lastActivity, chart: { group: "date" } },
    cell: ({ row }) => (
      <time
        dateTime={row.original.lastActivityAt}
        title={formatDate(row.original.lastActivityAt)}
        className="text-muted-foreground"
      >
        {formatRelative(row.original.lastActivityAt)}
      </time>
    ),
  }),
]);

const getRowId = (row: InactiveShop) => row.id;

/** Trial and active shops with no activity of their own in 14 days, longest idle first. */
export function InactiveShops() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: INACTIVE_SHOPS_PAGE_SIZE,
  });
  const query = useInactiveShops({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });
  const total = query.data?.meta.total;
  const [view, setView] = useState<DataTableView>("table");
  // The chart reads up to 100 inactive shops in one request, not just the
  // 10 on this page; only while it's shown.
  const chartQuery = useInactiveShops(
    { page: 1, limit: INACTIVE_SHOPS_CHART_LIMIT },
    { enabled: view === "chart" },
  );

  return (
    <section
      aria-labelledby="inactive-shops-title"
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2
            id="inactive-shops-title"
            className="font-heading text-base font-bold"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground text-sm">{t.description}</p>
        </div>
        {total === undefined ? null : (
          <p
            data-testid="inactive-shops-count"
            className="text-muted-foreground text-sm tabular-nums"
          >
            {t.count(formatCount(total))}
          </p>
        )}
      </div>
      <DataTable
        caption={t.caption}
        columns={columns}
        data={query.data?.data}
        getRowId={getRowId}
        rowCount={total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={query.isPending}
        isFetching={query.isPlaceholderData}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        view={view}
        onViewChange={setView}
        chartView={{
          id: "inactive-shops",
          rows: chartQuery.data?.data,
          total: chartQuery.data?.meta.total,
          isLoading: chartQuery.isPending,
          isError: chartQuery.isError,
          onRetry: () => void chartQuery.refetch(),
          countLabel: t.chartCount,
          defaultGroupBy: "lastActivityAt:month",
        }}
        empty={
          <EmptyState
            icon={CircleCheck}
            title={t.empty}
            className="rounded-none border-0 shadow-none"
          />
        }
      />
    </section>
  );
}
