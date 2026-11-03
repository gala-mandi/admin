"use client";

import { Plus, Search, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DataTable,
  DataTableExport,
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
import { shopsListText as t } from "../text";
import type { TenantSummary } from "../types";
import { shopColumns } from "./shop-columns";
import { ShopStatusOverview } from "./status-overview";

const section = panelText.sections.shops;

const getRowId = (row: TenantSummary) => row.id;

/**
 * `/shops`: search, status filter, sort and page live in the URL
 * (`?q=&status=&page=&sort=`), so reload and Back keep them. The status
 * cards on top are the status filter.
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
  const total = query.data?.meta.total;

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

      <ShopStatusOverview
        value={list.filters.status}
        onChange={(status) => list.setFilter("status", status)}
      />

      <DataTable
        toolbar={
          <DataTableToolbar
            inline
            search={{
              value: list.search,
              onChange: list.setSearch,
              label: t.searchLabel,
              placeholder: t.searchPlaceholder,
            }}
            filters={
              total === undefined ? null : (
                <p
                  data-testid="shops-result-count"
                  className="text-muted-foreground text-sm whitespace-nowrap tabular-nums"
                >
                  {t.resultCount(total)}
                </p>
              )
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
        }
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
              className="rounded-none border-0 shadow-none"
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
              className="rounded-none border-0 shadow-none"
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
