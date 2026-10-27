import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { pageTitle } from "@/features/panel/text";
import { CreateShopForm } from "@/features/tenants/components/create-shop-form";
import { shopPagesText } from "@/features/tenants/text";

const t = shopPagesText.newShop;

export const metadata: Metadata = { title: pageTitle(t.title) };

export default function NewShopPage() {
  return (
    <RequirePermission permission="shops:manage">
      <div className="flex flex-col gap-6">
        <PageHeader title={t.title} description={t.description} />
        <CreateShopForm />
      </div>
    </RequirePermission>
  );
}
