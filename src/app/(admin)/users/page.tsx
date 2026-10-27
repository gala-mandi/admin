import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.users.label),
};

/** Placeholder until the Users ticket builds this screen. */
export default function UsersPage() {
  return <SectionPlaceholder section="users" />;
}
