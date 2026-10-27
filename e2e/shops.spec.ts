import { expect, type Page, test } from "@playwright/test";
import { API, cors, signedInAsSuperAdmin } from "./mock-api";

/**
 * Shops (tenants) with the API mocked by an in-memory fake that follows the
 * tenants contract. The full "create shop → log in as the new owner" flow
 * spans the admin and web apps and is checked against the real API.
 */

const TEMP_PASSWORD = "Tmp-9fK2-xQ7w";
const TAKEN_PHONE = "03001112223";

type Status = "trial" | "active" | "suspended" | "cancelled";

interface Shop {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string;
  ownerName: string;
  status: Status;
  userCount: number;
  createdAt: string;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
  } | null;
}

function shop(
  id: string,
  name: string,
  city: string,
  status: Status,
  ownerName: string,
  ownerPhone: string,
): Shop {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\W+/g, "-"),
    city,
    phone: ownerPhone,
    ownerName,
    status,
    userCount: 2,
    createdAt: "2026-09-01T07:00:00Z",
    email: null,
    address: null,
    logoUrl: null,
    updatedAt: "2026-09-01T07:00:00Z",
    owner: {
      id: `${id}-owner`,
      name: ownerName,
      phone: ownerPhone,
      email: null,
      isActive: true,
      mustChangePassword: false,
    },
  };
}

const normalise = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("92") ? `0${digits.slice(2)}` : digits;
};

const summary = (s: Shop) => ({
  id: s.id,
  name: s.name,
  slug: s.slug,
  city: s.city,
  phone: s.phone,
  ownerName: s.ownerName,
  status: s.status,
  userCount: s.userCount,
  createdAt: s.createdAt,
});

/** Fake `/admin/tenants` API; returns the list of requests it answered. */
async function fakeTenantsApi(page: Page) {
  const shops: Shop[] = [
    shop(
      "t1",
      "Al-Madina Traders",
      "Okara",
      "active",
      "Haji Aslam",
      "03001234567",
    ),
    shop(
      "t2",
      "Bismillah Grain",
      "Sahiwal",
      "suspended",
      "Rana Tariq",
      TAKEN_PHONE,
    ),
  ];
  const seen: { method: string; url: string }[] = [];

  await page.route(`${API}/admin/tenants**`, async (route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = new URL(request.url());
    seen.push({ method: request.method(), url: url.pathname + url.search });
    const reply = (status: number, body: unknown) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    const [, , , id, action] = url.pathname.split("/");
    const found = id ? shops.find((s) => s.id === id) : undefined;

    if (request.method() === "GET" && !id) {
      const q = (url.searchParams.get("search") ?? "").toLowerCase();
      const status = url.searchParams.get("status");
      const sort = url.searchParams.get("sort") ?? "-createdAt";
      let rows = shops.filter(
        (s) =>
          (!status || s.status === status) &&
          (!q ||
            [
              s.name,
              s.ownerName,
              s.phone,
              s.owner?.phone ?? "",
              s.city ?? "",
            ].some((v) => v.toLowerCase().includes(q))),
      );
      const key = sort.replace("-", "") as "name" | "createdAt";
      rows = [...rows].sort(
        (a, b) =>
          a[key].localeCompare(b[key]) * (sort.startsWith("-") ? -1 : 1),
      );
      await reply(200, {
        data: rows.map(summary),
        meta: { page: 1, limit: 20, total: rows.length },
      });
      return;
    }

    if (request.method() === "POST" && !id) {
      const body = request.postDataJSON();
      if (
        shops.some(
          (s) =>
            s.owner && normalise(s.owner.phone) === normalise(body.owner.phone),
        )
      ) {
        await reply(409, {
          statusCode: 409,
          code: "PHONE_TAKEN",
          message: "This phone already has an account",
          errors: [{ field: "owner.phone" }],
        });
        return;
      }
      const created: Shop = {
        ...shop(
          `t${shops.length + 1}`,
          body.name,
          body.city ?? null,
          "trial",
          body.owner.name,
          normalise(body.owner.phone),
        ),
        phone: normalise(body.phone),
        address: body.address ?? null,
        userCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      created.owner!.mustChangePassword = true;
      shops.unshift(created);
      await reply(201, { tenant: created, temporaryPassword: TEMP_PASSWORD });
      return;
    }

    if (!found) {
      await reply(404, { statusCode: 404, message: "Shop not found" });
      return;
    }
    if (request.method() === "GET" && !action) {
      await reply(200, found);
      return;
    }
    if (
      request.method() === "POST" &&
      (action === "suspend" || action === "activate")
    ) {
      found.status = action === "suspend" ? "suspended" : "active";
      found.updatedAt = new Date().toISOString();
      await reply(200, found);
      return;
    }
    await route.fallback();
  });
  return seen;
}

const mainMenu = (page: Page) =>
  page.getByRole("navigation", { name: "Main menu" });
const shopRows = (page: Page) =>
  page.getByRole("table", { name: "Shops" }).locator("tbody tr");

async function fillNewShop(page: Page, ownerPhone: string) {
  await page.getByLabel("Shop name").fill("Ghulam Rasool & Sons");
  await page.getByLabel(/^City/).fill("Okara");
  await page.getByLabel("Shop phone").fill("0300 5556667");
  await page.getByLabel("Owner name").fill("Ghulam Rasool");
  await page.getByLabel("Owner phone").fill(ownerPhone);
}

test.describe("shops", () => {
  test("search and filter in the URL → new shop → temporary password → suspend → activate", async ({
    page,
    context,
  }) => {
    await signedInAsSuperAdmin(page, context);
    const requests = await fakeTenantsApi(page);

    await page.goto("/dashboard");
    await mainMenu(page).getByRole("link", { name: "Shops" }).click();
    await expect(page).toHaveURL("/shops");
    await expect(
      page.getByRole("heading", { level: 1, name: "Shops" }),
    ).toBeVisible();
    await expect(shopRows(page)).toHaveCount(2);

    // Search (debounced) and status filter are kept in the URL.
    await page.getByLabel("Search shops").fill("okara");
    await expect(page).toHaveURL("/shops?q=okara");
    await expect(shopRows(page)).toHaveCount(1);
    await expect(shopRows(page).first()).toContainText("Al-Madina Traders");

    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Suspended" }).click();
    await expect(page).toHaveURL("/shops?q=okara&status=suspended");
    await expect(page.getByText("No shops match")).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL("/shops?q=okara&status=suspended");
    await expect(page.getByLabel("Search shops")).toHaveValue("okara");
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveText(
      "Suspended",
    );
    await expect(page.getByText("No shops match")).toBeVisible();
    expect(requests.at(-1)?.url).toContain("search=okara");
    expect(requests.at(-1)?.url).toContain("status=suspended");

    await page.goBack();
    await expect(page).toHaveURL("/shops?q=okara");
    await expect(shopRows(page)).toHaveCount(1);

    // New shop.
    await page.getByRole("link", { name: "New shop" }).click();
    await expect(page).toHaveURL("/shops/new");
    await fillNewShop(page, "0300 7654321");
    await page.getByRole("button", { name: "Create shop" }).click();

    const dialog = page.getByRole("alertdialog", { name: "Shop created" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Temporary password")).toHaveValue(
      TEMP_PASSWORD,
    );
    await expect(dialog).toContainText("shown only now");
    expect(page.url()).not.toContain(TEMP_PASSWORD);
    await dialog
      .getByRole("button", { name: "I’ve saved it, open the shop" })
      .click();

    await expect(page).toHaveURL("/shops/t3");
    await expect(
      page.getByRole("heading", { level: 1, name: "Ghulam Rasool & Sons" }),
    ).toBeVisible();
    const details = page.getByRole("region", { name: "Shop details" });
    await expect(details).toContainText("Trial");
    await expect(page.getByRole("region", { name: "Owner" })).toContainText(
      "must change the temporary password",
    );
    await expect(page.getByText(TEMP_PASSWORD)).toHaveCount(0);
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toContain(TEMP_PASSWORD);

    // Suspend, with a confirmation.
    await page.getByRole("button", { name: "Suspend shop" }).click();
    const confirm = page.getByRole("alertdialog", {
      name: "Suspend Ghulam Rasool & Sons?",
    });
    await expect(confirm).toContainText("signed out within 15 minutes");
    await confirm.getByRole("button", { name: "Suspend shop" }).click();
    await expect(confirm).toBeHidden();
    await expect(details).toContainText("Suspended");
    await expect(
      page.getByText("Ghulam Rasool & Sons is suspended"),
    ).toBeVisible();

    // Activate again.
    await page.getByRole("button", { name: "Activate shop" }).click();
    const activate = page.getByRole("alertdialog", {
      name: "Activate Ghulam Rasool & Sons?",
    });
    await activate.getByRole("button", { name: "Activate shop" }).click();
    await expect(activate).toBeHidden();
    await expect(details).toContainText("Active");
    await expect(
      page.getByRole("button", { name: "Suspend shop" }),
    ).toBeVisible();

    expect(
      requests.filter((r) => r.method === "POST").map((r) => r.url),
    ).toEqual([
      "/admin/tenants",
      "/admin/tenants/t3/suspend",
      "/admin/tenants/t3/activate",
    ]);
  });

  test("an owner phone that already has an account shows the field error", async ({
    page,
    context,
  }) => {
    await signedInAsSuperAdmin(page, context);
    await fakeTenantsApi(page);

    await page.goto("/shops/new");
    await fillNewShop(page, "0300-1112223");
    await page.getByRole("button", { name: "Create shop" }).click();

    const phone = page.getByLabel("Owner phone");
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText("This phone already has an account"),
    ).toBeVisible();
    await expect(phone).toBeFocused();
    await expect(page).toHaveURL("/shops/new");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("an unknown shop shows the panel's 404", async ({ page, context }) => {
    await signedInAsSuperAdmin(page, context);
    await fakeTenantsApi(page);

    await page.goto("/shops/nope");

    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    await expect(mainMenu(page)).toBeVisible();
  });
});
