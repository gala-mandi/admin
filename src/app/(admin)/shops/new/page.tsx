import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/features/panel/components/require-permission";
import { pageTitle } from "@/features/panel/text";
import { CreateShopForm } from "@/features/tenants/components/create-shop-form";
import { CreateShopNextSteps } from "@/features/tenants/components/shop-form-aside";
import { shopPagesText } from "@/features/tenants/text";

const t = shopPagesText.newShop;

export const metadata: Metadata = { title: pageTitle(t.title) };

export default function NewShopPage() {
  return (
    <RequirePermission permission="shops:manage">
      <div className="flex w-full max-w-7xl flex-col gap-6">
        <PageHeader title={t.title} description={t.description} />
        <div className="grid items-start gap-6 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <CreateShopForm />
          </div>
          <CreateShopNextSteps />
        </div>
      </div>
    </RequirePermission>
  );
}
