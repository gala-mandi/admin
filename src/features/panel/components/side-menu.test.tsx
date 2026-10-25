import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SideMenu } from "./side-menu";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

describe("SideMenu", () => {
  it("shows the admin menu to the super-admin, linking only Dashboard", () => {
    render(<SideMenu role="super_admin" />);

    const nav = screen.getByRole("navigation", { name: "Main menu" });
    const labels = within(nav)
      .getAllByRole("listitem")
      .map((li) => li.textContent?.replace("Soon", "").trim());
    expect(labels).toEqual([
      "Dashboard",
      "Shops",
      "Plans",
      "Users",
      "Audit logs",
      "Settings",
    ]);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/dashboard");
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });

  it.each(["owner", "manager", "operator"] as const)(
    "shows nothing to a %s",
    (role) => {
      render(<SideMenu role={role} />);

      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    },
  );
});
