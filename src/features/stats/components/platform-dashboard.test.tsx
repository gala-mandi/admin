import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
import { tenantList, tenantSummary } from "@/features/tenants/test-data";
import { liveCharts, seriesTypes } from "@/test/echarts-mock";
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
    "summary" | "new-shops" | "activity" | "inactive-shops" | "tenants",
    (config: InternalAxiosRequestConfig) => ReturnType<typeof ok> | Error
  >
>;

const defaults: Required<Replies> = {
  summary: (c) => ok(c, platformStats()),
  "new-shops": (c) => ok(c, newShops()),
  activity: (c) => ok(c, activityFeed([activityItem()])),
  "inactive-shops": (c) => ok(c, inactivePage([inactiveShop()])),
  tenants: (c) =>
    ok(
      c,
      tenantList(
        [
          tenantSummary(),
          tenantSummary({ id: "t2", name: "Bismillah Grain", city: "Sahiwal" }),
          tenantSummary({ id: "t3", name: "Chak 5 Arhat", userCount: 7 }),
        ],
        { limit: 100 },
      ),
    ),
};

function renderDashboard(replies: Replies = {}) {
  const fake = fakeAdapter(async (config) => {
    const key = (
      config.url?.startsWith("/admin/tenants")
        ? "tenants"
        : config.url?.replace(/^\/admin\/stats\/?/, "") || "summary"
    ) as keyof Replies;
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
      "/admin/tenants",
    ]);
  });

  it("asks for the last 100 changes once, for the feed and the activity charts", async () => {
    const asked: unknown[] = [];
    let tenantsAsked: unknown;
    const fake = renderDashboard({
      activity: (c) => {
        asked.push(c.params);
        return defaults.activity(c);
      },
      tenants: (c) => {
        tenantsAsked = c.params;
        return defaults.tenants(c);
      },
    });
    await screen.findByRole("list", { name: "Recent activity" });
    await waitFor(() => expect(tenantsAsked).toBeDefined());
    expect(
      fake.calls.filter((c) => c.url === "/admin/stats/activity"),
    ).toHaveLength(1);
    expect(asked).toEqual([{ limit: 100 }]);
    expect(tenantsAsked).toEqual({ page: 1, limit: 100 });
  });

  describe("analytics charts", () => {
    it("draws every chart with its default type", async () => {
      renderDashboard();

      const expected: Record<string, string> = {
        "new-shops-chart": "area",
        "shops-by-status-chart": "donut",
        "shops-by-city-chart": "horizontalBar",
        "users-per-shop-chart": "horizontalBar",
        // One kind of action: nothing to stack, so the first time-series type.
        "activity-by-day-chart": "line",
        "activity-by-action-chart": "bar",
      };
      for (const [testId, type] of Object.entries(expected)) {
        expect(await screen.findByTestId(testId)).toHaveAttribute(
          "data-chart-type",
          type,
        );
      }
      await waitFor(() => expect(liveCharts()).toHaveLength(6));
    });

    it("stacks the activity per day by action", async () => {
      renderDashboard({
        activity: (c) =>
          ok(
            c,
            activityFeed([
              activityItem({ id: 1, action: "create" }),
              activityItem({ id: 2, action: "update" }),
              activityItem({ id: 3, action: "update" }),
            ]),
          ),
      });
      const chart = await screen.findByTestId("activity-by-day-chart");
      expect(chart).toHaveAttribute("data-chart-type", "stackedArea");
      const legend = within(chart.closest("section")!).getByRole("list", {
        name: "Show or hide",
      });
      expect(
        within(legend)
          .getAllByRole("button")
          .map((b) => b.textContent),
      ).toEqual(["Updated", "Created"]);
    });

    it("counts shops by city and users per shop from every shop", async () => {
      renderDashboard();
      const city = await screen.findByTestId("shops-by-city-chart");
      expect(city).toHaveAccessibleName(/Highest: Okara, 2/);
      const cityTable = screen.getByRole("table", { name: "Shops by city" });
      expect(within(cityTable).getAllByRole("row")).toHaveLength(3);

      const users = screen.getByTestId("users-per-shop-chart");
      expect(users).toHaveAccessibleName(/Highest: Chak 5 Arhat, 7/);
      expect(screen.getAllByText("Based on all 3 shops.")).toHaveLength(2);
    });

    it("switches a chart's type from its menu and draws the new type", async () => {
      renderDashboard();
      const status = await screen.findByTestId("shops-by-status-chart");
      await waitFor(() => expect(liveCharts().length).toBeGreaterThan(0));

      fireEvent.pointerDown(
        screen.getByRole("button", { name: "Chart type: Donut" }),
        { button: 0, ctrlKey: false },
      );
      fireEvent.click(
        await screen.findByRole("menuitemradio", { name: "Bar" }),
      );

      await waitFor(() =>
        expect(status).toHaveAttribute("data-chart-type", "bar"),
      );
      const drawn = liveCharts().find((c) => status.contains(c.element));
      await waitFor(() => expect(seriesTypes(drawn)).toEqual(["bar"]));
    });
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
