"use client";

import type { PaginationState, SortingState } from "@tanstack/react-table";
import { Plus, Search, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";
import { toApiError } from "@/lib/api-error";
import { shopRoutes } from "@/lib/routes";
import { useTenants } from "../hooks";
import { SHOPS_PAGE_SIZE, shopListParsers } from "../search-params";
import { shopsListText as t, tenantStatusText } from "../text";
import {
  type TenantSort,
  type TenantStatus,
  type TenantSummary,
  tenantStatuses,
} from "../types";
import { shopColumns } from "./shop-columns";

const SEARCH_DEBOUNCE_MS = 300;
const ALL = "all";
const section = panelText.sections.shops;

function toSorting(sort: TenantSort): SortingState {
  return [{ id: sort.replace(/^-/, ""), desc: sort.startsWith("-") }];
}

function toSort(sorting: SortingState): TenantSort | null {
  const first = sorting[0];
  if (!first) return null;
  const sort = `${first.desc ? "-" : ""}${first.id}`;
  return sort === "name" ||
    sort === "-name" ||
    sort === "createdAt" ||
    sort === "-createdAt"
    ? sort
    : null;
}

const getRowId = (row: TenantSummary) => row.id;

/**
 * `/shops`: search, status filter, sort and page live in the URL
 * (`?q=&status=&page=&sort=`), so reload and Back keep them.
 */
export function ShopsList() {
  const router = useRouter();
  const [params, setParams] = useQueryStates(shopListParsers, {
    history: "push",
  });
  const page = Math.max(1, params.page);

  // The input updates at once; the URL (and the request) after a pause.
  const [draft, setDraft] = useState(params.q);
  const [seenQ, setSeenQ] = useState(params.q);
  const [pushedQ, setPushedQ] = useState<string | null>(null);
  if (params.q !== seenQ) {
    setSeenQ(params.q);
    // Our own debounced push landing: keep what was typed since. Anything
    // else (Back/Forward, a link) is shown in the input.
    if (params.q === pushedQ) setPushedQ(null);
    else setDraft(params.q);
  }

  useEffect(() => {
    const next = draft.trim();
    if (next === params.q) return;
    const timer = setTimeout(() => {
      setPushedQ(next);
      void setParams({ q: next || null, page: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, params.q, setParams]);

  const query = useTenants({
    page,
    limit: SHOPS_PAGE_SIZE,
    search: params.q || undefined,
    status: params.status ?? undefined,
    sort: params.sort,
  });

  const filtered = params.q !== "" || params.status !== null;
  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: SHOPS_PAGE_SIZE,
  };

  const clearFilters = () => {
    setDraft("");
    void setParams({ q: null, status: null, page: null });
  };

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

      <div
        role="search"
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="shops-search" className="text-[13px] font-semibold">
            {t.searchLabel}
          </label>
          <InputGroup className="rounded-field bg-card h-10">
            <InputGroupAddon className="text-muted-foreground ps-3">
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id="shops-search"
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
            />
          </InputGroup>
        </div>
        <div className="flex flex-col gap-1.5 sm:w-52">
          <label
            id="shops-status-label"
            htmlFor="shops-status"
            className="text-[13px] font-semibold"
          >
            {t.statusLabel}
          </label>
          <Select
            value={params.status ?? ALL}
            onValueChange={(value) =>
              void setParams({
                status: value === ALL ? null : (value as TenantStatus),
                page: null,
              })
            }
          >
            <SelectTrigger
              id="shops-status"
              aria-labelledby="shops-status-label"
              className="rounded-field bg-card data-[size=default]:h-10 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL}>{t.statusAll}</SelectItem>
              {tenantStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {tenantStatusText[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        caption={t.caption}
        columns={shopColumns}
        data={query.data?.data}
        getRowId={getRowId}
        rowCount={query.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={(next) =>
          void setParams({
            page: next.pageIndex === 0 ? null : next.pageIndex + 1,
          })
        }
        sorting={toSorting(params.sort)}
        onSortingChange={(next) =>
          void setParams({ sort: toSort(next), page: null })
        }
        isLoading={query.isPending}
        isFetching={query.isPlaceholderData}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => router.push(shopRoutes.detail(row.id))}
        empty={
          filtered ? (
            <EmptyState
              icon={Search}
              title={t.noMatches.title}
              body={t.noMatches.body}
              className="rounded-none border-0"
              action={
                <Button variant="outline" onClick={clearFilters}>
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
