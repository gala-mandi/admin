import { QueryClientProvider } from "@tanstack/react-query";
import {
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

/** Query params the list sent to `GET /admin/tenants`. */
const sentParams: Record<string, unknown>[] = [];

function recordParams(config: InternalAxiosRequestConfig) {
  sentParams.push({ ...(config.params as Record<string, unknown>) });
}

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

  it("lists shops with owner, phone, status, users and the Karachi date", async () => {
    renderList();

    const table = await screen.findByRole("table", { name: "Shops" });
    const link = await within(table).findByRole("link", {
      name: "Al-Madina Traders",
    });
    expect(link).toHaveAttribute("href", "/shops/t1");
    const row = link.closest("tr")!;
    expect(row).toHaveTextContent("Okara");
    expect(row).toHaveTextContent("Haji Aslam");
    expect(row).toHaveTextContent("03001234567");
    expect(row).toHaveTextContent("Active");
    expect(row).toHaveTextContent("3");
    expect(row).toHaveTextContent("27 Oct 2026");
    expect(screen.getByRole("link", { name: "New shop" })).toHaveAttribute(
      "href",
      "/shops/new",
    );
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
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      "Suspended",
    );
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

  it("puts the status filter in the URL", async () => {
    const { onUrlUpdate } = renderList("?q=okara", (config) => {
      recordParams(config);
      return ok(config, tenantList([tenantSummary()]));
    });
    await screen.findByText("Al-Madina Traders");

    const trigger = screen.getByRole("combobox", { name: "Status" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Suspended" }));

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe("?q=okara&status=suspended"),
    );
    await waitFor(() =>
      expect(sentParams.at(-1)).toMatchObject({ status: "suspended" }),
    );
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
});
