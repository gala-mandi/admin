"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { NEW_SHOPS_MONTHS, useNewShops } from "../hooks";
import { statsText } from "../text";

const t = statsText.newShops;

/** "Nov 26": a calendar month, so formatted in UTC (no zone shift). */
const monthFormat = new Intl.DateTimeFormat("en-PK", {
  timeZone: "UTC",
  month: "short",
  year: "2-digit",
});
export const monthLabel = (month: string) =>
  monthFormat.format(new Date(`${month}-01T00:00:00Z`));

/** Bar per Asia/Karachi month: how many shops were added. */
export function NewShopsChart() {
  const query = useNewShops(NEW_SHOPS_MONTHS);
  const months = query.data?.data ?? [];
  const hasShops = months.some((m) => m.count > 0);

  return (
    <section
      aria-labelledby="new-shops-title"
      className="bg-card text-card-foreground rounded-card shadow-panel flex min-w-0 flex-col gap-4 border p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="new-shops-title" className="font-heading text-base font-bold">
          {t.title}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t.description(NEW_SHOPS_MONTHS)}
        </p>
      </div>

      {query.isPending ? (
        <div role="status">
          <span className="sr-only">{statsText.loading}</span>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-8">
          <p className="text-destructive text-sm">{t.error}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            {statsText.retry}
          </Button>
        </div>
      ) : !hasShops ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t.empty(NEW_SHOPS_MONTHS)}
        </p>
      ) : (
        <>
          <div
            aria-hidden
            className="h-64 w-full"
            dir="ltr"
            data-testid="new-shops-chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={months}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={8}
                />
                <YAxis
                  width={32}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  labelFormatter={(month) => monthLabel(String(month))}
                  formatter={(value) => [t.tooltip(Number(value)), null]}
                  contentStyle={{
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* The same numbers for screen readers. */}
          <table className="sr-only">
            <caption>{t.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.month}</th>
                <th scope="col">{t.shops}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{monthLabel(m.month)}</th>
                  <td>{formatCount(m.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
