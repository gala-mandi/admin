"use client";

import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { panelText } from "@/features/panel/text";
import { ActivityFeed } from "./activity-feed";
import { InactiveShops } from "./inactive-shops";
import { KpiTiles } from "./kpi-tiles";
import { NewShopsChart } from "./new-shops-chart";

const section = panelText.sections.dashboard;

/**
 * Platform health for the super-admin: shop and user counts, new shops per
 * month, recent activity and shops that have gone quiet. Counts only; no
 * shop's business amounts are shown.
 */
export function PlatformDashboard() {
  return (
    <RequirePermission permission="dashboard:view">
      <div className="flex flex-col gap-6">
        <PageHeader title={section.label} description={section.description} />
        <KpiTiles />
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <NewShopsChart />
          </div>
          <div className="xl:col-span-2">
            <ActivityFeed />
          </div>
        </div>
        <InactiveShops />
      </div>
    </RequirePermission>
  );
}
