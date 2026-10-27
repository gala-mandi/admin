import type { Metadata } from "next";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { pageTitle, panelText } from "@/features/panel/text";
import { ShopsList } from "@/features/tenants/components/shops-list";

export const metadata: Metadata = {
  title: pageTitle(panelText.sections.shops.label),
};

export default function ShopsPage() {
  return (
    <RequirePermission permission="shops:manage">
      <ShopsList />
    </RequirePermission>
  );
}
