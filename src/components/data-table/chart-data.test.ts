import { describe, expect, it } from "vitest";
import { type DataTableColumn, getChartColumns } from "./columns";
import {
  type GroupOption,
  groupOptions,
  groupRows,
  type MeasureOption,
  measureOptions,
} from "./chart-data";

interface Row {
  id: string;
  city: string | null;
  status: string;
  users: number | null;
  createdAt: string;
}

const columns: DataTableColumn<Row>[] = [
  { accessorKey: "id", meta: { label: "Id" } },
  {
    accessorKey: "city",
    meta: { label: "City", chart: { group: "category" } },
  },
  {
    accessorKey: "status",
    meta: {
      label: "Status",
      chart: {
        group: "category",
        groupLabel: (k) => k.toUpperCase(),
        order: ["active", "trial", "suspended"],
        colors: { active: "--success" },
      },
    },
  },
  { accessorKey: "users", meta: { label: "Users", chart: { measure: true } } },
  {
    accessorKey: "createdAt",
    meta: { label: "Created", chart: { group: "date" } },
  },
  // No label: never offered, whatever its meta says.
  { accessorKey: "hidden", meta: { chart: { group: "category" } } },
];

const rows: Row[] = [
  {
    id: "1",
    city: "Okara",
    status: "active",
    users: 3,
    createdAt: "2026-09-10T08:00:00Z",
  },
  {
    id: "2",
    city: "Okara",
    status: "trial",
    users: 4,
    createdAt: "2026-09-30T20:00:00Z",
  },
  {
    id: "3",
    city: "Sahiwal",
    status: "active",
    users: null,
    createdAt: "2026-11-02T08:00:00Z",
  },
  {
    id: "4",
    city: null,
    status: "active",
    users: 2,
    createdAt: "2026-11-03T08:00:00Z",
  },
  {
    id: "5",
    city: "  ",
    status: "suspended",
    users: 1,
    createdAt: "not a date",
  },
];

const { groups, measures } = getChartColumns(columns);
const groupList = groupOptions(groups);
const measureList = measureOptions(measures, "Shops");
const group = (id: string) =>
  groupList.find((g) => g.id === id) as GroupOption<Row>;
const measure = (id: string) =>
  measureList.find((m) => m.id === id) as MeasureOption<Row>;

describe("chart columns from meta", () => {
  it("offers labelled category and date columns to group by", () => {
    expect(groupList.map((g) => [g.id, g.label])).toEqual([
      ["city", "City"],
      ["status", "Status"],
      ["createdAt:month", "Created (by month)"],
      ["createdAt:day", "Created (by day)"],
    ]);
  });

  it("offers count, total and average of number columns as measures", () => {
    expect(measureList.map((m) => [m.id, m.label])).toEqual([
      ["count", "Shops"],
      ["sum:users", "Total users"],
      ["avg:users", "Average users"],
    ]);
  });

  it("has no chart columns for a table without chart meta", () => {
    const plain = getChartColumns<Row>([
      { accessorKey: "city", meta: { label: "City" } },
    ]);
    expect(plain).toEqual({ groups: [], measures: [] });
  });
});

describe("groupRows", () => {
  it("counts rows per group, biggest first, with blanks as Not set", () => {
    const data = groupRows(rows, group("city"), measure("count"));
    expect(data.shape).toBe("categorical");
    expect(data.categories.map((c) => c.label)).toEqual([
      "Not set",
      "Okara",
      "Sahiwal",
    ]);
    expect(data.series[0]!.values).toEqual([2, 2, 1]);
    expect(data.series[0]!.name).toBe("Shops");
  });

  it("sums a number column and skips rows without a number", () => {
    const data = groupRows(rows, group("city"), measure("sum:users"));
    const byLabel = Object.fromEntries(
      data.categories.map((c, i) => [c.label, data.series[0]!.values[i]]),
    );
    expect(byLabel).toEqual({ Okara: 7, "Not set": 3, Sahiwal: 0 });
  });

  it("averages over the rows that have a number, to 2 decimals", () => {
    const three = [...rows, { ...rows[0]!, id: "6", users: 4 }];
    const data = groupRows(three, group("status"), measure("avg:users"));
    // active: 3, null, 2, 4 → (3 + 2 + 4) / 3 = 3
    expect(data.series[0]!.values[0]).toBe(3);
    const odd = groupRows(
      [
        { ...rows[0]!, users: 1 },
        { ...rows[0]!, users: 1 },
        { ...rows[0]!, users: 2 },
      ],
      group("status"),
      measure("avg:users"),
    );
    expect(odd.series[0]!.values).toEqual([1.33]);
  });

  it("keeps a column's fixed order, labels and colours", () => {
    const data = groupRows(rows, group("status"), measure("count"));
    expect(data.categories.map((c) => c.label)).toEqual([
      "ACTIVE",
      "TRIAL",
      "SUSPENDED",
    ]);
    expect(data.categories[0]!.colorVar).toBe("--success");
    expect(data.series[0]!.values).toEqual([3, 1, 1]);
  });

  it("buckets dates by Karachi month and fills the months between", () => {
    const data = groupRows(rows, group("createdAt:month"), measure("count"));
    expect(data.shape).toBe("timeSeries");
    // 30 Sep 20:00 UTC is 1 Oct in Karachi.
    expect(data.categories.map((c) => c.key)).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    // en-PK month names, as in the rest of the panel.
    expect(data.categories.map((c) => c.label)).toEqual([
      "Sept 26",
      "Oct 26",
      "Nov 26",
    ]);
    // The invalid date is left out.
    expect(data.series[0]!.values).toEqual([1, 1, 2]);
  });

  it("buckets dates by day with empty days as 0", () => {
    const data = groupRows(
      rows.slice(2, 4),
      group("createdAt:day"),
      measure("sum:users"),
    );
    expect(data.categories.map((c) => c.key)).toEqual([
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(data.series[0]!.values).toEqual([0, 2]);
  });

  it("folds more than 12 groups into Other", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      ...rows[0]!,
      id: String(i),
      city: `City ${String(i).padStart(2, "0")}`,
    }));
    const data = groupRows(many, group("city"), measure("count"));
    expect(data.categories).toHaveLength(12);
    expect(data.categories.at(-1)!.label).toBe("Other (4)");
    expect(data.series[0]!.values.at(-1)).toBe(4);
  });

  it("gives empty data for no rows", () => {
    expect(groupRows([], group("city"), measure("count")).categories).toEqual(
      [],
    );
    expect(
      groupRows([], group("createdAt:day"), measure("count")).categories,
    ).toEqual([]);
  });
});
