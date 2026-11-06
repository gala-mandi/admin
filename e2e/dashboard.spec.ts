import { expect, type Page, test } from "@playwright/test";
import { API, cors, signedInAsSuperAdmin } from "./mock-api";

/**
 * Platform dashboard on a fake `/admin/stats` (and `/admin/tenants`) API:
 * tiles, new shops chart, activity feed and inactive shops all load; a 403
 * shows the access page. The other charts are in `analytics.spec.ts`.
 */

const stats = {
  shops: { total: 42, trial: 10, active: 28, suspended: 3, cancelled: 1 },
  users: { total: 180, active: 171 },
};

const months = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(Date.UTC(2026, i - 1, 1)).toISOString().slice(0, 7),
  count: i % 3,
}));

/** Answers `GET <API><path>` with any query string; returns the URLs asked. */
async function mockGet(
  page: Page,
  path: string,
  reply: () => { status: number; body: unknown },
) {
  const seen: string[] = [];
  const escaped = `${API}${path}`.replace(/[.?*+^$()[\]{}|\\/]/g, "\\$&");
  await page.route(new RegExp(`^${escaped}(\\?.*)?$`), async (route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    seen.push(request.url());
    const { status, body } = reply();
    await route.fulfill({
      status,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  return seen;
}

const minutesAgo = (n: number) =>
  new Date(Date.now() - n * 60_000).toISOString();

async function mockStats(page: Page, summaryStatus = 200) {
  await mockGet(page, "/admin/stats", () =>
    summaryStatus === 200
      ? { status: 200, body: stats }
      : {
          status: summaryStatus,
          body: { statusCode: summaryStatus, message: "Forbidden" },
        },
  );
  await mockGet(page, "/admin/stats/new-shops", () => ({
    status: 200,
    body: { data: months },
  }));
  await mockGet(page, "/admin/stats/activity", () => ({
    status: 200,
    body: {
      data: [
        {
          id: 7,
          tenant: { id: "t1", name: "Demo Mandi" },
          user: { id: "u1", name: "Haji Aslam", role: "owner" },
          entity: "traders",
          entityId: "e1",
          action: "create",
          createdAt: minutesAgo(3),
        },
      ],
    },
  }));
  await mockGet(page, "/admin/stats/inactive-shops", () => ({
    status: 200,
    body: {
      data: [
        {
          id: "t9",
          name: "Quiet Traders",
          city: "Okara",
          status: "trial",
          lastActivityAt: minutesAgo(60 * 24 * 20),
        },
      ],
      meta: { page: 1, limit: 10, total: 1 },
    },
  }));
  await mockGet(page, "/admin/tenants", () => ({
    status: 200,
    body: {
      data: [
        {
          id: "t1",
          name: "Demo Mandi",
          slug: "demo-mandi",
          city: "Okara",
          phone: "03000000001",
          ownerName: "Haji Aslam",
          status: "active",
          userCount: 4,
          createdAt: minutesAgo(60 * 24 * 40),
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    },
  }));
}

test("super-admin sees the platform dashboard", async ({ page, context }) => {
  await signedInAsSuperAdmin(page, context);
  await mockStats(page);

  await page.goto("/dashboard");

  const tiles = page.getByRole("region", { name: "Platform at a glance" });
  await expect(tiles.locator('[data-tile="totalShops"]')).toContainText("42");
  await expect(tiles.locator('[data-tile="active"]')).toContainText("28");
  await expect(tiles.locator('[data-tile="trial"]')).toContainText("10");
  await expect(tiles.locator('[data-tile="suspended"]')).toContainText("3");
  await expect(tiles.locator('[data-tile="totalUsers"]')).toContainText("180");

  const newShops = page.getByTestId("new-shops-chart");
  await expect(newShops).toBeVisible();
  await expect(newShops).toHaveAttribute("data-chart-type", "area");
  await expect(newShops.locator("canvas")).toBeVisible();

  await expect(
    page.getByRole("list", { name: "Recent activity" }),
  ).toContainText("Haji Aslam (Owner) created a trader");

  const quiet = page.getByRole("link", { name: "Quiet Traders" });
  await expect(quiet).toBeVisible();
  await quiet.click();
  await expect(page).toHaveURL("/shops/t9");
});

test("a 403 from the stats API shows the access page", async ({
  page,
  context,
}) => {
  await signedInAsSuperAdmin(page, context);
  await mockStats(page, 403);

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "You don’t have access" }),
  ).toBeVisible();
});
