import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { makeQueryClient } from "@/lib/query-client";
import { useSessionStore } from "@/stores/session";
import {
  fakeAdapter,
  httpError,
  ok,
  sessionFor,
  superAdmin,
} from "@/test/fake-api";
import { tenantList, tenantSummary } from "../test-data";
import { ShopsList } from "./shops-list";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const defaultAdapter = api.defaults.adapter;

type Handler = (
  config: InternalAxiosRequestConfig,
) => ReturnType<typeof ok> | Error;

function renderList(searchParams = "", handler?: Handler) {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const fake = fakeAdapter(async (config) => {
    const reply = handler
      ? handler(config)
      : ok(config, tenantList([tenantSummary()]));
    if (reply instanceof Error) throw reply;
    return reply;
  });
  api.defaults.adapter = fake.adapter;
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NuqsTestingAdapter>
    );
  }
  render(<ShopsList />, { wrapper: Wrapper });
  return { onUrlUpdate, fake, requests: () => fake.calls.map((c) => c.url) };
}

/** Query params the table sent to `GET /admin/tenants` (not the counts). */
const sentParams: Record<string, unknown>[] = [];

/** The status cards ask for `limit: 1` and read `meta.total`. */
const isCount = (config: InternalAxiosRequestConfig) =>
  (config.params as { limit?: number } | undefined)?.limit === 1;

function recordParams(config: InternalAxiosRequestConfig) {
  if (isCount(config)) return;
  sentParams.push({ ...(config.params as Record<string, unknown>) });
}

type CountStatus = "all" | "trial" | "active" | "suspended" | "cancelled";

/** Answers the count requests with these totals, the rest with one shop. */
function countsHandler(
  totals: Record<CountStatus, number>,
  list: Handler = (config) => ok(config, tenantList([tenantSummary()])),
): Handler {
  return (config) => {
    if (!isCount(config)) return list(config);
    const status = (config.params as { status?: CountStatus }).status ?? "all";
    return ok(config, tenantList([], { limit: 1, total: totals[status] }));
  };
}

const card = (name: string) =>
  within(
    screen.getByRole("group", { name: "Filter shops by status" }),
  ).getByRole("button", { name: new RegExp(`^${name}`) });

const lastUrl = (spy: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  spy.mock.calls.at(-1)?.[0].queryString;

describe("ShopsList", { timeout: 15_000 }, () => {
  beforeEach(() => {
    push.mockReset();
    sentParams.length = 0;
    useSessionStore.getState().setSession(sessionFor(superAdmin));
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("lists shops with avatar, slug, owner and phone, city, status, users and the Karachi date", async () => {
    renderList();

    const table = await screen.findByRole("table", { name: "Shops" });
    const link = await within(table).findByRole("link", {
      name: "Al-Madina Traders",
    });
    expect(link).toHaveAttribute("href", "/shops/t1");
    const row = link.closest("tr")!;
    const cells = within(row).getAllByRole("cell");

    const avatar = cells[0]!.querySelector('[data-slot="shop-avatar"]');
    expect(avatar).toHaveTextContent("AT");
    expect(avatar).toHaveAttribute("aria-hidden", "true");
    expect(cells[0]).toHaveTextContent("al-madina-traders");

    // The shop phone sits under the owner; there is no Phone column.
    expect(cells[1]).toHaveTextContent("Haji Aslam");
    expect(cells[1]).toHaveTextContent("Shop phone: 03001234567");
    expect(within(row).getByText("03001234567")).toHaveAttribute("dir", "ltr");
    expect(
      within(table).queryByRole("columnheader", { name: "Phone" }),
    ).toBeNull();

    expect(cells[2]).toHaveTextContent("Okara");
    expect(cells[3]).toHaveTextContent("Active");
    // Plan, its state today and the days left.
    expect(cells[4]).toHaveTextContent("BasicActive25 days left");
    expect(cells[5]).toHaveTextContent("3");
    expect(cells[6]).toHaveTextContent("27 Oct 2026");
    expect(cells[6]!.querySelector("time")).toHaveAttribute(
      "dateTime",
      "2026-10-26T20:30:00Z",
    );
    // Phones show shop, status and actions; Owner from `md`, the rest from `lg`.
    expect(cells[1]).toHaveClass("hidden", "md:table-cell");
    expect(cells[4]).toHaveClass("hidden", "md:table-cell");
    for (const i of [2, 5, 6]) {
      expect(cells[i]).toHaveClass("hidden", "lg:table-cell");
    }
    expect(cells[0]).not.toHaveClass("hidden");
    expect(cells[3]).not.toHaveClass("hidden");
    expect(screen.getByRole("link", { name: "New shop" })).toHaveAttribute(
      "href",
      "/shops/new",
    );
  });

  it("shows a dash for a shop without a city", async () => {
    renderList("", (config) =>
      ok(config, tenantList([tenantSummary({ city: null })])),
    );

    const link = await screen.findByRole("link", { name: "Al-Madina Traders" });
    const cells = within(link.closest("tr")!).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent(/^—$/);
    expect(screen.queryByText("No city")).toBeNull();
  });

  it("gives the same shop the same avatar colour", async () => {
    renderList("", (config) =>
      ok(
        config,
        tenantList([
          tenantSummary(),
          tenantSummary({ id: "t2", name: "Bismillah Grain Co" }),
        ]),
      ),
    );

    await screen.findByText("Bismillah Grain Co");
    const avatars = document.querySelectorAll('[data-slot="shop-avatar"]');
    expect(avatars[1]).toHaveTextContent("BC");
    const tone = avatars[0]!.getAttribute("data-tone");
    expect(tone).toMatch(/^[1-6]$/);
    cleanup();
    renderList();
    await screen.findByText("Al-Madina Traders");
    expect(document.querySelector('[data-slot="shop-avatar"]')).toHaveAttribute(
      "data-tone",
      tone,
    );
  });

  it("row menu links to the shop's details and edit pages", async () => {
    renderList();

    const trigger = await screen.findByRole("button", {
      name: "Actions for Al-Madina Traders",
    });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(
      await screen.findByRole("menuitem", { name: "View details" }),
    ).toHaveAttribute("href", "/shops/t1");
    expect(screen.getByRole("menuitem", { name: "Edit shop" })).toHaveAttribute(
      "href",
      "/shops/t1/edit",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("status cards show platform-wide counts, ignoring the search", async () => {
    renderList(
      "?q=okara",
      countsHandler(
        { all: 40, active: 24, trial: 10, suspended: 5, cancelled: 1 },
        (config) => ok(config, tenantList([tenantSummary()])),
      ),
    );

    await waitFor(() => expect(card("Active")).toHaveTextContent("24"));
    expect(card("All shops")).toHaveTextContent("40");
    expect(card("All shops")).toHaveTextContent("Across the platform");
    expect(card("Active")).toHaveTextContent("60% of all shops");
    expect(card("Trial")).toHaveTextContent("10");
    expect(card("Trial")).toHaveTextContent("25% of all shops");
    expect(card("Suspended")).toHaveTextContent("5");
    expect(card("Cancelled")).toHaveTextContent("1");
    expect(card("Cancelled")).toHaveTextContent("3% of all shops");
    expect(card("All shops")).toHaveAttribute("aria-pressed", "true");
    expect(card("Active")).toHaveAttribute("aria-pressed", "false");
  });

  it("the count requests never carry the search", async () => {
    const counts: Record<string, unknown>[] = [];
    renderList("?q=okara", (config) => {
      if (isCount(config)) {
        counts.push({ ...(config.params as Record<string, unknown>) });
      }
      return ok(config, tenantList([tenantSummary()]));
    });

    await screen.findByText("Al-Madina Traders");
    await waitFor(() => expect(counts).toHaveLength(5));
    expect(counts).toEqual(
      expect.arrayContaining([
        { page: 1, limit: 1 },
        { page: 1, limit: 1, status: "active" },
        { page: 1, limit: 1, status: "trial" },
        { page: 1, limit: 1, status: "suspended" },
        { page: 1, limit: 1, status: "cancelled" },
      ]),
    );
  });

  it("shows skeletons while the counts load", async () => {
    renderList("", (config) =>
      isCount(config)
        ? (new Promise(() => {}) as unknown as ReturnType<typeof ok>)
        : ok(config, tenantList([tenantSummary()])),
    );

    await screen.findByText("Al-Madina Traders");
    expect(screen.getAllByTestId("status-count-skeleton")).toHaveLength(5);
    expect(card("Active")).toHaveTextContent("Loading count…");
  });

  it("shows a dash when a count can't load", async () => {
    renderList("", (config) =>
      isCount(config)
        ? httpError(config, 500)
        : ok(config, tenantList([tenantSummary()])),
    );

    // The counts retry a server error once before giving up.
    await waitFor(
      () => expect(card("Active")).toHaveTextContent("Count unavailable"),
      { timeout: 4000 },
    );
    expect(card("Active")).toHaveTextContent("—");
    expect(screen.queryByTestId("status-count-skeleton")).toBeNull();
    // The table itself is fine.
    expect(screen.getByText("Al-Madina Traders")).toBeInTheDocument();
  });

  it("sends the URL state to the server", async () => {
    renderList("?q=okara&status=suspended&page=2&sort=name", (config) => {
      recordParams(config);
      return ok(config, tenantList([tenantSummary()], { total: 30, page: 2 }));
    });

    await screen.findByText("Al-Madina Traders");
    expect(sentParams[0]).toEqual({
      page: 2,
      limit: 20,
      search: "okara",
      status: "suspended",
      sort: "name",
    });
    expect(screen.getByLabelText("Search shops")).toHaveValue("okara");
    expect(card("Suspended")).toHaveAttribute("aria-pressed", "true");
    expect(card("All shops")).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("combobox", { name: "Status" })).toBeNull();
  });

  it("puts the debounced search in the URL and goes back to page 1", async () => {
    const { onUrlUpdate } = renderList("?page=3", (config) => {
      recordParams(config);
      return ok(config, tenantList([tenantSummary()], { total: 60 }));
    });
    await screen.findByText("Al-Madina Traders");

    fireEvent.change(screen.getByLabelText("Search shops"), {
      target: { value: "  Aslam " },
    });
    // Not on every key stroke.
    expect(onUrlUpdate).not.toHaveBeenCalled();

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?q=Aslam"));
    await waitFor(() =>
      expect(sentParams.at(-1)).toMatchObject({ page: 1, search: "Aslam" }),
    );
  });

  it("a status card puts the status filter in the URL", async () => {
    const { onUrlUpdate } = renderList("?q=okara&page=2", (config) => {
      recordParams(config);
      return ok(config, tenantList([tenantSummary()], { total: 30 }));
    });
    await screen.findByText("Al-Madina Traders");

    fireEvent.click(card("Suspended"));

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?q=okara&status=suspended"),
    );
    await waitFor(() =>
      expect(sentParams.at(-1)).toMatchObject({
        page: 1,
        search: "okara",
        status: "suspended",
      }),
    );
    expect(card("Suspended")).toHaveAttribute("aria-pressed", "true");
  });

  it("picking the selected card again, or All shops, clears the status", async () => {
    const { onUrlUpdate } = renderList("?status=active&sort=name");
    await screen.findByText("Al-Madina Traders");
    expect(card("Active")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(card("Active"));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?sort=name"));
    expect(card("All shops")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(card("Trial"));
    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?sort=name&status=trial"),
    );
    fireEvent.click(card("All shops"));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?sort=name"));
  });

  it("sorting and paging update the URL", async () => {
    const { onUrlUpdate } = renderList("", (config) =>
      ok(config, tenantList([tenantSummary()], { total: 45 })),
    );
    await screen.findByText("Al-Madina Traders");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?page=2"));

    fireEvent.click(screen.getByRole("button", { name: /^Shop/ }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?sort=name"));
  });

  it("has column and Excel export buttons, and Clear filters when filtered", async () => {
    const { onUrlUpdate } = renderList("?status=active&sort=name");
    await screen.findByText("Al-Madina Traders");

    expect(screen.getByRole("button", { name: "Columns" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Export to Excel" }),
    ).toBeEnabled();
    expect(screen.getByTestId("shops-result-count")).toHaveTextContent(
      "1 shop",
    );
    // The toolbar sits inside the table card.
    const toolbar = screen
      .getByRole("search")
      .closest('[data-slot="data-table-toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.parentElement).toContainElement(
      screen.getByRole("table", { name: "Shops" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe("?sort=name"));
  });

  it("row click opens the shop", async () => {
    renderList();
    fireEvent.click(await screen.findByText("Haji Aslam"));

    expect(push).toHaveBeenCalledWith("/shops/t1");
  });

  it("explains an empty platform and links to New shop", async () => {
    renderList("", (config) => ok(config, tenantList([])));

    expect(await screen.findByText("No shops yet")).toBeInTheDocument();
  });

  it("offers to clear filters when nothing matches", async () => {
    const { onUrlUpdate } = renderList("?q=zzz&status=trial", (config) =>
      ok(config, tenantList([])),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Clear search and filters" }),
    );
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe(""));
    expect(screen.getByLabelText("Search shops")).toHaveValue("");
  });

  it("shows an error with retry", async () => {
    let fail = true;
    renderList("", (config) =>
      fail ? httpError(config, 500) : ok(config, tenantList([tenantSummary()])),
    );

    // The list retries a server error once before showing it.
    expect(
      await screen.findByRole("alert", {}, { timeout: 4000 }),
    ).toHaveTextContent("Couldn’t load this list");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Al-Madina Traders")).toBeInTheDocument();
  });

  it("shows 403 when the server refuses", async () => {
    renderList("", (config) => httpError(config, 403));

    expect(await screen.findByText("403")).toBeInTheDocument();
  });

  describe("chart view", () => {
    it("charts every shop matching the search and status, with the view in the URL", async () => {
      const shops = [
        tenantSummary(),
        tenantSummary({ id: "t2", name: "B", status: "trial" }),
        tenantSummary({ id: "t3", name: "C", status: "active" }),
      ];
      const { onUrlUpdate } = renderList("?q=okara&status=active", (config) => {
        recordParams(config);
        return ok(config, tenantList(shops, { limit: 100 }));
      });
      await screen.findByRole("table", { name: "Shops" });
      expect(sentParams.some((p) => p.limit === 100)).toBe(false);

      fireEvent.click(
        within(screen.getByRole("group", { name: "View as" })).getByRole(
          "button",
          { name: "Chart" },
        ),
      );

      const chart = await screen.findByTestId("data-table-chart");
      expect(lastUrl(onUrlUpdate)).toContain("view=chart");
      await waitFor(() =>
        expect(sentParams).toContainEqual({
          page: 1,
          limit: 100,
          search: "okara",
          status: "active",
        }),
      );
      // Grouped by status by default, in the status cards' order.
      await waitFor(() =>
        expect(chart).toHaveAccessibleName(
          "Shops by status. Bar chart. 2 items. Highest: Active, 2. Lowest: Trial, 1. Total: 3.",
        ),
      );
      expect(screen.queryByRole("table", { name: "Shops" })).toBeNull();
      expect(
        screen.getByText("Charting all 3 matching rows."),
      ).toBeInTheDocument();
    });

    it("opens on the chart from ?view=chart", async () => {
      renderList("?view=chart");
      expect(await screen.findByTestId("data-table-chart")).toBeInTheDocument();
    });
  });
});
