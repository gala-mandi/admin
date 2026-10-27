import type { Metadata } from "next";
import { SectionPlaceholder } from "@/features/panel/components/section-placeholder";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.auditLogs.label),
};

/** Placeholder until the AuditLogs ticket builds this screen. */
export default function AuditLogsPage() {
  return <SectionPlaceholder section="auditLogs" />;
}
