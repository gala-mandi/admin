import { expect, type Page, test } from "@playwright/test";
import {
  bearer,
  mockEndpoint,
  owner,
  session,
  setRefreshCookie,
  superAdmin,
} from "./mock-api";

async function signIn(page: Page, identifier = "admin@gallamandi.pk") {
  await page.goto("/login");
  await page.getByLabel("Work email or phone").fill(identifier);
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in securely" }).click();
}

test.describe("admin auth", () => {
  test("super_admin login → dashboard", async ({ page, context }) => {
    await mockEndpoint(page, "POST", "/auth/login", async () => {
      await setRefreshCookie(context);
      return { status: 200, body: session("admin-token") };
    });
    await mockEndpoint(page, "GET", "/auth/me", () => ({
      status: 200,
      body: superAdmin,
    }));

    await signIn(page);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("user-name")).toHaveText("Platform Admin");
    await expect(page.getByTestId("user-role")).toHaveText("Super admin");
    const menu = page.getByRole("navigation", { name: "Main menu" });
    await expect(menu.getByRole("listitem")).toHaveCount(6);
  });

  test("owner login → rejected with a message, no logout call", async ({
    page,
    context,
  }) => {
    await mockEndpoint(page, "POST", "/auth/login", async () => {
      await setRefreshCookie(context);
      return { status: 200, body: session("shop-token", owner) };
    });
    const logouts = await mockEndpoint(page, "POST", "/auth/logout", () => ({
      status: 204,
    }));

    await signIn(page, "03000000002");

    await expect(
      page.getByText("This account can't sign in to the admin panel"),
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
    expect(logouts).toHaveLength(0);
  });

  test("shop user with the shared cookie opening an admin page lands on login with the message", async ({
    page,
    context,
  }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("shop-token", owner),
    }));
    const logouts = await mockEndpoint(page, "POST", "/auth/logout", () => ({
      status: 204,
    }));

    await page.goto("/dashboard");

    await expect(page).toHaveURL("/login?reason=not-admin");
    await expect(
      page.getByText("This account can't sign in to the admin panel"),
    ).toBeVisible();
    expect(logouts).toHaveLength(0);
  });

  test("expired access token is refreshed silently", async ({
    page,
    context,
  }) => {
    await mockEndpoint(page, "POST", "/auth/login", async () => {
      await setRefreshCookie(context);
      return { status: 200, body: session("expired-token") };
    });
    const refreshes = await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("fresh-token"),
    }));
    const meCalls = await mockEndpoint(page, "GET", "/auth/me", (request) =>
      bearer(request) === "fresh-token"
        ? { status: 200, body: superAdmin }
        : { status: 401, body: { statusCode: 401, message: "Unauthorized" } },
    );

    await signIn(page);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Welcome, Platform Admin")).toBeVisible();
    expect(refreshes).toHaveLength(1);
    expect(meCalls.map(bearer)).toEqual(["expired-token", "fresh-token"]);
  });

  test("refresh token expired → login with the session-expired message", async ({
    page,
    context,
  }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", async () => {
      await context.clearCookies();
      return {
        status: 401,
        body: {
          statusCode: 401,
          message: "Session expired",
          code: "SESSION_EXPIRED",
        },
      };
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(
      "/login?reason=session-expired&next=%2Fdashboard",
    );
    await expect(page.getByText("Your session has ended")).toBeVisible();
  });

  test("logout → back to login", async ({ page, context }) => {
    await setRefreshCookie(context);
    await mockEndpoint(page, "POST", "/auth/refresh", () => ({
      status: 200,
      body: session("admin-token"),
    }));
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

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Log out", exact: true }).click();

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { name: "Super-admin sign in" }),
    ).toBeVisible();
    expect(logouts).toHaveLength(1);
  });

  test("protected route without the cookie redirects to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL("/login?next=%2Fdashboard");
    await expect(
      page.getByRole("heading", { name: "Super-admin sign in" }),
    ).toBeVisible();
  });
});
