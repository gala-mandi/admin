import type {
  SubscriptionView,
  TenantDetail,
  TenantList,
  TenantSummary,
} from "./types";

export function subscriptionView(
  overrides: Partial<SubscriptionView> = {},
): SubscriptionView {
  return {
    id: "s1",
    plan: {
      id: "p-basic",
      name: "Basic",
      maxUsers: 5,
      maxBranches: 1,
      priceMonthly: "2500.00",
    },
    startsOn: "2026-11-01",
    endsOn: "2026-12-01",
    graceDays: 7,
    graceEndsOn: "2026-12-08",
    status: "active",
    state: "active",
    daysLeft: 25,
    graceDaysLeft: 32,
    usersUsed: 3,
    ...overrides,
  };
}

export function tenantSummary(
  overrides: Partial<TenantSummary> = {},
): TenantSummary {
  return {
    id: "t1",
    name: "Al-Madina Traders",
    slug: "al-madina-traders",
    city: "Okara",
    phone: "03001234567",
    ownerName: "Haji Aslam",
    status: "active",
    userCount: 3,
    createdAt: "2026-10-26T20:30:00Z",
    subscription: {
      planName: "Basic",
      endsOn: "2026-12-01",
      state: "active",
      daysLeft: 25,
    },
    ...overrides,
  };
}

export function tenantDetail(
  overrides: Partial<TenantDetail> = {},
): TenantDetail {
  return {
    ...tenantSummary(),
    email: "shop@example.com",
    address: "Shop 12, Grain Market",
    logoUrl: null,
    updatedAt: "2026-10-27T05:00:00Z",
    owner: {
      id: "u1",
      name: "Haji Aslam",
      phone: "03007654321",
      email: null,
      isActive: true,
      mustChangePassword: true,
    },
    subscription: subscriptionView(),
    ...overrides,
  };
}

export function tenantList(
  data: TenantSummary[],
  meta: Partial<TenantList["meta"]> = {},
): TenantList {
  return { data, meta: { page: 1, limit: 20, total: data.length, ...meta } };
}
