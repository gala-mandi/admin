import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { liveCharts, seriesTypes } from "@/test/echarts-mock";
import { TestProviders } from "@/test/render-panel";
import { ChartCard, type ChartCardProps, chartFileName } from "./chart-card";
import { chartTypeStorageKey } from "./storage";
import type { ChartData } from "./types";

const cities: ChartData = {
  shape: "categorical",
  categories: [
    { key: "okara", label: "Okara" },
    { key: "sahiwal", label: "Sahiwal" },
    { key: "multan", label: "Multan" },
  ],
  series: [{ key: "v", name: "Shops", values: [5, 3, 1] }],
};

const activity: ChartData = {
  shape: "timeSeries",
  categories: [
    { key: "2026-11-05", label: "5 Nov" },
    { key: "2026-11-06", label: "6 Nov" },
  ],
  series: [
    { key: "create", name: "Created", values: [1, 2] },
    { key: "update", name: "Updated", values: [4, 0] },
  ],
};

function renderCard(props: Partial<ChartCardProps> = {}) {
  return render(
    <TestProviders>
      <ChartCard
        id="test-chart"
        title="Shops by city"
        data={cities}
        testId="the-chart"
        {...props}
      />
    </TestProviders>,
  );
}

async function openTypeMenu(name: RegExp | string = /Chart type/) {
  fireEvent.pointerDown(screen.getByRole("button", { name }), {
    button: 0,
    ctrlKey: false,
  });
  return screen.findByRole("menu");
}

const drawn = () => liveCharts().at(-1);

describe("ChartCard", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("draws the default type with a text description and a data table", async () => {
    renderCard({ defaultType: "horizontalBar" });

    const chart = screen.getByTestId("the-chart");
    expect(chart).toHaveAttribute("data-chart-type", "horizontalBar");
    expect(chart).toHaveAttribute("role", "img");
    expect(chart).toHaveAccessibleName(
      "Shops by city. Horizontal bar chart. 3 items. Highest: Okara, 5. Lowest: Multan, 1. Total: 9.",
    );
    const table = screen.getByRole("table", { name: "Shops by city" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    await waitFor(() => expect(seriesTypes(drawn())).toEqual(["bar"]));
  });

  it("offers only the types that fit the data", async () => {
    renderCard();
    const menu = await openTypeMenu();
    expect(
      within(menu)
        .getAllByRole("menuitemradio")
        .map((item) => item.textContent),
    ).toEqual([
      "Bar",
      "Horizontal bar",
      "Line",
      "Area",
      "Pie",
      "Donut",
      "Rose",
      "Treemap",
      "Funnel",
    ]);
  });

  it("offers time-series types for a time series", async () => {
    renderCard({ data: activity });
    const menu = await openTypeMenu();
    expect(
      within(menu)
        .getAllByRole("menuitemradio")
        .map((item) => item.textContent),
    ).toEqual(["Line", "Smooth line", "Area", "Stacked area", "Bar", "Step"]);
  });

  it("switches type through the menu, redraws with that builder and remembers it", async () => {
    const first = renderCard();
    await waitFor(() => expect(seriesTypes(drawn())).toEqual(["bar"]));

    await openTypeMenu("Chart type: Bar");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Treemap" }));

    expect(screen.getByTestId("the-chart")).toHaveAttribute(
      "data-chart-type",
      "treemap",
    );
    await waitFor(() => expect(seriesTypes(drawn())).toEqual(["treemap"]));
    expect(localStorage.getItem(chartTypeStorageKey("test-chart"))).toBe(
      "treemap",
    );

    first.unmount();
    renderCard();
    expect(screen.getByTestId("the-chart")).toHaveAttribute(
      "data-chart-type",
      "treemap",
    );
  });

  it("ignores a stored type that doesn't fit the data", () => {
    localStorage.setItem(chartTypeStorageKey("test-chart"), "stackedArea");
    renderCard({ defaultType: "donut" });
    expect(screen.getByTestId("the-chart")).toHaveAttribute(
      "data-chart-type",
      "donut",
    );
  });

  it("still switches when localStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderCard({ defaultType: "bar" });

    await openTypeMenu();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Pie" }));
    expect(screen.getByTestId("the-chart")).toHaveAttribute(
      "data-chart-type",
      "pie",
    );
  });

  it("shows the empty state when every value is 0", () => {
    renderCard({
      data: {
        ...cities,
        series: [{ key: "v", name: "Shops", values: [0, 0, 0] }],
      },
      emptyText: "No shops yet.",
    });
    expect(screen.getByText("No shops yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("the-chart")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download PNG" })).toBeNull();
    expect(screen.getByRole("button", { name: /Chart type/ })).toBeDisabled();
  });

  it("shows the empty state without data rows", () => {
    renderCard({ data: { ...cities, categories: [], series: [] } });
    expect(screen.getByTestId("chart-empty")).toHaveTextContent(
      "No data to chart yet.",
    );
  });

  it("shows a skeleton while loading and an error with retry", () => {
    const onRetry = vi.fn();
    const { rerender } = renderCard({ data: undefined, isLoading: true });
    expect(screen.getByRole("status")).toHaveTextContent("Loading chart…");
    expect(screen.getAllByTestId("chart-skeleton").length).toBeGreaterThan(0);

    rerender(
      <TestProviders>
        <ChartCard
          id="test-chart"
          title="Shops by city"
          data={undefined}
          isError
          onRetry={onRetry}
        />
      </TestProviders>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn’t load this chart");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the numbers on View data", () => {
    renderCard();
    expect(screen.queryByTestId("chart-data-table")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "View data" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("chart-data-table")).toHaveTextContent("Okara5");
  });

  it("hides and shows a series from the legend", async () => {
    renderCard({ data: activity });
    await waitFor(() => expect(drawn()?.options.length).toBeGreaterThan(0));
    const legend = screen.getByRole("list", { name: "Show or hide" });
    const created = within(legend).getByRole("button", { name: "Created" });

    fireEvent.click(created);
    expect(created).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => {
      const option = drawn()?.options.at(-1) as { series: { name: string }[] };
      expect(option.series.map((s) => s.name)).toEqual(["Updated"]);
    });

    fireEvent.click(within(legend).getByRole("button", { name: "Updated" }));
    expect(
      screen.getByText(
        "Everything is hidden. Turn an item back on to see the chart.",
      ),
    ).toBeInTheDocument();
  });

  it("turns the zoom bar off and on for a time series only", async () => {
    renderCard({ data: activity, defaultType: "area" });
    const zoom = screen.getByRole("button", { name: "Zoom" });
    expect(zoom).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(
        (drawn()?.options.at(-1) as { dataZoom?: unknown[] }).dataZoom,
      ).toHaveLength(2),
    );
    fireEvent.click(zoom);
    await waitFor(() =>
      expect(
        (drawn()?.options.at(-1) as { dataZoom?: unknown[] }).dataZoom,
      ).toBeUndefined(),
    );
  });

  it("has no zoom for categorical data", () => {
    renderCard();
    expect(screen.queryByRole("button", { name: "Zoom" })).toBeNull();
  });

  it("downloads the chart as a PNG", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toMatch(/^shops-\d{4}-\d{2}-\d{2}\.png$/);
        expect(this.href).toContain("data:image/png");
      });
    renderCard({ fileName: "shops" });
    await waitFor(() => expect(drawn()).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }));
    expect(click).toHaveBeenCalledOnce();
  });

  it("names the PNG by the Karachi date", () => {
    expect(chartFileName("x", new Date("2026-11-05T20:30:00Z"))).toBe(
      "x-2026-11-06.png",
    );
  });
});
