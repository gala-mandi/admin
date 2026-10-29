"use client";

import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
} from "@/components/data-table";
import { formatDate } from "@/lib/format";
import { shopRoutes } from "@/lib/routes";
import { shopsListText as t, tenantStatusText } from "../text";
import type { TenantSummary } from "../types";
import { StatusBadge } from "./status-badge";

const col = dataTableColumnHelper<TenantSummary>();

/** Columns of the shops list. Only `name` and `createdAt` sort (server-side). */
export const shopColumns: DataTableColumn<TenantSummary>[] = col.columns([
  col.accessor("name", {
    header: t.columns.shop,
    meta: { label: t.columns.shop },
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <Link
          href={shopRoutes.detail(row.original.id)}
          className="text-foreground focus-visible:ring-ring/50 w-fit rounded-sm font-semibold outline-none hover:underline focus-visible:ring-3"
        >
          {row.original.name}
        </Link>
        <span className="text-muted-foreground text-xs">
          {row.original.city || t.noCity}
        </span>
      </div>
    ),
  }),
  col.accessor("ownerName", {
    header: t.columns.owner,
    enableSorting: false,
    meta: { label: t.columns.owner },
  }),
  col.accessor("phone", {
    header: t.columns.phone,
    enableSorting: false,
    meta: { label: t.columns.phone },
    cell: ({ getValue }) => <span dir="ltr">{getValue()}</span>,
  }),
  col.accessor("status", {
    header: t.columns.status,
    enableSorting: false,
    meta: {
      label: t.columns.status,
      exportValue: (row: TenantSummary) => tenantStatusText[row.status],
    },
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  col.accessor("userCount", {
    header: t.columns.users,
    enableSorting: false,
    meta: { align: "end", label: t.columns.users },
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
  }),
  col.accessor("createdAt", {
    header: t.columns.created,
    sortDescFirst: true,
    meta: {
      label: t.columns.created,
      exportValue: (row: TenantSummary) => formatDate(row.createdAt),
    },
    cell: ({ getValue }) => (
      <time dateTime={getValue()} className="text-muted-foreground">
        {formatDate(getValue())}
      </time>
    ),
  }),
]);
