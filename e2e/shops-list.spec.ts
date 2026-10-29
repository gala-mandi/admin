import { expect, type Page, test } from "@playwright/test";
import { API, cors, signedInAsSuperAdmin } from "./mock-api";

/**
 * Shops list on the shared DataTable: page, sort, search and status live in
 * the URL, so a reload shows the same view and asks the server the same.
 * The API is a fake with 60 shops that pages, sorts and filters like the
 * real `GET /admin/tenants`.
 */

type Status = "trial" | "active" | "suspended" | "cancelled";

const shops = Array.from({ length: 60 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `t${n}`,
    name: `Shop ${n}`,
    slug: `shop-${n}`,
    city: i % 5 === 0 ? "Sahiwal" : "Okara",
    phone: `030000000${n}`,
    ownerName: `Owner ${n}`,
    status: (i % 4 === 0 ? "suspended" : "active") as Status,
    userCount: 1,
    createdAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
  };
});

/** Fake list endpoint; returns the query strings it was asked. */
async function fakeShopList(page: Page) {
  const seen: URLSearchParams[] = [];
  await page.route(`${API}/admin/tenants**`, async (route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const params = new URL(request.url()).searchParams;
    seen.push(params);
    const q = (params.get("search") ?? "").toLowerCase();
    const status = params.get("status");
    const sort = params.get("sort") ?? "-createdAt";
    const pageNo = Number(params.get("page") ?? 1);
    const limit = Number(params.get("limit") ?? 20);
    const key = sort.replace("-", "") as "name" | "createdAt";
    const rows = shops
      .filter(
        (s) =>
          (!status || s.status === status) &&
          (!q ||
            [s.name, s.city, s.ownerName, s.phone].some((v) =>
              v.toLowerCase().includes(q),
            )),
      )
      .sort(
        (a, b) =>
          a[key].localeCompare(b[key]) * (sort.startsWith("-") ? -1 : 1),
      );
    await route.fulfill({
      status: 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify({
        data: rows.slice((pageNo - 1) * limit, pageNo * limit),
        meta: { page: pageNo, limit, total: rows.length },
      }),
    });
  });
  return seen;
}

const table = (page: Page) => page.getByRole("table", { name: "Shops" });
const rows = (page: Page) => table(page).locator("tbody tr");
const asObject = (params: URLSearchParams | undefined) =>
  Object.fromEntries([...(params ?? new URLSearchParams())].sort());

test.describe("shops list", () => {
  test("search, status, sort and page survive a reload", async ({
    page,
    context,
  }) => {
    await signedInAsSuperAdmin(page, context);
    const requests = await fakeShopList(page);

    await page.goto("/shops");
    await expect(rows(page)).toHaveCount(20);

    await page.getByLabel("Search shops").fill("okara");
    await expect(page).toHaveURL(/q=okara/);

    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Active" }).click();
    await expect(page).toHaveURL(/status=active/);

    await table(page).getByRole("button", { name: /^Shop/ }).click();
    await expect(page).toHaveURL(/sort=name/);

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(rows(page).first()).toContainText("Shop 35");

    const url = new URL(page.url());
    expect(asObject(url.searchParams)).toEqual({
      page: "2",
      q: "okara",
      sort: "name",
      status: "active",
    });
    const before = asObject(requests.at(-1));
    expect(before).toEqual({
      limit: "20",
      page: "2",
      search: "okara",
      sort: "name",
      status: "active",
    });

    await page.reload();

    await expect(page).toHaveURL(url.toString());
    await expect(page.getByLabel("Search shops")).toHaveValue("okara");
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveText(
      "Active",
    );
    await expect(
      table(page).getByRole("columnheader", { name: /Shop/ }),
    ).toHaveAttribute("aria-sort", "ascending");
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(rows(page).first()).toContainText("Shop 35");
    expect(asObject(requests.at(-1))).toEqual(before);
  });

  test("typing in search sends one request after typing stops", async ({
    page,
    context,
  }) => {
    await signedInAsSuperAdmin(page, context);
    const requests = await fakeShopList(page);

    await page.goto("/shops");
    await expect(rows(page)).toHaveCount(20);
    const loaded = requests.length;

    await page.getByLabel("Search shops").pressSequentially("sahiwal", {
      delay: 60,
    });
    await expect(page).toHaveURL("/shops?q=sahiwal");
    await expect(rows(page)).toHaveCount(12);
    // Give a stray late request the chance to show up.
    await page.waitForTimeout(500);

    const typed = requests.slice(loaded);
    expect(typed.map((params) => params.get("search"))).toEqual(["sahiwal"]);
  });
});
