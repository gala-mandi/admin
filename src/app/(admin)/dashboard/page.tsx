import type { Metadata } from "next";
import { pageTitle, panelText } from "@/features/panel/text";
import { PlatformDashboard } from "@/features/stats/components/platform-dashboard";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.dashboard.label),
};

export default function DashboardPage() {
  return <PlatformDashboard />;
}
