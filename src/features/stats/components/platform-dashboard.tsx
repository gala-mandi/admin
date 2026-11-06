"use client";

import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { ForbiddenState } from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";
import { toApiError } from "@/lib/api-error";
import { usePlatformStats } from "../hooks";
import { ActivityFeed } from "./activity-feed";
import { DashboardAnalytics } from "./dashboard-analytics";
import { InactiveShops } from "./inactive-shops";
import { KpiTiles } from "./kpi-tiles";
import { NewShopsChart } from "./new-shops-chart";

const section = panelText.sections.dashboard;

/**
 * Platform health for the super-admin: shop and user counts, analytics charts
 * (status, new shops, cities, users, activity), recent activity and shops
 * that have gone quiet. Counts only; no
 * shop's business amounts are shown.
 */
export function PlatformDashboard() {
  return (
    <RequirePermission permission="dashboard:view">
      <DashboardContent />
    </RequirePermission>
  );
}

function DashboardContent() {
  // Same query (and cache entry) as the tiles; only read for a 403.
  const stats = usePlatformStats();
  if (stats.isError && toApiError(stats.error).status === 403) {
    return <ForbiddenState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={section.label} description={section.description} />
      <KpiTiles />
      <DashboardAnalytics
        newShops={<NewShopsChart />}
        feed={<ActivityFeed />}
      />
      <InactiveShops />
    </div>
  );
}
