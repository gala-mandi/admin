import { fireEvent, render, screen, within } from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import {
  fakeAdapter,
  httpError,
  ok,
  owner,
  sessionFor,
  superAdmin,
} from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import {
  activityFeed,
  activityItem,
  inactivePage,
  inactiveShop,
  newShops,
  platformStats,
} from "../test-data";
import { PlatformDashboard } from "./platform-dashboard";

const defaultAdapter = api.defaults.adapter;

type Replies = Partial<
  Record<
    "summary" | "new-shops" | "activity" | "inactive-shops",
    (config: InternalAxiosRequestConfig) => ReturnType<typeof ok> | Error
  >
>;

const defaults: Required<Replies> = {
  summary: (c) => ok(c, platformStats()),
  "new-shops": (c) => ok(c, newShops()),
  activity: (c) => ok(c, activityFeed([activityItem()])),
  "inactive-shops": (c) => ok(c, inactivePage([inactiveShop()])),
};

function renderDashboard(replies: Replies = {}) {
  const fake = fakeAdapter(async (config) => {
    const key = (config.url?.replace(/^\/admin\/stats\/?/, "") ||
      "summary") as keyof Replies;
    const reply = (replies[key] ?? defaults[key])(config);
    if (reply instanceof Error) throw reply;
    return reply;
  });
  api.defaults.adapter = fake.adapter;
  render(
    <TestProviders>
      <PlatformDashboard />
    </TestProviders>,
  );
  return fake;
}

describe("PlatformDashboard", () => {
  beforeEach(() => {
    useSessionStore.getState().setSession(sessionFor(superAdmin));
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("loads every section from /admin/stats", async () => {
    const fake = renderDashboard();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("1,240")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Quiet Traders" }),
    ).toHaveAttribute("href", "/shops/t9");

    const urls = fake.calls.map((c) => c.url).sort();
    expect(urls).toEqual([
      "/admin/stats",
      "/admin/stats/activity",
      "/admin/stats/inactive-shops",
      "/admin/stats/new-shops",
    ]);
  });

  describe("new shops chart", () => {
    it("lists every month for screen readers", async () => {
      renderDashboard({
        "new-shops": (c) =>
          ok(c, newShops([0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 3])),
      });

      const table = await screen.findByRole("table", {
        name: "New shops per month",
      });
      const rows = within(table).getAllByRole("row").slice(1);
      expect(rows).toHaveLength(12);
      expect(rows[0]).toHaveTextContent("Dec 25");
      expect(rows[0]).toHaveTextContent("0");
      expect(rows[11]).toHaveTextContent("Nov 26");
      expect(rows[11]).toHaveTextContent("3");
      expect(screen.getByTestId("new-shops-chart")).toBeInTheDocument();
    });

    it("says so when no shop was added", async () => {
      renderDashboard({
        "new-shops": (c) => ok(c, newShops(Array(12).fill(0))),
      });

      expect(
        await screen.findByText("No new shops in the last 12 months."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("new-shops-chart")).not.toBeInTheDocument();
    });
  });

  describe("recent activity", () => {
    it("shows who did what, in which shop, and when", async () => {
      renderDashboard({
        activity: (c) =>
          ok(
            c,
            activityFeed([
              activityItem(),
              activityItem({
                id: 100,
                tenant: null,
                user: {
                  id: "sa1",
                  name: "Platform Admin",
                  role: "super_admin",
                },
                entity: "plans",
                action: "create",
              }),
              activityItem({
                id: 99,
                user: null,
                entity: "tenant_settings",
                action: "something_new",
              }),
            ]),
          ),
      });

      const feed = await screen.findByRole("list", { name: "Recent activity" });
      const items = within(feed).getAllByRole("listitem");
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent("Haji Aslam (Owner) updated a trader");
      expect(
        within(items[0]).getByRole("link", { name: "Demo Mandi" }),
      ).toHaveAttribute("href", "/shops/t1");
      expect(items[0]).toHaveTextContent("5 minutes ago");
      expect(items[1]).toHaveTextContent(
        "Platform Admin (Super admin) created plans",
      );
      expect(items[1]).toHaveTextContent("Platform");
      expect(items[2]).toHaveTextContent("System something_new shop settings");
    });

    it("has an empty state", async () => {
      renderDashboard({ activity: (c) => ok(c, activityFeed([])) });
      expect(await screen.findByText("No activity yet.")).toBeInTheDocument();
    });
  });

  describe("inactive shops", () => {
    it("shows the shops with status, city, last activity and the total", async () => {
      renderDashboard({
        "inactive-shops": (c) =>
          ok(
            c,
            inactivePage(
              [
                inactiveShop(),
                inactiveShop({
                  id: "t8",
                  name: "Sleepy Mandi",
                  city: null,
                  status: "active",
                }),
              ],
              12,
            ),
          ),
      });

      const table = await screen.findByRole("table", {
        name: "Shops with no activity in 14 days",
      });
      expect(
        await within(table).findByText("Quiet Traders"),
      ).toBeInTheDocument();
      expect(within(table).getByText("Sleepy Mandi")).toBeInTheDocument();
      expect(within(table).getByText("Trial")).toBeInTheDocument();
      expect(within(table).getAllByText("2 weeks ago")[0]).toBeInTheDocument();
      expect(screen.getByTestId("inactive-shops-count")).toHaveTextContent(
        "12 shops",
      );
    });

    it("asks the server for the next page", async () => {
      const fake = renderDashboard({
        "inactive-shops": (c) =>
          ok(c, inactivePage([inactiveShop()], 12, c.params.page as number)),
      });

      await screen.findByRole("link", { name: "Quiet Traders" });
      fireEvent.click(screen.getByRole("button", { name: /next page/i }));
      await screen.findByText(/Page 2/);

      const pages = fake.calls
        .filter((c) => c.url === "/admin/stats/inactive-shops")
        .map((c) => c.url);
      expect(pages).toHaveLength(2);
    });

    it("has an empty state", async () => {
      renderDashboard({
        "inactive-shops": (c) => ok(c, inactivePage([])),
      });
      expect(
        await screen.findByText(
          "Every shop has been active in the last 14 days.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows the 403 page when the server refuses the stats", async () => {
    renderDashboard({ summary: (c) => httpError(c, 403) });
    expect(
      await screen.findByRole("heading", { name: "You don’t have access" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Recent activity")).not.toBeInTheDocument();
  });

  it("shows the 403 page to a role without the dashboard, without calling the API", () => {
    useSessionStore.getState().setSession(sessionFor(owner));
    const fake = renderDashboard();
    expect(
      screen.getByRole("heading", { name: "You don’t have access" }),
    ).toBeInTheDocument();
    expect(fake.calls).toEqual([]);
  });
});
