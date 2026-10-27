import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { panelPaths } from "@/lib/routes";
import { proxy } from "./proxy";

function request(path: string, withCookie = false) {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  if (withCookie) req.cookies.set("refresh_token", "x");
  return req;
}

describe("proxy", () => {
  it("redirects a protected page without the cookie to login with ?next=", () => {
    const res = proxy(request("/dashboard?tab=1"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard%3Ftab%3D1",
    );
  });

  it("lets a protected page through when the cookie exists", () => {
    const res = proxy(request("/dashboard", true));

    expect(res.headers.get("location")).toBeNull();
  });

  it("keeps public pages public", () => {
    for (const path of ["/login", "/account-disabled"]) {
      expect(proxy(request(path)).headers.get("location")).toBeNull();
    }
  });

  it("sends a signed-in user from /login to the dashboard", () => {
    const res = proxy(request("/login", true));

    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("shows /login when it explains why (session expired, not an admin)", () => {
    for (const reason of ["session-expired", "not-admin"]) {
      const res = proxy(request(`/login?reason=${reason}`, true));
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("protects every other path (e.g. a shop-only page)", () => {
    expect(
      proxy(request("/forgot-password")).headers.get("location"),
    ).toContain("/login?next=");
  });

  it.each(panelPaths)("protects the panel page %s", (path) => {
    expect(proxy(request(path)).headers.get("location")).toBe(
      `http://localhost:3000/login?next=${encodeURIComponent(path)}`,
    );
    expect(proxy(request(path, true)).headers.get("location")).toBeNull();
  });

  it("protects unknown URLs too (they show the 404 inside the panel)", () => {
    expect(proxy(request("/no-such-page")).headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fno-such-page",
    );
  });
});
