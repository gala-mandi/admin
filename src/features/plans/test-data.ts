import type { Plan, PlanList } from "./types";

export function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "p-basic",
    name: "Basic",
    maxUsers: 5,
    maxBranches: 1,
    priceMonthly: "2500.00",
    isActive: true,
    isTrial: false,
    shopCount: 4,
    createdAt: "2026-11-01T05:00:00Z",
    ...overrides,
  };
}

export const trialPlan = plan({
  id: "p-trial",
  name: "Trial",
  maxUsers: 3,
  priceMonthly: "0.00",
  isTrial: true,
  shopCount: 12,
});

export const proPlan = plan({
  id: "p-pro",
  name: "Pro",
  maxUsers: 15,
  maxBranches: 3,
  priceMonthly: "6000.00",
  shopCount: 2,
});

export function planList(data: Plan[]): PlanList {
  return { data, meta: { page: 1, limit: 20, total: data.length } };
}
