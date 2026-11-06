import type { ListResponse } from "@/lib/list-query";

/** Shapes of `/admin/plans` (see the server's plans contract). */
export interface Plan {
  id: string;
  name: string;
  maxUsers: number;
  /** Stored and shown; not enforced yet (the app has no branches). */
  maxBranches: number;
  /** Rupees as a 2-decimal string, e.g. `"2500.00"`. */
  priceMonthly: string;
  isActive: boolean;
  /** Every new shop starts on it; it can't be renamed, turned off or deleted. */
  isTrial: boolean;
  /** Shops whose current plan this is. */
  shopCount: number;
  /** ISO timestamp. */
  createdAt: string;
}

export const planSorts = [
  "priceMonthly",
  "-priceMonthly",
  "name",
  "-name",
  "createdAt",
  "-createdAt",
] as const;
export type PlanSort = (typeof planSorts)[number];

export interface PlanListParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: "true" | "false";
  sort?: PlanSort;
}

export type PlanList = ListResponse<Plan>;

export interface PlanInput {
  name: string;
  maxUsers: number;
  maxBranches: number;
  /** Rupees as typed, e.g. `"2500"`; the server keeps 2 decimals. */
  priceMonthly: string;
  isActive: boolean;
}

export interface PlanRemoved {
  /** `deleted`: no shop ever used it; `deactivated`: kept for their history. */
  result: "deleted" | "deactivated";
  plan: Plan;
}
