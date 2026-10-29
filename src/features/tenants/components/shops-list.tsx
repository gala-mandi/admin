"use client";

import { Plus, Search, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DataTable,
  DataTableExport,
  DataTableStatusFilter,
  DataTableToolbar,
  DataTableViewOptions,
  useColumnVisibility,
  useDataTableState,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";
import { toApiError } from "@/lib/api-error";
import { toListSearchParams } from "@/lib/list-query";
import { shopRoutes } from "@/lib/routes";
import { useTenants } from "../hooks";
import {
  SHOPS_PAGE_SIZE,
  SHOPS_TABLE_ID,
  shopListFilters,
  shopSortFields,
} from "../search-params";
import { shopsListText as t, tenantStatusText } from "../text";
import { type TenantSummary, tenantStatuses } from "../types";
import { shopColumns } from "./shop-columns";
import { statusDotClass } from "./status-badge";

const section = panelText.sections.shops;

const statusOptions = tenantStatuses.map((status) => ({
  value: status,
  label: tenantStatusText[status],
  dotClassName: statusDotClass[status],
}));

const getRowId = (row: TenantSummary) => row.id;

/**
 * `/shops`: search, status filter, sort and page live in the URL
 * (`?q=&status=&page=&sort=`), so reload and Back keep them.
 */
export function ShopsList() {
  const router = useRouter();
  const list = useDataTableState({
    filters: shopListFilters,
    sortFields: shopSortFields,
    defaultSort: "-createdAt",
    pageSize: SHOPS_PAGE_SIZE,
  });
  const { columnVisibility, onColumnVisibilityChange } =
    useColumnVisibility(SHOPS_TABLE_ID);

  const query = useTenants(toListSearchParams(list.listParams));
  const rows = query.data?.data;

  if (query.isError && toApiError(query.error).status === 403) {
    return <ForbiddenState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={section.label}
        description={section.description}
        actions={
          <Button asChild size="lg" className="h-10 gap-2 px-4 font-semibold">
            <Link href={shopRoutes.create}>
              <Plus aria-hidden />
              {t.newShop}
            </Link>
          </Button>
        }
      />

      <DataTableToolbar
        search={{
          value: list.search,
          onChange: list.setSearch,
          label: t.searchLabel,
          placeholder: t.searchPlaceholder,
        }}
        filters={
          <DataTableStatusFilter
            label={t.statusLabel}
            allLabel={t.statusAll}
            value={list.filters.status}
            options={statusOptions}
            onChange={(status) => list.setFilter("status", status)}
          />
        }
        isFiltered={list.isFiltered}
        onClearFilters={list.clearAll}
        actions={
          <>
            <DataTableViewOptions
              columns={shopColumns}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={onColumnVisibilityChange}
            />
            <DataTableExport
              fileName={t.exportFileName}
              columns={shopColumns}
              rows={rows}
              columnVisibility={columnVisibility}
            />
          </>
        }
      />

      <DataTable
        caption={t.caption}
        columns={shopColumns}
        data={rows}
        getRowId={getRowId}
        rowCount={query.data?.meta.total ?? 0}
        pagination={list.pagination}
        onPaginationChange={list.onPaginationChange}
        sorting={list.sorting}
        onSortingChange={list.onSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
        isLoading={query.isPending}
        isFetching={query.isPlaceholderData}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => router.push(shopRoutes.detail(row.id))}
        empty={
          list.isFiltered ? (
            <EmptyState
              icon={Search}
              title={t.noMatches.title}
              body={t.noMatches.body}
              className="rounded-none border-0"
              action={
                <Button variant="outline" onClick={list.clearAll}>
                  {t.noMatches.clear}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Store}
              title={t.empty.title}
              body={t.empty.body}
              className="rounded-none border-0"
              action={
                <Button asChild>
                  <Link href={shopRoutes.create}>{t.newShop}</Link>
                </Button>
              }
            />
          )
        }
      />
    </div>
  );
}
