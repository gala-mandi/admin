import type { BrowserContext, Page, Request, Route } from "@playwright/test";

export const API = "http://localhost:4000";

export const owner = {
  id: "u1",
  name: "Haji Aslam",
  phone: "03000000002",
  email: null,
  role: "owner",
  tenantId: "t1",
  mustChangePassword: false,
  tenant: { id: "t1", name: "Demo Mandi", logoUrl: null, status: "active" },
};

export const superAdmin = {
  id: "sa1",
  name: "Platform Admin",
  phone: "03000000001",
  email: "admin@gallamandi.pk",
  role: "super_admin",
  tenantId: null,
  mustChangePassword: false,
  tenant: null,
};

export type Reply = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};
type Handler = (request: Request) => Reply | Promise<Reply>;

export function cors(origin: string | null): Record<string, string> {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type, accept",
    "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
    "access-control-expose-headers": "retry-after, x-ratelimit-remaining",
  };
}

/**
 * Mocks one API endpoint so CI needs no server. Returns the requests it
 * answered (CORS preflights are not counted).
 */
export async function mockEndpoint(
  page: Page,
  method: string,
  path: string,
  handler: Handler,
) {
  const seen: Request[] = [];
  await page.route(`${API}${path}`, async (route: Route) => {
    const request = route.request();
    const headers = cors(await request.headerValue("origin"));
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (request.method() !== method) {
      await route.fallback();
      return;
    }
    seen.push(request);
    const reply = await handler(request);
    await route.fulfill({
      status: reply.status,
      headers: { ...headers, ...reply.headers },
      contentType: "application/json",
      body: reply.body === undefined ? "" : JSON.stringify(reply.body),
    });
  });
  return seen;
}

export function session(accessToken: string, user: object = superAdmin) {
  return { accessToken, expiresIn: 900, user };
}

/** Does what the server's `Set-Cookie: refresh_token=…` does. */
export async function setRefreshCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "refresh_token",
      value: "test-refresh",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export function bearer(request: Request): string | null {
  const header = request.headers()["authorization"];
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

/** A super-admin whose refresh cookie restores the session on page load. */
export async function signedInAsSuperAdmin(
  page: Page,
  context: BrowserContext,
) {
  await setRefreshCookie(context);
  await mockEndpoint(page, "POST", "/auth/refresh", () => ({
    status: 200,
    body: session("admin-token"),
  }));
  await mockEndpoint(page, "GET", "/auth/me", () => ({
    status: 200,
    body: superAdmin,
  }));
}

/** `GET /admin/tenants` (any query) answers with an empty list of shops. */
export async function mockEmptyShopList(page: Page) {
  await page.route(`${API}/admin/tenants**`, async (route) => {
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
      body: JSON.stringify({
        data: [],
        meta: { page: 1, limit: 20, total: 0 },
      }),
    });
  });
}
