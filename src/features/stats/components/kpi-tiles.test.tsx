import { fireEvent, render, screen, within } from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { fakeAdapter, httpError, ok } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { platformStats } from "../test-data";
import { KpiTiles } from "./kpi-tiles";

const defaultAdapter = api.defaults.adapter;

type Reply = (
  config: InternalAxiosRequestConfig,
) => ReturnType<typeof ok> | Error | Promise<never>;

function renderTiles(reply: Reply) {
  const fake = fakeAdapter(async (config) => {
    const result = await reply(config);
    if (result instanceof Error) throw result;
    return result;
  });
  api.defaults.adapter = fake.adapter;
  render(
    <TestProviders>
      <KpiTiles />
    </TestProviders>,
  );
  return fake;
}

const tile = (key: string) =>
  document.querySelector<HTMLElement>(`[data-tile="${key}"]`)!;

describe("KpiTiles", () => {
  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
  });

  it("shows the five tiles in order with their counts and hints", async () => {
    const fake = renderTiles((config) => ok(config, platformStats()));

    const group = screen.getByRole("region", { name: "Platform at a glance" });
    expect(await within(group).findByText("1,240")).toBeInTheDocument();

    const terms = within(group)
      .getAllByRole("term")
      .map((dt) => dt.textContent);
    expect(terms).toEqual([
      "Total shops",
      "Active",
      "Trial",
      "Suspended",
      "Total users",
    ]);

    expect(tile("totalShops")).toHaveTextContent("1,240");
    expect(tile("totalShops")).toHaveTextContent("20 cancelled");
    expect(tile("active")).toHaveTextContent("860");
    expect(tile("active")).toHaveTextContent("69% of shops");
    expect(tile("trial")).toHaveTextContent("300");
    expect(tile("trial")).toHaveTextContent("24% of shops");
    expect(tile("suspended")).toHaveTextContent("60");
    expect(tile("suspended")).toHaveTextContent("5% of shops");
    expect(tile("totalUsers")).toHaveTextContent("5,321");
    expect(tile("totalUsers")).toHaveTextContent("4,980 active");

    expect(fake.calls.map((c) => c.url)).toEqual(["/admin/stats"]);
  });

  it("shows 0% (not NaN) on an empty platform", async () => {
    renderTiles((config) =>
      ok(
        config,
        platformStats({
          shops: { total: 0, trial: 0, active: 0, suspended: 0, cancelled: 0 },
          users: { total: 0, active: 0 },
        }),
      ),
    );

    expect(await screen.findAllByText("0% of shops")).toHaveLength(3);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(tile("totalUsers")).toHaveTextContent("0 active");
  });

  it("shows a skeleton in every tile while loading", () => {
    renderTiles(() => new Promise<never>(() => {}));

    expect(screen.getAllByTestId("kpi-skeleton")).toHaveLength(5);
    expect(screen.getAllByText("Loading…")).toHaveLength(5);
  });

  it("shows an error with a retry that loads the counts", async () => {
    let calls = 0;
    renderTiles((config) =>
      ++calls <= 2 ? httpError(config, 500) : ok(config, platformStats()),
    );

    const alert = await screen.findByRole(
      "alert",
      {},
      // The hook retries a 500 once before showing the error.
      { timeout: 4000 },
    );
    expect(alert).toHaveTextContent("Couldn’t load the platform counts");

    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1,240")).toBeInTheDocument();
  });
});
