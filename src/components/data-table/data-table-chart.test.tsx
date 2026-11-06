import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { liveCharts, seriesTypes } from "@/test/echarts-mock";
import { TestProviders } from "@/test/render-panel";
import { type DataTableColumn, dataTableColumnHelper } from "./columns";
import { DataTable, type DataTableProps } from "./data-table";

interface Shop {
  id: string;
  name: string;
  city: string;
  users: number;
}

const col = dataTableColumnHelper<Shop>();
const columns: DataTableColumn<Shop>[] = col.columns([
  col.accessor("name", { header: "Name", meta: { label: "Name" } }),
  col.accessor("city", {
    header: "City",
    meta: { label: "City", chart: { group: "category" } },
  }),
  col.accessor("users", {
    header: "Users",
    meta: { label: "Users", chart: { measure: true } },
  }),
]);

const plainColumns: DataTableColumn<Shop>[] = col.columns([
  col.accessor("name", { header: "Name", meta: { label: "Name" } }),
]);

const page: Shop[] = [
  { id: "a", name: "Al-Madina", city: "Okara", users: 3 },
  { id: "b", name: "Bismillah", city: "Okara", users: 5 },
  { id: "c", name: "Chak 5", city: "Sahiwal", users: 1 },
];

function renderTable(props: Partial<DataTableProps<Shop>> = {}) {
  return render(
    <TestProviders>
      <DataTable<Shop>
        caption="Shops"
        columns={columns}
        data={page}
        getRowId={(row) => row.id}
        rowCount={3}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={() => {}}
        isLoading={false}
        isError={false}
        {...props}
      />
    </TestProviders>,
  );
}

const toggle = () => screen.getByRole("group", { name: "View as" });

async function showChart() {
  fireEvent.click(within(toggle()).getByRole("button", { name: "Chart" }));
  return screen.findByTestId("data-table-chart");
}

async function choose(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), {
    key: "Enter",
  });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("DataTable chart view", () => {
  beforeEach(() => {
    // Radix Select in jsdom.
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });

  it("has a Table | Chart toggle when a column can group", () => {
    renderTable();
    const buttons = within(toggle()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Table", "Chart"]);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("has no toggle without chart meta, or with chartView false", () => {
    const { unmount } = renderTable({ columns: plainColumns });
    expect(screen.queryByRole("group", { name: "View as" })).toBeNull();
    unmount();
    renderTable({ chartView: false });
    expect(screen.queryByRole("group", { name: "View as" })).toBeNull();
  });

  it("swaps the table for a chart of the current rows, and back", async () => {
    const onViewChange = vi.fn();
    renderTable({ onViewChange });

    const chart = await showChart();
    expect(onViewChange).toHaveBeenCalledWith("chart");
    expect(screen.queryByRole("table", { name: "Shops" })).toBeNull();
    expect(chart).toHaveAttribute("data-chart-type", "bar");
    expect(chart).toHaveAccessibleName(/Highest: Okara, 2/);
    expect(
      screen.getByRole("heading", { name: "Number of rows by city" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Charting all 3 matching rows."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(seriesTypes(liveCharts().at(-1))).toEqual(["bar"]),
    );

    fireEvent.click(within(toggle()).getByRole("button", { name: "Table" }));
    expect(screen.getByRole("table", { name: "Shops" })).toBeInTheDocument();
    expect(screen.queryByTestId("data-table-chart")).toBeNull();
  });

  it("charts the total of a number column with the Measure select", async () => {
    renderTable();
    await showChart();
    await choose("Measure", "Total users");

    const chart = screen.getByTestId("data-table-chart");
    expect(chart).toHaveAccessibleName(
      /Highest: Okara, 8\. Lowest: Sahiwal, 1/,
    );
    expect(
      screen.getByRole("heading", { name: "Total users by city" }),
    ).toBeInTheDocument();
  });

  it("charts the rows it is given (every filtered row), not only the page", async () => {
    renderTable({
      rowCount: 40,
      chartView: {
        rows: [...page, { id: "d", name: "D", city: "Multan", users: 2 }],
        total: 40,
        countLabel: "Shops",
      },
    });
    const chart = await showChart();
    // Okara, Sahiwal, Multan.
    expect(chart).toHaveAccessibleName(/3 items/);
    expect(
      screen.getByText("Charting the first 4 of 40 matching rows."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Shops by city" }),
    ).toBeVisible();
    // The chart covers more than the page: no pager.
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
  });

  it("keeps the pager when it charts only the loaded page", async () => {
    renderTable({ rowCount: 40 });
    await showChart();
    expect(
      screen.getByText(
        "Charting the 3 rows on this page, of 40. Change page to chart others.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Pages" }),
    ).toBeInTheDocument();
  });

  it("shows the chart's empty state for no rows", async () => {
    renderTable({ data: [], rowCount: 0 });
    fireEvent.click(within(toggle()).getByRole("button", { name: "Chart" }));
    expect(
      await screen.findByText("Nothing to chart for these filters."),
    ).toBeInTheDocument();
  });

  it("follows a controlled view", async () => {
    renderTable({ view: "chart" });
    expect(await screen.findByTestId("data-table-chart")).toBeInTheDocument();
  });
});
