import type { BrowserContext, Page, Route } from "@playwright/test";
import { plan, proPlan, trialPlan } from "../../src/features/plans/test-data";
import {
  activityItem,
  inactiveShop,
  newShops,
  platformStats,
} from "../../src/features/stats/test-data";
import {
  subscriptionView,
  tenantDetail,
  tenantSummary,
} from "../../src/features/tenants/test-data";
import type { TenantSummary } from "../../src/features/tenants/types";
import { API, cors, session, setRefreshCookie, superAdmin } from "../mock-api";

/**
 * One fake platform API for every super-admin screen (ticket 42 screen
 * gallery and form checks): 12 shops across Punjab on Friday 6 Nov 2026.
 *
 * `state` changes the answers of the screen's own list (`listPaths`) only:
 * "empty" returns no rows, "loading" never answers, "error" answers 500.
 */

export const NOW = new Date("2026-11-06T07:00:00.000Z");

export type ListState = "data" | "empty" | "loading" | "error";

const ago = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000).toISOString();

const shopRows: [string, string, TenantSummary["status"], string, number][] = [
  ["Al-Madina Traders", "Okara", "active", "Haji Aslam", 4],
  ["Chaudhry Grain Co.", "Sahiwal", "active", "Chaudhry Rafiq", 6],
  ["Bismillah Arhat", "Okara", "trial", "Muhammad Iqbal", 2],
  ["Rana Commission Shop", "Pakpattan", "active", "Rana Tariq", 5],
  ["Punjab Galla Mandi", "Multan", "active", "Sheikh Naveed", 9],
  ["Sheikh Brothers", "Depalpur", "suspended", "Sheikh Javed", 3],
  ["Ittefaq Traders", "Faisalabad", "active", "Mian Shahid", 7],
  ["Kissan Dost Arhat", "Renala Khurd", "trial", "Allah Ditta", 1],
  ["Madni Grain Market", "Chichawatni", "active", "Hafiz Usman", 4],
  ["Noor Commission Agents", "Arifwala", "cancelled", "Noor Muhammad", 2],
  ["Hafiz Brothers", "Vehari", "active", "Hafiz Imran", 5],
  ["Ghallah Ghar", "Okara", "trial", "Zafar Iqbal", 2],
];

const shops: TenantSummary[] = shopRows.map(
  ([name, city, status, ownerName, userCount], i) =>
    tenantSummary({
      id: `t${i + 1}`,
      name,
      slug: name.toLowerCase().replace(/\W+/g, "-"),
      city,
      ownerName,
      status,
      userCount,
      phone: `030${String(10_000_000 + i * 3_456_789).slice(0, 8)}`,
      createdAt: ago((i + 1) * 60 * 24 * 9),
      subscription:
        status === "cancelled"
          ? null
          : {
              planName:
                status === "trial" ? "Trial" : i % 3 === 0 ? "Pro" : "Basic",
              endsOn: status === "trial" ? "2026-11-14" : "2026-12-01",
              state:
                status === "suspended"
                  ? "read_only"
                  : i === 4
                    ? "grace"
                    : "active",
              daysLeft: status === "trial" ? 8 : i === 4 ? 0 : 25,
            },
    }),
);

const shop = tenantDetail({
  ...shops[0],
  subscription: subscriptionView({ usersUsed: 4 }),
});

const plans = [
  trialPlan,
  plan({ shopCount: 640 }),
  proPlan,
  plan({
    id: "p-old",
    name: "Seasonal (2025)",
    maxUsers: 4,
    priceMonthly: "1800.00",
    isActive: false,
    shopCount: 18,
  }),
];

const activity = [
  activityItem({ id: 1, createdAt: ago(4) }),
  activityItem({
    id: 2,
    tenant: { id: "t2", name: "Chaudhry Grain Co." },
    user: { id: "u2", name: "Bilal", role: "operator" },
    entity: "purchases",
    action: "create",
    createdAt: ago(12),
  }),
  activityItem({
    id: 3,
    tenant: { id: "t5", name: "Punjab Galla Mandi" },
    user: { id: "u5", name: "Sheikh Naveed", role: "owner" },
    entity: "payments",
    action: "create",
    createdAt: ago(41),
  }),
  activityItem({
    id: 4,
    tenant: { id: "t4", name: "Rana Commission Shop" },
    user: { id: "u4", name: "Nadeem", role: "manager" },
    entity: "rates",
    action: "update",
    createdAt: ago(95),
  }),
  activityItem({
    id: 5,
    tenant: { id: "t7", name: "Ittefaq Traders" },
    user: { id: "u7", name: "Mian Shahid", role: "owner" },
    entity: "staff",
    action: "create",
    createdAt: ago(60 * 5),
  }),
];

const inactive = [
  inactiveShop({ lastActivityAt: ago(60 * 24 * 21) }),
  inactiveShop({
    id: "t8",
    name: "Kissan Dost Arhat",
    city: "Renala Khurd",
    lastActivityAt: ago(60 * 24 * 16),
  }),
  inactiveShop({
    id: "t10",
    name: "Noor Commission Agents",
    city: "Arifwala",
    status: "cancelled",
    lastActivityAt: ago(60 * 24 * 44),
  }),
];

const list = <T>(data: T[], limit = 20) => ({
  data,
  meta: { page: 1, limit, total: data.length },
});

function isList(path: string, listPaths: string[]) {
  return listPaths.some((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p,
  );
}

function empty(path: string): unknown {
  if (path === "/admin/stats") {
    return platformStats({
      shops: { total: 0, trial: 0, active: 0, suspended: 0, cancelled: 0 },
      users: { total: 0, active: 0 },
    });
  }
  if (path === "/admin/stats/new-shops") return newShops(Array(12).fill(0));
  if (path === "/admin/stats/activity") return { data: [] };
  return list([]);
}

function answer(method: string, path: string, url: URL): unknown {
  if (method === "POST" && path === "/auth/refresh") {
    return session("admin-screens");
  }
  if (path === "/auth/me") return superAdmin;
  if (path === "/health") return { status: "ok" };
  if (path === "/admin/stats") {
    // The same 12 shops the lists show.
    const count = (status: TenantSummary["status"]) =>
      shops.filter((s) => s.status === status).length;
    return platformStats({
      shops: {
        total: shops.length,
        trial: count("trial"),
        active: count("active"),
        suspended: count("suspended"),
        cancelled: count("cancelled"),
      },
      users: { total: 50, active: 46 },
    });
  }
  if (path === "/admin/stats/new-shops") {
    return newShops([38, 41, 47, 52, 49, 63, 70, 66, 81, 92, 104, 37]);
  }
  if (path === "/admin/stats/activity") return { data: activity };
  if (path === "/admin/stats/inactive-shops") return list(inactive, 10);
  if (path === "/admin/plans") return list(plans);
  if (path.startsWith("/admin/tenants/")) return shop;
  if (path === "/admin/tenants") {
    const status = url.searchParams.get("status");
    const rows = status ? shops.filter((s) => s.status === status) : shops;
    const limit = Number(url.searchParams.get("limit") ?? 20);
    return {
      data: rows.slice(0, limit),
      meta: { page: 1, limit, total: rows.length },
    };
  }
  return null;
}

export interface AdminServerOptions {
  state?: ListState;
  listPaths?: string[];
}

export async function adminServer(
  page: Page,
  { state = "data", listPaths = [] }: AdminServerOptions = {},
) {
  await page.route(`${API}/**`, async (route: Route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (method === "GET" && state !== "data" && isList(path, listPaths)) {
      if (state === "loading") return;
      await route.fulfill({
        status: state === "error" ? 500 : 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify(
          state === "error"
            ? { statusCode: 500, message: "Internal server error" }
            : empty(path),
        ),
      });
      return;
    }
    const body = answer(method, path, url);
    await route.fulfill({
      status: body === null ? 404 : method === "POST" ? 201 : 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body ?? { statusCode: 404, message: "Not found" }),
    });
  });
}

/** Fixed clock, no chart animation, signed in as the super-admin. */
export async function preparePage(
  page: Page,
  context: BrowserContext,
  options: AdminServerOptions = {},
) {
  await page.clock.setFixedTime(NOW);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setRefreshCookie(context);
  await adminServer(page, options);
}

export { shop };
