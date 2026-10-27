import type { Metadata } from "next";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { pageTitle } from "@/features/panel/text";
import { ShopDetail } from "@/features/tenants/components/shop-detail";
import { shopPagesText } from "@/features/tenants/text";

export const metadata: Metadata = {
  title: pageTitle(shopPagesText.detailCrumb),
};

export default async function ShopPage({ params }: PageProps<"/shops/[id]">) {
  const { id } = await params;
  return (
    <RequirePermission permission="shops:manage">
      <ShopDetail id={id} />
    </RequirePermission>
  );
}
