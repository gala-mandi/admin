import type { Metadata } from "next";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { pageTitle, panelText } from "@/features/panel/text";
import { PlansList } from "@/features/plans/components/plans-list";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.plans.label),
};

export default function PlansPage() {
  return (
    <RequirePermission permission="plans:manage">
      <PlansList />
    </RequirePermission>
  );
}
