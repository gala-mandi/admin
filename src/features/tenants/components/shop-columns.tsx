"use client";

import { Eye, MapPin, Pencil, Phone, Users } from "lucide-react";
import Link from "next/link";
import {
  type DataTableColumn,
  dataTableColumnHelper,
  DataTableRowActions,
} from "@/components/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatDate, formatRelative } from "@/lib/format";
import { shopRoutes } from "@/lib/routes";
import { shopsListText as t, tenantStatusText } from "../text";
import type { TenantSummary } from "../types";
import { ShopAvatar } from "./shop-avatar";
import { StatusBadge } from "./status-badge";

const col = dataTableColumnHelper<TenantSummary>();

/** Kept off small screens so a phone shows shop, status and actions. */
const wideOnly = "hidden lg:table-cell";
const tabletUp = "hidden md:table-cell";

/** Columns of the shops list. Only `name` and `createdAt` sort (server-side). */
export const shopColumns: DataTableColumn<TenantSummary>[] = col.columns([
  col.accessor("name", {
    header: t.columns.shop,
    // Wraps on phones so status and actions still fit without scrolling.
    meta: {
      label: t.columns.shop,
      className: "whitespace-normal md:whitespace-nowrap",
    },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <ShopAvatar id={row.original.id} name={row.original.name} />
        <div className="flex min-w-0 flex-col">
          <Link
            href={shopRoutes.detail(row.original.id)}
            className="text-foreground focus-visible:ring-ring/50 w-fit rounded-sm font-semibold break-words outline-none hover:underline focus-visible:ring-3 md:max-w-64 md:truncate"
          >
            {row.original.name}
          </Link>
          <span
            dir="ltr"
            className="text-muted-foreground w-fit text-xs break-all md:max-w-64 md:truncate"
          >
            {row.original.slug}
          </span>
        </div>
      </div>
    ),
  }),
  col.accessor("ownerName", {
    header: t.columns.owner,
    enableSorting: false,
    meta: {
      label: t.columns.owner,
      className: tabletUp,
      exportValue: (row: TenantSummary) =>
        t.ownerExport(row.ownerName, row.phone),
    },
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <span className="max-w-56 truncate font-medium">
          {row.original.ownerName}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Phone aria-hidden className="size-3 shrink-0" />
          <span className="sr-only">{t.shopPhone}: </span>
          <span dir="ltr" className="tabular-nums">
            {row.original.phone}
          </span>
        </span>
      </div>
    ),
  }),
  col.accessor("city", {
    header: t.columns.city,
    enableSorting: false,
    meta: { label: t.columns.city, className: wideOnly },
    cell: ({ getValue }) => {
      const city = getValue();
      return city ? (
        <span className="flex items-center gap-1.5">
          <MapPin
            aria-hidden
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <span className="max-w-40 truncate">{city}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">{t.noValue}</span>
      );
    },
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
    meta: { align: "end", label: t.columns.users, className: wideOnly },
    cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <Users aria-hidden className="text-muted-foreground size-3.5" />
        {getValue()}
      </span>
    ),
  }),
  col.accessor("createdAt", {
    header: t.columns.created,
    sortDescFirst: true,
    meta: {
      label: t.columns.created,
      className: wideOnly,
      exportValue: (row: TenantSummary) => formatDate(row.createdAt),
    },
    cell: ({ getValue }) => (
      <div className="flex flex-col">
        <time dateTime={getValue()} className="font-medium">
          {formatDate(getValue())}
        </time>
        <span className="text-muted-foreground text-xs">
          {formatRelative(getValue())}
        </span>
      </div>
    ),
  }),
  col.display({
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    meta: { align: "end", className: "w-12" },
    header: () => <span className="sr-only">{t.columns.actions}</span>,
    cell: ({ row }) => (
      <DataTableRowActions rowName={row.original.name}>
        <DropdownMenuItem asChild>
          <Link href={shopRoutes.detail(row.original.id)}>
            <Eye aria-hidden />
            {t.rowActions.view}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={shopRoutes.edit(row.original.id)}>
            <Pencil aria-hidden />
            {t.rowActions.edit}
          </Link>
        </DropdownMenuItem>
      </DataTableRowActions>
    ),
  }),
]);
