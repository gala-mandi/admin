"use client";

import { CreditCard, Info, Plus, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DataTable,
  DataTableExport,
  DataTableSelectFilter,
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
import { usePlans, useUpdatePlanById } from "../hooks";
import {
  PLANS_PAGE_SIZE,
  PLANS_TABLE_ID,
  planListFilters,
  planListView,
  planSortFields,
} from "../search-params";
import { plansListText as t, planStatusText, removePlanText } from "../text";
import type { Plan, PlanListParams } from "../types";
import { planColumns } from "./plan-columns";
import { PlanFormDialog } from "./plan-form-dialog";
import { RemovePlanDialog } from "./remove-plan-dialog";

const section = panelText.sections.plans;
const getRowId = (row: Plan) => row.id;

type Open =
  | { kind: "create" }
  | { kind: "edit"; plan: Plan }
  | { kind: "remove"; plan: Plan }
  | null;

const statusOptions = [
  { value: "active", label: planStatusText.active, dotClassName: "bg-success" },
  {
    value: "inactive",
    label: planStatusText.inactive,
    dotClassName: "bg-muted-foreground",
  },
] as const;

/** `/plans`: every plan with its limits and price; create, edit, delete. */
export function PlansList() {
  const list = useDataTableState({
    filters: planListFilters,
    sortFields: planSortFields,
    defaultSort: "priceMonthly",
    pageSize: PLANS_PAGE_SIZE,
  });
  const { columnVisibility, onColumnVisibilityChange } =
    useColumnVisibility(PLANS_TABLE_ID);
  const [view, setView] = useQueryState("view", planListView);
  const [open, setOpen] = useState<Open>(null);
  const { mutate: activatePlan } = useUpdatePlanById();

  const { status, q, ...rest } = list.listParams;
  const params: PlanListParams = {
    ...rest,
    ...(q ? { search: q } : {}),
    ...(status ? { isActive: status === "active" ? "true" : "false" } : {}),
  } as PlanListParams;
  const query = usePlans(params);
  const rows = query.data?.data;
  const total = query.data?.meta.total;

  const columns = useMemo(
    () =>
      planColumns({
        onEdit: (plan) => setOpen({ kind: "edit", plan }),
        onRemove: (plan) => setOpen({ kind: "remove", plan }),
        onActivate: (plan) =>
          activatePlan(
            { id: plan.id, input: { isActive: true } },
            {
              onSuccess: (saved) =>
                toast.success(removePlanText.activated(saved.name)),
              onError: () => toast.error(removePlanText.failed),
            },
          ),
      }),
    [activatePlan],
  );

  if (query.isError && toApiError(query.error).status === 403) {
    return <ForbiddenState />;
  }

  const newPlanButton = (
    <Button
      size="lg"
      className="h-10 gap-2 px-4 font-semibold"
      onClick={() => setOpen({ kind: "create" })}
    >
      <Plus aria-hidden />
      {t.newPlan}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={section.label}
        description={section.description}
        actions={newPlanButton}
      />

      <p className="bg-notice-soft text-notice flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium">
        <Info aria-hidden className="mt-0.5 size-4 flex-none" />
        {t.placeholderNote}
      </p>

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
              <>
                <DataTableSelectFilter
                  label={t.statusFilter}
                  value={list.filters.status}
                  options={statusOptions}
                  onChange={(value) => list.setFilter("status", value)}
                  allLabel={t.statusAll}
                />
                {total === undefined ? null : (
                  <p
                    data-testid="plans-result-count"
                    className="text-muted-foreground self-end pb-2.5 text-sm whitespace-nowrap tabular-nums"
                  >
                    {t.resultCount(total)}
                  </p>
                )}
              </>
            }
            isFiltered={list.isFiltered}
            onClearFilters={list.clearAll}
            actions={
              <>
                <DataTableViewOptions
                  columns={columns}
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={onColumnVisibilityChange}
                />
                <DataTableExport
                  fileName={t.exportFileName}
                  columns={columns}
                  rows={rows}
                  columnVisibility={columnVisibility}
                />
              </>
            }
          />
        }
        caption={t.caption}
        columns={columns}
        data={rows}
        getRowId={getRowId}
        rowCount={total ?? 0}
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
        onRowClick={(row) => setOpen({ kind: "edit", plan: row })}
        view={view}
        onViewChange={(next) => void setView(next)}
        chartView={{
          id: PLANS_TABLE_ID,
          total,
          countLabel: t.chartCount,
          defaultGroupBy: "isActive",
        }}
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
              icon={CreditCard}
              title={t.empty.title}
              body={t.empty.body}
              className="rounded-none border-0 shadow-none"
              action={newPlanButton}
            />
          )
        }
      />

      {open?.kind === "create" ? (
        <PlanFormDialog plan={null} onClose={() => setOpen(null)} />
      ) : null}
      {open?.kind === "edit" ? (
        <PlanFormDialog
          key={open.plan.id}
          plan={open.plan}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open?.kind === "remove" ? (
        <RemovePlanDialog plan={open.plan} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}
