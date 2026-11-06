import { expect, type Page, test } from "@playwright/test";
import { API, cors, signedInAsSuperAdmin } from "./mock-api";

/**
 * Analytics charts (ECharts) on a fake API: every dashboard chart draws on a
 * canvas, a chart switches type (and remembers it), and the Shops list
 * switches from the table to a chart of every matching shop.
 */

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

const statuses = ["active", "trial", "suspended", "cancelled"] as const;
const cities = [
  "Okara",
  "Sahiwal",
  "Okara",
  "Multan",
  "Lahore",
  "Okara",
  "Pakpattan",
  null,
];

const shops = Array.from({ length: 36 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `t${n}`,
    name: `Shop ${n}`,
    slug: `shop-${n}`,
    city: cities[i % cities.length],
    phone: `030000000${n}`,
    ownerName: `Owner ${n}`,
    status: statuses[i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0],
    userCount: (i * 7) % 11,
    createdAt: daysAgo(i * 9),
  };
});

const actions = ["update", "create", "update", "access", "delete"];
const activity = Array.from({ length: 60 }, (_, i) => ({
  id: 1000 - i,
  tenant: { id: "t01", name: "Shop 01" },
  user: { id: "u1", name: "Haji Aslam", role: "owner" },
  entity: "traders",
  entityId: "e1",
  action: actions[i % actions.length],
  createdAt: daysAgo(i / 6),
}));

const months = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(Date.UTC(2025, 11 + i, 1)).toISOString().slice(0, 7),
  count: [2, 3, 1, 4, 6, 3, 5, 8, 4, 7, 9, 6][i]!,
}));

async function json(page: Page, pattern: RegExp, body: (url: URL) => unknown) {
  await page.route(pattern, async (route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({
      status: 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body(new URL(request.url()))),
    });
  });
}

const esc = (path: string) =>
  `${API}${path}`.replace(/[.?*+^$()[\]{}|\\/]/g, "\\$&");

async function mockApi(page: Page) {
  await json(page, new RegExp(`^${esc("/admin/stats")}$`), () => ({
    shops: { total: 36, trial: 9, active: 22, suspended: 5, cancelled: 0 },
    users: { total: 180, active: 171 },
  }));
  await json(
    page,
    new RegExp(`^${esc("/admin/stats/new-shops")}(\\?.*)?$`),
    () => ({
      data: months,
    }),
  );
  await json(
    page,
    new RegExp(`^${esc("/admin/stats/activity")}(\\?.*)?$`),
    () => ({
      data: activity,
    }),
  );
  await json(
    page,
    new RegExp(`^${esc("/admin/stats/inactive-shops")}(\\?.*)?$`),
    () => ({
      data: shops.slice(0, 4).map((s, i) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        status: s.status,
        lastActivityAt: daysAgo(15 + i * 10),
      })),
      meta: { page: 1, limit: 10, total: 4 },
    }),
  );
  await json(page, new RegExp(`^${esc("/admin/tenants")}(\\?.*)?$`), (url) => {
    const p = url.searchParams;
    const status = p.get("status");
    const q = (p.get("search") ?? "").toLowerCase();
    const rows = shops.filter(
      (s) =>
        (!status || s.status === status) &&
        (!q || `${s.name} ${s.city ?? ""}`.toLowerCase().includes(q)),
    );
    const pageNo = Number(p.get("page") ?? 1);
    const limit = Number(p.get("limit") ?? 20);
    return {
      data: rows.slice((pageNo - 1) * limit, pageNo * limit),
      meta: { page: pageNo, limit, total: rows.length },
    };
  });
}

const charts = [
  ["new-shops-chart", "area"],
  ["shops-by-status-chart", "donut"],
  ["activity-by-day-chart", "stackedArea"],
  ["activity-by-action-chart", "bar"],
  ["shops-by-city-chart", "horizontalBar"],
  ["users-per-shop-chart", "horizontalBar"],
] as const;

/** Set `SHOTS=<dir>` to keep screenshots of the charts for a visual check. */
async function shot(page: Page, name: string) {
  if (process.env.SHOTS) {
    await page.waitForTimeout(900); // let the entry animation finish
    await page.screenshot({
      path: `${process.env.SHOTS}/${name}.png`,
      fullPage: true,
    });
  }
}

test.beforeEach(async ({ page, context }) => {
  await signedInAsSuperAdmin(page, context);
  await mockApi(page);
});

test("the dashboard draws every analytics chart", async ({ page }) => {
  await page.goto("/dashboard");

  for (const [testId, type] of charts) {
    const chart = page.getByTestId(testId);
    await expect(chart).toHaveAttribute("data-chart-type", type);
    // ECharts drew into this element.
    await expect(chart.locator("[_echarts_instance_]")).toHaveCount(1);
    await expect(chart.locator("canvas").first()).toBeVisible();
  }
  await expect(page.getByTestId("shops-by-city-chart")).toHaveAccessibleName(
    /Highest: Okara, 14/,
  );
  await expect(page.getByText("Based on all 36 shops.").first()).toBeVisible();
  await shot(page, "dashboard-light");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(
    page.getByTestId("new-shops-chart").locator("canvas"),
  ).toBeVisible();
  await shot(page, "dashboard-dark");
});

test("a chart switches type and keeps it after a reload", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.locator('[data-chart-card="dashboard-shops-by-status"]');
  const chart = page.getByTestId("shops-by-status-chart");
  await expect(chart).toHaveAttribute("data-chart-type", "donut");

  await card.getByRole("button", { name: "Chart type: Donut" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio")).toHaveText([
    "Bar",
    "Horizontal bar",
    "Line",
    "Area",
    "Pie",
    "Donut",
    "Rose",
    "Treemap",
    "Funnel",
  ]);
  await menu.getByRole("menuitemradio", { name: "Rose" }).click();
  await expect(chart).toHaveAttribute("data-chart-type", "rose");
  await expect(chart.locator("canvas").first()).toBeVisible();

  await card.getByRole("button", { name: "View data" }).click();
  await expect(card.getByTestId("chart-data-table")).toContainText("Active22");

  await page.reload();
  await expect(chart).toHaveAttribute("data-chart-type", "rose");
});

test("the Shops list switches from the table to a chart", async ({ page }) => {
  await page.goto("/shops");
  const table = page.getByRole("table", { name: "Shops", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(20);

  const tenants = page.waitForRequest(
    (r) => r.url().includes("/admin/tenants") && r.url().includes("limit=100"),
  );
  await page
    .getByRole("group", { name: "View as" })
    .getByRole("button", { name: "Chart" })
    .click();
  await tenants;

  await expect(page).toHaveURL(/view=chart/);
  await expect(table).toHaveCount(0);
  const chart = page.getByTestId("data-table-chart");
  await expect(chart).toHaveAttribute("data-chart-type", "bar");
  await expect(chart.locator("canvas").first()).toBeVisible();
  await expect(chart).toHaveAccessibleName(/Shops by status\. Bar chart/);
  await expect(page.getByText("Charting all 36 matching rows.")).toBeVisible();

  await page.getByRole("combobox", { name: "Group by" }).click();
  await page.getByRole("option", { name: "City" }).click();
  await expect(chart).toHaveAccessibleName(/Shops by city/);
  await shot(page, "shops-chart");

  await page
    .getByRole("group", { name: "View as" })
    .getByRole("button", { name: "Table" })
    .click();
  await expect(table.locator("tbody tr")).toHaveCount(20);
});

test("charts fit a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dashboard");
  await expect(
    page.getByTestId("new-shops-chart").locator("canvas"),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await shot(page, "dashboard-phone");
});
