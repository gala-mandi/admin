import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { hardRedirect } from "@/lib/navigation";
import { useSessionStore } from "@/stores/session";
import { fakeAdapter, httpError, ok, superAdmin } from "@/test/fake-api";
import { renderPanel, resetStores } from "@/test/render-panel";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("@/lib/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/navigation")>()),
  hardRedirect: vi.fn(),
}));

const defaultAdapter = api.defaults.adapter;

function breadcrumbs() {
  return screen.getByRole("navigation", { name: "Breadcrumb" });
}

function openUserMenu() {
  fireEvent.keyDown(
    screen.getByRole("button", { name: /^Account menu: Platform Admin/ }),
    { key: "Enter" },
  );
  return screen.getByRole("menu");
}

describe("PanelHeader", () => {
  let fake: ReturnType<typeof fakeAdapter>;

  beforeEach(() => {
    pathname.current = "/dashboard";
    vi.mocked(hardRedirect).mockReset();
    fake = fakeAdapter(async (config) =>
      config.url === "/auth/me" ? ok(config, superAdmin) : ok(config, "", 204),
    );
    api.defaults.adapter = fake.adapter;
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
  });

  describe("breadcrumbs", () => {
    it("shows only the current page on the dashboard", () => {
      renderPanel();

      const items = within(breadcrumbs()).getAllByRole("listitem");
      expect(items.map((li) => li.textContent)).toEqual(["Dashboard"]);
      expect(breadcrumbs().querySelector("a[href]")).toBeNull();
    });

    it("links back to the dashboard from a section", () => {
      pathname.current = "/audit-logs";
      renderPanel();

      const nav = breadcrumbs();
      expect(
        within(nav).getByRole("link", { name: "Dashboard" }),
      ).toHaveAttribute("href", "/dashboard");
      expect(within(nav).getByText("Audit logs")).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("says page not found for an unknown URL", () => {
      pathname.current = "/no-such-page";
      renderPanel();

      expect(within(breadcrumbs()).getByText("Page not found")).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("user menu", () => {
    it("shows the user's name and role", () => {
      renderPanel();

      expect(screen.getByTestId("user-name")).toHaveTextContent(
        "Platform Admin",
      );
      expect(screen.getByTestId("user-role")).toHaveTextContent("Super admin");

      const menu = openUserMenu();
      expect(menu).toHaveTextContent("Platform Admin");
      expect(menu).toHaveTextContent("admin@gallamandi.pk");
      expect(
        within(menu)
          .getAllByRole("menuitem")
          .map((i) => i.textContent),
      ).toEqual(["Log out", "Log out of all devices"]);
    });

    it("Log out calls the API, clears the session and goes to login", async () => {
      renderPanel();

      fireEvent.click(
        within(openUserMenu()).getByRole("menuitem", { name: "Log out" }),
      );

      await waitFor(() => expect(hardRedirect).toHaveBeenCalledWith("/login"));
      expect(fake.calls.map((c) => c.url)).toContain("/auth/logout");
      expect(useSessionStore.getState().accessToken).toBeNull();
    });

    it("Log out of all devices calls the API, then goes to login", async () => {
      renderPanel();

      fireEvent.click(
        within(openUserMenu()).getByRole("menuitem", {
          name: "Log out of all devices",
        }),
      );

      await waitFor(() => expect(hardRedirect).toHaveBeenCalledWith("/login"));
      expect(fake.calls.map((c) => c.url)).toContain("/auth/logout-all");
    });

    it("shows a toast and stays signed in when log out of all devices fails", async () => {
      api.defaults.adapter = fakeAdapter(async (config) => {
        if (config.url === "/auth/me") return ok(config, superAdmin);
        throw httpError(config, 500);
      }).adapter;
      renderPanel();

      fireEvent.click(
        within(openUserMenu()).getByRole("menuitem", {
          name: "Log out of all devices",
        }),
      );

      expect(
        await screen.findByText("Couldn’t log out of all devices. Try again."),
      ).toBeInTheDocument();
      expect(hardRedirect).not.toHaveBeenCalled();
      expect(useSessionStore.getState().accessToken).toBe("token-1");
    });
  });
});
