import type { Metadata } from "next";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { pageTitle } from "@/features/panel/text";
import { EditShop } from "@/features/tenants/components/edit-shop-form";
import { shopPagesText } from "@/features/tenants/text";

export const metadata: Metadata = { title: pageTitle(shopPagesText.editTitle) };

export default async function EditShopPage({
  params,
}: PageProps<"/shops/[id]/edit">) {
  const { id } = await params;
  return (
    <RequirePermission permission="shops:manage">
      <EditShop id={id} />
    </RequirePermission>
  );
}
