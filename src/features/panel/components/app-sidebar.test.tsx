import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useUiStore } from "@/stores/ui";
import { fakeAdapter, ok, owner, superAdmin } from "@/test/fake-api";
import { media } from "@/test/media";
import { renderPanel, resetStores } from "@/test/render-panel";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const defaultAdapter = api.defaults.adapter;

function mainMenu() {
  return screen.getByRole("navigation", { name: "Main menu" });
}

describe("AppSidebar", () => {
  beforeEach(() => {
    pathname.current = "/dashboard";
    api.defaults.adapter = fakeAdapter(async (config) =>
      ok(config, superAdmin),
    ).adapter;
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
  });

  it("shows every admin menu item, linked to its page", () => {
    renderPanel();

    const links = within(mainMenu()).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Dashboard", "/dashboard"],
      ["Shops", "/shops"],
      ["Plans", "/plans"],
      ["Users", "/users"],
      ["Audit logs", "/audit-logs"],
      ["Settings", "/settings"],
    ]);
  });

  it("highlights the item of the current page (and pages below it)", () => {
    pathname.current = "/shops/42";
    renderPanel();

    const shops = within(mainMenu()).getByRole("link", { name: "Shops" });
    expect(shops).toHaveAttribute("aria-current", "page");
    expect(shops).toHaveAttribute("data-active", "true");
    const dashboard = within(mainMenu()).getByRole("link", {
      name: "Dashboard",
    });
    expect(dashboard).not.toHaveAttribute("aria-current");
    expect(dashboard).toHaveAttribute("data-active", "false");
  });

  it("shows no menu items to a shop role", () => {
    renderPanel("page", owner);

    expect(within(mainMenu()).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("collapses to icons and expands again, remembering the choice", () => {
    renderPanel();
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const toggle = screen.getByRole("button", { name: "Toggle menu" });

    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);

    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(sidebar).toHaveAttribute("data-collapsible", "icon");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    expect(localStorage.getItem("gm-admin-ui")).toContain(
      '"sidebarOpen":false',
    );

    fireEvent.click(toggle);

    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it("opens as a drawer on mobile and closes after picking a page", () => {
    media.mobile = true;
    renderPanel();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));

    const drawer = screen.getByRole("dialog");
    fireEvent.click(within(drawer).getByRole("link", { name: "Plans" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
