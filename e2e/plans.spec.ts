import { expect, type Page, type Route, test } from "@playwright/test";
import { API, cors, signedInAsSuperAdmin } from "./mock-api";

/**
 * Plans page and the shop "Assign / extend plan" dialog with the API mocked
 * by an in-memory fake following the plans and subscriptions contract.
 * Set `SHOTS=<dir>` to keep screenshots for a visual check.
 */

interface Plan {
  id: string;
  name: string;
  maxUsers: number;
  maxBranches: number;
  priceMonthly: string;
  isActive: boolean;
  isTrial: boolean;
  shopCount: number;
  createdAt: string;
}

const plan = (over: Partial<Plan>): Plan => ({
  id: "p",
  name: "Plan",
  maxUsers: 5,
  maxBranches: 1,
  priceMonthly: "0.00",
  isActive: true,
  isTrial: false,
  shopCount: 0,
  createdAt: "2026-11-01T05:00:00Z",
  ...over,
});

/** Calendar math in UTC on `YYYY-MM-DD` days. */
const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
}).format(new Date());

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return;
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${process.env.SHOTS}/${name}.png`,
    fullPage: true,
  });
}

/** CORS that also allows DELETE (the shared helper lists GET/POST/PATCH). */
async function headersFor(route: Route) {
  return {
    ...cors(await route.request().headerValue("origin")),
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };
}

async function fakeApi(page: Page) {
  const plans: Plan[] = [
    plan({
      id: "p-trial",
      name: "Trial",
      maxUsers: 3,
      isTrial: true,
      shopCount: 12,
    }),
    plan({
      id: "p-basic",
      name: "Basic",
      maxUsers: 5,
      priceMonthly: "2500.00",
      shopCount: 7,
    }),
    plan({
      id: "p-pro",
      name: "Pro",
      maxUsers: 15,
      maxBranches: 3,
      priceMonthly: "6000.00",
      shopCount: 2,
    }),
    plan({
      id: "p-old",
      name: "Launch offer",
      maxUsers: 4,
      priceMonthly: "1500.00",
      isActive: false,
      shopCount: 0,
    }),
  ];
  const endsOn = addDays(today, -9);
  let subscription = {
    id: "s1",
    plan: {
      id: "p-trial",
      name: "Trial",
      maxUsers: 3,
      maxBranches: 1,
      priceMonthly: "0.00",
    },
    startsOn: addDays(endsOn, -14),
    endsOn,
    graceDays: 7,
    graceEndsOn: addDays(endsOn, 7),
    status: "expired",
    state: "read_only",
    daysLeft: 0,
    graceDaysLeft: 0,
    usersUsed: 3,
  };
  const shop = () => ({
    id: "t1",
    name: "Al-Madina Traders",
    slug: "al-madina-traders",
    city: "Okara",
    phone: "03001234567",
    ownerName: "Haji Aslam",
    status: "active",
    userCount: 3,
    createdAt: "2026-09-01T07:00:00Z",
    email: null,
    address: "Shop 12, Grain Market",
    logoUrl: null,
    updatedAt: "2026-10-01T07:00:00Z",
    owner: {
      id: "u1",
      name: "Haji Aslam",
      phone: "03007654321",
      email: null,
      isActive: true,
      mustChangePassword: false,
    },
    subscription,
  });
  const writes: { method: string; path: string; body: unknown }[] = [];

  const reply = async (route: Route, status: number, body: unknown) =>
    route.fulfill({
      status,
      headers: await headersFor(route),
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route(`${API}/admin/plans**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: await headersFor(route) });
      return;
    }
    const url = new URL(request.url());
    const id = url.pathname.split("/")[3];
    if (request.method() === "GET") {
      const active = url.searchParams.get("isActive");
      const rows = plans.filter(
        (p) => active === null || String(p.isActive) === active,
      );
      await reply(route, 200, {
        data: rows,
        meta: { page: 1, limit: 20, total: rows.length },
      });
      return;
    }
    const body = request.postDataJSON?.() ?? null;
    writes.push({ method: request.method(), path: url.pathname, body });
    if (request.method() === "POST") {
      const created = plan({
        ...body,
        id: `p-${plans.length + 1}`,
        priceMonthly: `${body.priceMonthly}.00`,
      });
      plans.push(created);
      await reply(route, 201, created);
      return;
    }
    const index = plans.findIndex((p) => p.id === id);
    if (request.method() === "PATCH") {
      plans[index] = { ...plans[index], ...body };
      await reply(route, 200, plans[index]);
      return;
    }
    if (request.method() === "DELETE") {
      const [removed] = plans.splice(index, 1);
      await reply(route, 200, { result: "deleted", plan: removed });
    }
  });

  await page.route(`${API}/admin/tenants/t1**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: await headersFor(route) });
      return;
    }
    const url = new URL(request.url());
    if (url.pathname.endsWith("/subscription")) {
      const body = request.postDataJSON();
      writes.push({ method: request.method(), path: url.pathname, body });
      const ends = body.endsOn as string;
      const chosen =
        request.method() === "POST"
          ? plans.find((p) => p.id === body.planId)!
          : null;
      subscription = {
        ...subscription,
        ...(chosen
          ? {
              id: "s2",
              plan: {
                id: chosen.id,
                name: chosen.name,
                maxUsers: chosen.maxUsers,
                maxBranches: chosen.maxBranches,
                priceMonthly: chosen.priceMonthly,
              },
              startsOn: body.startsOn,
              graceDays: body.graceDays,
            }
          : {}),
        endsOn: ends,
        graceEndsOn: addDays(ends, subscription.graceDays),
        status: "active",
        state: "active",
        daysLeft: Math.round(
          (Date.parse(ends) - Date.parse(today)) / 86_400_000,
        ),
      };
      await reply(route, request.method() === "POST" ? 201 : 200, subscription);
      return;
    }
    await reply(route, 200, shop());
  });

  return writes;
}

test.beforeEach(async ({ page, context }) => {
  await signedInAsSuperAdmin(page, context);
});

test("plans list: prices in rupees, Trial marked, Table | Chart toggle works", async ({
  page,
}) => {
  await fakeApi(page);
  await page.goto("/plans");

  const table = page.getByRole("table", { name: "Subscription plans" });
  await expect(table.getByRole("row", { name: /Basic/ })).toContainText(
    "Rs 2,500.00",
  );
  await expect(table.getByRole("row", { name: /Trial/ })).toContainText(
    "New shops",
  );
  await expect(table.getByRole("row", { name: /Launch offer/ })).toContainText(
    "Inactive",
  );
  await shot(page, "admin-plans-list");

  await page.getByRole("button", { name: "Chart", exact: true }).click();
  await expect(page).toHaveURL(/view=chart/);
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(table).toBeVisible();
});

test("create a plan with the form", async ({ page }) => {
  const writes = await fakeApi(page);
  await page.goto("/plans");
  await page.getByRole("button", { name: "New plan" }).first().click();

  const dialog = page.getByRole("dialog", { name: "New plan" });
  await dialog.getByLabel("Plan name").fill("Gold");
  await dialog.getByLabel("Max users").fill("25");
  await dialog.getByLabel("Max branches").fill("5");
  await dialog.getByLabel("Price per month (Rs)").fill("12000");
  await shot(page, "admin-plan-form");
  await dialog.getByRole("button", { name: "Create plan" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("table").getByRole("row", { name: /Gold/ }),
  ).toContainText("Rs 12,000.00");
  expect(writes[0]).toMatchObject({
    method: "POST",
    body: { name: "Gold", maxUsers: 25, priceMonthly: "12000" },
  });
});

test("shop detail: read-only shop extended from the dialog", async ({
  page,
}) => {
  const writes = await fakeApi(page);
  await page.goto("/shops/t1");

  const card = page.getByRole("region", { name: "Plan" });
  await expect(card).toContainText("Read-only");
  await card.getByRole("button", { name: "Assign / extend plan" }).click();

  const dialog = page.getByRole("dialog", { name: "Assign or extend plan" });
  await dialog.getByRole("button", { name: "+3 months" }).click();
  await expect(dialog.getByTestId("subscription-summary")).toBeVisible();
  await shot(page, "admin-shop-extend-dialog");
  await dialog.getByRole("button", { name: "Extend plan" }).click();

  await expect(dialog).toBeHidden();
  await expect(card).toContainText("Active");
  expect(writes.at(-1)).toMatchObject({
    method: "PATCH",
    path: "/admin/tenants/t1/subscription",
  });
  await shot(page, "admin-shop-detail-plan");
});

test("shop detail: change plan sends plan, dates and grace", async ({
  page,
}) => {
  const writes = await fakeApi(page);
  await page.goto("/shops/t1");
  await page
    .getByRole("region", { name: "Plan" })
    .getByRole("button", { name: "Assign / extend plan" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Assign or extend plan" });
  await dialog.getByRole("tab", { name: "Change plan" }).click();
  await dialog.getByRole("combobox", { name: "Plan" }).click();
  await page.getByRole("option", { name: /^Pro/ }).click();
  await shot(page, "admin-shop-assign-dialog");
  await dialog.getByRole("button", { name: "Assign plan" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("subscription-plan")).toHaveText("Pro");
  expect(writes.at(-1)).toMatchObject({
    method: "POST",
    body: { planId: "p-pro", startsOn: today, graceDays: 7 },
  });
});
