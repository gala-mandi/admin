"use client";

import { KeyRound, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { shopRoutes } from "@/lib/routes";
import { useTenant } from "../hooks";
import { shopDetailText as t } from "../text";
import type { TenantDetail } from "../types";
import { ShopLoadError, ShopPageSkeleton } from "./shop-state";
import { StatusAction } from "./status-action";
import { StatusBadge } from "./status-badge";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className="bg-card text-card-foreground rounded-card flex flex-col gap-4 border p-5 sm:p-6"
    >
      <h2 id={id} className="font-heading text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Item({
  label,
  children,
  ltr,
}: {
  label: string;
  children: ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-muted-foreground w-32 flex-none text-sm">{label}</dt>
      <dd
        className="min-w-0 text-[15px] font-medium break-words"
        dir={ltr ? "ltr" : undefined}
      >
        {children}
      </dd>
    </div>
  );
}

const orNone = (value: string | null | undefined) => value || t.none;

function ShopInfo({ tenant }: { tenant: TenantDetail }) {
  const f = t.fields;
  return (
    <Section title={t.shopSection}>
      <dl className="flex flex-col gap-3">
        <Item label={f.status}>
          <StatusBadge status={tenant.status} />
        </Item>
        <Item label={f.city}>{orNone(tenant.city)}</Item>
        <Item label={f.address}>{orNone(tenant.address)}</Item>
        <Item label={f.phone} ltr>
          {tenant.phone}
        </Item>
        <Item label={f.email} ltr>
          {orNone(tenant.email)}
        </Item>
        <Item label={f.users}>{t.users(tenant.userCount)}</Item>
        <Item label={f.created}>
          <time dateTime={tenant.createdAt}>
            {formatDateTime(tenant.createdAt)}
          </time>
        </Item>
        <Item label={f.updated}>
          <time dateTime={tenant.updatedAt}>
            {formatDateTime(tenant.updatedAt)}
          </time>
        </Item>
      </dl>
    </Section>
  );
}

function OwnerInfo({ tenant }: { tenant: TenantDetail }) {
  const f = t.fields;
  const owner = tenant.owner;
  return (
    <Section title={t.ownerSection}>
      {owner ? (
        <>
          <dl className="flex flex-col gap-3">
            <Item label={f.ownerName}>{owner.name}</Item>
            <Item label={f.ownerPhone} ltr>
              {owner.phone}
            </Item>
            <Item label={f.ownerEmail} ltr>
              {orNone(owner.email)}
            </Item>
            <Item label={f.ownerAccount}>
              {owner.isActive ? t.accountActive : t.accountDisabled}
            </Item>
          </dl>
          {owner.mustChangePassword ? (
            <p className="bg-notice-soft text-notice flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium">
              <KeyRound aria-hidden className="mt-0.5 size-4 flex-none" />
              {t.mustChangePassword}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">{t.noOwner}</p>
      )}
    </Section>
  );
}

/** Shop detail with Edit and Suspend/Activate. */
export function ShopDetail({ id }: { id: string }) {
  const query = useTenant(id);

  if (query.isPending) return <ShopPageSkeleton />;
  if (query.isError) {
    return <ShopLoadError error={query.error} retry={() => query.refetch()} />;
  }

  const tenant = query.data;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tenant.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tenant.status} />
            <span>
              {[tenant.city, formatDate(tenant.createdAt)]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        }
        actions={
          <>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-10 gap-2 px-4"
            >
              <Link href={shopRoutes.edit(tenant.id)}>
                <Pencil aria-hidden />
                {t.edit}
              </Link>
            </Button>
            <StatusAction tenant={tenant} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ShopInfo tenant={tenant} />
        <OwnerInfo tenant={tenant} />
      </div>
    </div>
  );
}
