import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.plans.label),
};

/** Placeholder until the Plans ticket builds this screen. */
export default function PlansPage() {
  return <SectionPlaceholder section="plans" />;
}
