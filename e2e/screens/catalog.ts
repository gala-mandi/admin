import { expect, type Page } from "@playwright/test";
import { plansListText } from "../../src/features/plans/text";
import type { ListState } from "./admin-server";

/**
 * Every super-admin screen of ticket 42 in the state its design record
 * shows. Used by `e2e/screen-gallery.spec.ts`; the index is
 * docs/design/screens/README.md. The admin panel is English only, so each
 * screen is pictured in the light and the dark theme instead.
 */

export interface Screen {
  module: string;
  id: string;
  title: string;
  route: string;
  /** The API paths of the screen's own list (adds empty/loading/error). */
  listPaths?: string[];
  states?: Exclude<ListState, "data">[];
  act?: (page: Page) => Promise<void>;
  /** Full-page picture on desktop too. */
  tall?: boolean;
  /** A dialog is open: the window only. */
  overlay?: boolean;
}

export const screens: Screen[] = [
  {
    module: "layout",
    id: "shell",
    title: "Admin layout (sidebar, header, account menu)",
    route: "/shops",
  },
  {
    module: "layout",
    id: "not-found-404",
    title: "Page not found (404)",
    route: "/no-such-page",
  },
  {
    module: "dashboard",
    id: "platform-dashboard",
    title: "Platform dashboard",
    route: "/dashboard",
    listPaths: ["/admin/stats", "/admin/stats/", "/admin/tenants"],
    tall: true,
  },
  {
    module: "shops",
    id: "shops-list",
    title: "Shops list",
    route: "/shops",
    listPaths: ["/admin/tenants"],
  },
  {
    module: "shops",
    id: "shop-detail",
    title: "Shop detail",
    route: "/shops/t1",
    listPaths: ["/admin/tenants/"],
    states: ["loading", "error"],
    tall: true,
  },
  {
    module: "shops",
    id: "shop-create",
    title: "Create shop",
    route: "/shops/new",
    tall: true,
  },
  {
    module: "shops",
    id: "shop-edit",
    title: "Edit shop",
    route: "/shops/t1/edit",
    tall: true,
  },
  {
    module: "plans",
    id: "plans-list",
    title: "Plans",
    route: "/plans",
    listPaths: ["/admin/plans"],
  },
  {
    module: "plans",
    id: "plan-new",
    title: "New plan form",
    route: "/plans",
    overlay: true,
    act: async (page) => {
      await page
        .getByRole("button", { name: plansListText.newPlan })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    module: "plans",
    id: "plan-edit",
    title: "Edit plan form",
    route: "/plans",
    overlay: true,
    act: async (page) => {
      await page.getByRole("row").nth(2).getByRole("button").last().click();
      await page
        .getByRole("menuitem", { name: plansListText.rowActions.edit })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
];
