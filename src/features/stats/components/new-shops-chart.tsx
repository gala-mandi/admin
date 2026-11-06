"use client";

import { useMemo } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { calendarLabelLong } from "@/components/charts/data";
import { newShopsData } from "../chart-data";
import { NEW_SHOPS_MONTHS, useNewShops } from "../hooks";
import { statsText } from "../text";

const t = statsText.newShops;

/** Shops added per Asia/Karachi month: a gradient area with zoom. */
export function NewShopsChart({ className }: { className?: string }) {
  const query = useNewShops(NEW_SHOPS_MONTHS);
  const data = useMemo(
    () => (query.data ? newShopsData(query.data.data) : undefined),
    [query.data],
  );

  return (
    <ChartCard
      id="dashboard-new-shops"
      fileName="new-shops-per-month"
      testId="new-shops-chart"
      className={className}
      title={t.title}
      description={t.description(NEW_SHOPS_MONTHS)}
      data={data}
      defaultType="area"
      categoryLabel={t.month}
      formatCategoryLong={calendarLabelLong}
      isLoading={query.isPending}
      isError={query.isError}
      errorText={t.error}
      onRetry={() => void query.refetch()}
      emptyText={t.empty(NEW_SHOPS_MONTHS)}
    />
  );
}
