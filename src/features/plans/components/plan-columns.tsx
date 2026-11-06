"use client";

import { Pencil, Power, Sparkles, Trash2, Users } from "lucide-react";
import {
  type DataTableColumn,
  dataTableColumnHelper,
  DataTableRowActions,
} from "@/components/data-table";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatCount, formatRs } from "@/lib/format";
import { planStatusText, plansListText as t } from "../text";
import type { Plan } from "../types";
import { PlanStatusBadge } from "./plan-status-badge";

const col = dataTableColumnHelper<Plan>();

const wideOnly = "hidden lg:table-cell";
const tabletUp = "hidden md:table-cell";

const isFree = (price: string) => !/[1-9]/.test(price);

export interface PlanRowActions {
  onEdit: (plan: Plan) => void;
  onRemove: (plan: Plan) => void;
  onActivate: (plan: Plan) => void;
}

/** Columns of the plans table; `name`, price and created sort on the server. */
export function planColumns({
  onEdit,
  onRemove,
  onActivate,
}: PlanRowActions): DataTableColumn<Plan>[] {
  return col.columns([
    col.accessor("name", {
      header: t.columns.plan,
      meta: {
        label: t.columns.plan,
        className: "whitespace-normal md:whitespace-nowrap",
        chart: { group: "category" },
      },
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="bg-secondary text-secondary-foreground font-heading flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          >
            {row.original.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(row.original);
              }}
              className="text-foreground focus-visible:ring-ring/50 w-fit rounded-sm text-start font-semibold break-words outline-none hover:underline focus-visible:ring-3"
            >
              {row.original.name}
            </button>
            {row.original.isTrial ? (
              <span
                className="text-primary inline-flex w-fit items-center gap-1 text-xs font-medium"
                title={t.trialHint}
              >
                <Sparkles aria-hidden className="size-3" />
                {t.trialBadge}
              </span>
            ) : null}
          </div>
        </div>
      ),
    }),
    col.accessor("priceMonthly", {
      header: t.columns.price,
      // Money is never summed in the browser, so no chart measure.
      meta: {
        label: t.columns.price,
        align: "end",
        exportValue: (row: Plan) => formatRs(row.priceMonthly),
      },
      cell: ({ getValue }) => (
        <span className="font-semibold tabular-nums">
          {isFree(getValue()) ? t.free : formatRs(getValue())}
        </span>
      ),
    }),
    col.accessor("maxUsers", {
      header: t.columns.users,
      enableSorting: false,
      meta: {
        label: t.columns.users,
        align: "end",
        className: tabletUp,
        chart: { measure: true },
      },
      cell: ({ getValue }) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Users aria-hidden className="text-muted-foreground size-3.5" />
          {formatCount(getValue())}
        </span>
      ),
    }),
    col.accessor("maxBranches", {
      header: t.columns.branches,
      enableSorting: false,
      meta: {
        label: t.columns.branches,
        align: "end",
        className: wideOnly,
        chart: { measure: true },
      },
      cell: ({ getValue }) => (
        <span className="tabular-nums" title={t.branchesHint}>
          {formatCount(getValue())}
        </span>
      ),
    }),
    col.accessor("shopCount", {
      header: t.columns.shops,
      enableSorting: false,
      meta: {
        label: t.columns.shops,
        align: "end",
        className: tabletUp,
        chart: { measure: true },
      },
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatCount(getValue())}</span>
      ),
    }),
    col.accessor("isActive", {
      header: t.columns.status,
      enableSorting: false,
      meta: {
        label: t.columns.status,
        exportValue: (row: Plan) =>
          planStatusText[row.isActive ? "active" : "inactive"],
        chart: {
          group: "category",
          value: (row: Plan) => (row.isActive ? "active" : "inactive"),
          groupLabel: (key: string) =>
            planStatusText[key as keyof typeof planStatusText] ?? key,
          order: ["active", "inactive"],
          colors: { active: "--success", inactive: "--chart-other" },
        },
      },
      cell: ({ getValue }) => <PlanStatusBadge isActive={getValue()} />,
    }),
    col.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      meta: { align: "end", className: "w-12" },
      header: () => <span className="sr-only">{t.columns.actions}</span>,
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <DataTableRowActions rowName={plan.name}>
            <DropdownMenuItem onSelect={() => onEdit(plan)}>
              <Pencil aria-hidden />
              {t.rowActions.edit}
            </DropdownMenuItem>
            {!plan.isActive ? (
              <DropdownMenuItem onSelect={() => onActivate(plan)}>
                <Power aria-hidden />
                {t.rowActions.activate}
              </DropdownMenuItem>
            ) : null}
            {!plan.isTrial ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onRemove(plan)}
              >
                <Trash2 aria-hidden />
                {t.rowActions.remove}
              </DropdownMenuItem>
            ) : null}
          </DataTableRowActions>
        );
      },
    }),
  ]);
}
