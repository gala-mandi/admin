import { expect, type BrowserContext, type Page } from "@playwright/test";
import {
  mockEndpoint,
  session,
  setRefreshCookie,
  superAdmin,
} from "./mock-api";

/**
 * The admin panel's auth screens brought into the state their design shows
 * (ticket 40): used by the accessibility checks and the visual review. All
 * API calls are mocked.
 */

export interface AuthScreen {
  /** Number from docs/design/README.md. */
  id: string;
  title: string;
  /** docs/design/auth/<design>.dc.html */
  design: string;
  route: string;
  open: (page: Page, context: BrowserContext) => Promise<void>;
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Work email or phone").fill("admin@gallamandi.pk");
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in securely" }).click();
}

export const authScreens: AuthScreen[] = [
  {
    id: "4.3",
    title: "Super-admin sign in",
    design: "AdminSignIn",
    route: "/login",
    open: async (page) => {
      await page.goto("/login");
      await expect(
        page.getByRole("heading", { name: "Super-admin sign in" }),
      ).toBeVisible();
    },
  },
  {
    id: "4.3",
    title: "Super-admin sign in — wrong password",
    design: "AdminSignIn",
    route: "/login (401)",
    open: async (page) => {
      await mockEndpoint(page, "POST", "/auth/login", () => ({
        status: 401,
        body: { statusCode: 401, message: "Invalid credentials" },
        headers: { "x-ratelimit-remaining": "2" },
      }));
      await signIn(page);
      await expect(page.getByRole("alert").first()).toBeVisible();
    },
  },
  {
    id: "1.3",
    title: "Too many attempts",
    design: "LockedOut",
    route: "/login (429)",
    open: async (page) => {
      await mockEndpoint(page, "POST", "/auth/login", () => ({
        status: 429,
        body: { statusCode: 429, message: "Too many attempts" },
        headers: { "retry-after": "60" },
      }));
      await signIn(page);
      await expect(page.getByRole("timer").first()).toBeVisible();
    },
  },
  {
    id: "3.3",
    title: "Session expired",
    design: "SessionExpired",
    route: "/login?reason=session-expired",
    open: async (page) => {
      await page.goto("/login?reason=session-expired");
      await expect(page.getByText("Your session has ended")).toBeVisible();
    },
  },
  {
    id: "3.2",
    title: "First login — change password",
    design: "ChangeTempPassword",
    route: "/change-password",
    open: async (page, context) => {
      const admin = { ...superAdmin, mustChangePassword: true };
      await setRefreshCookie(context);
      await mockEndpoint(page, "POST", "/auth/refresh", () => ({
        status: 200,
        body: session("admin-token", admin),
      }));
      await mockEndpoint(page, "GET", "/auth/me", () => ({
        status: 200,
        body: admin,
      }));
      await page.goto("/change-password");
      await expect(
        page.getByRole("heading", { name: "Choose your own password" }),
      ).toBeVisible();
    },
  },
  {
    id: "4.2",
    title: "Account disabled",
    design: "AccountDisabled",
    route: "/account-disabled",
    open: async (page) => {
      await page.goto("/account-disabled");
      await expect(
        page.getByRole("heading", { name: "Your account is turned off" }),
      ).toBeVisible();
    },
  },
];

/** Waits for the web fonts (Nastaliq loads late) before measuring. */
export async function fontsReady(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
