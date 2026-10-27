import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.shops.label),
};

/** Placeholder until the Shops ticket builds this screen. */
export default function ShopsPage() {
  return <SectionPlaceholder section="shops" />;
}
