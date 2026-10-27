import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import {
  mockEndpoint,
  session,
  setRefreshCookie,
  superAdmin,
} from "./mock-api";

const menu = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Shops", path: "/shops" },
  { name: "Plans", path: "/plans" },
  { name: "Users", path: "/users" },
  { name: "Audit logs", path: "/audit-logs" },
  { name: "Settings", path: "/settings" },
];

/** A super-admin whose refresh cookie restores the session on load. */
async function signedIn(page: Page, context: BrowserContext) {
  await setRefreshCookie(context);
  const refreshes = await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("admin-token"),
  }));
  await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: superAdmin,
  }));
  return refreshes;
}

const mainMenu = (page: Page) =>
  page.getByRole("navigation", { name: "Main menu" });

test.describe("admin layout", () => {
  test("login → every menu item → logout", async ({ page, context }) => {
    await mockEndpoint(page, "POST", "/auth/login", async () => {
      await setRefreshCookie(context);
      return { status: 200, body: session("admin-token") };
    });
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 200,
      body: superAdmin,
    }));
    const logouts = await mockEndpoint(
      page,
      "POST",
      "/auth/logout",
      async () => {
        await context.clearCookies();
        return { status: 204 };
      },
    );

    await page.goto("/login");
    await page.getByLabel("Work email or phone").fill("admin@gallamandi.pk");
    await page.getByLabel("Password").fill("demo-password");
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await expect(page).toHaveURL("/dashboard");

    for (const item of menu) {
      await mainMenu(page).getByRole("link", { name: item.name }).click();
      await expect(page).toHaveURL(item.path);
      await expect(
        page.getByRole("heading", { level: 1, name: item.name }),
      ).toBeVisible();
      await expect(
        mainMenu(page).getByRole("link", { name: item.name }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page
          .getByRole("navigation", { name: "Breadcrumb" })
          .getByText(item.name),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Log out", exact: true }).click();

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { name: "Super-admin sign in" }),
    ).toBeVisible();
    expect(logouts).toHaveLength(1);
  });

  test("refreshing a panel page keeps the user signed in", async ({
    page,
    context,
  }) => {
    const refreshes = await signedIn(page, context);

    await page.goto("/plans");
    await expect(page.getByRole("heading", { name: "Plans" })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL("/plans");
    await expect(page.getByRole("heading", { name: "Plans" })).toBeVisible();
    await expect(page.getByTestId("user-name")).toHaveText("Platform Admin");
    expect(refreshes).toHaveLength(2);
  });

  test("desktop sidebar collapses to icons and stays collapsed", async ({
    page,
    context,
  }) => {
    await signedIn(page, context);
    await page.goto("/dashboard");
    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar).toHaveAttribute("data-state", "expanded");

    await page.getByRole("button", { name: "Toggle menu" }).click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");

    await page.reload();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });

  test("dark theme is remembered without a flash", async ({
    page,
    context,
  }) => {
    await signedIn(page, context);
    await page.goto("/dashboard");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(html).toHaveClass(/\bdark\b/);

    // The inline script sets the class before any React code runs.
    await page.route("**/_next/static/**", (route) => route.abort());
    await page.reload();
    await expect(html).toHaveClass(/\bdark\b/);
  });

  test("unknown URL shows the 404 inside the layout", async ({
    page,
    context,
  }) => {
    await signedIn(page, context);

    await page.goto("/no-such-page");

    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    await expect(mainMenu(page)).toBeVisible();
    await expect(page.getByTestId("user-name")).toHaveText("Platform Admin");

    await page.getByRole("link", { name: "Back to dashboard" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the menu opens as a drawer and navigates", async ({
      page,
      context,
    }) => {
      await signedIn(page, context);
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      await expect(mainMenu(page)).toBeHidden();

      await page.getByRole("button", { name: "Toggle menu" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await drawer.getByRole("link", { name: "Users" }).click();

      await expect(page).toHaveURL("/users");
      await expect(drawer).toBeHidden();
      await expect(
        page.getByRole("heading", { level: 1, name: "Users" }),
      ).toBeVisible();
    });
  });
});
