"use client";

import {
  CalendarDays,
  Fingerprint,
  KeyRound,
  type LucideIcon,
  MapPin,
  Pencil,
  Phone,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { shopRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useTenant } from "../hooks";
import { shopDetailText as t } from "../text";
import type { TenantDetail } from "../types";
import { ShopAvatar } from "./shop-avatar";
import { ShopLoadError, ShopPageSkeleton } from "./shop-state";
import { StatusAction } from "./status-action";
import { StatusBadge } from "./status-badge";

/** A titled card; its heading names the region for screen readers. */
export function DetailCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "bg-card text-card-foreground rounded-card shadow-panel flex flex-col gap-4 border p-5 sm:p-6",
        className,
      )}
    >
      <h2 id={id} className="font-heading text-base font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One label/value pair; `stacked` puts the label above (narrow cards). */
export function DetailItem({
  label,
  children,
  ltr,
  stacked,
}: {
  label: string;
  children: ReactNode;
  ltr?: boolean;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        !stacked && "sm:flex-row sm:items-baseline sm:gap-4",
      )}
    >
      <dt
        className={cn(
          "text-muted-foreground flex-none text-sm",
          !stacked && "sm:w-32",
        )}
      >
        {label}
      </dt>
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
    <DetailCard title={t.shopSection}>
      <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        <DetailItem label={f.city} stacked>
          {orNone(tenant.city)}
        </DetailItem>
        <DetailItem label={f.phone} ltr stacked>
          <span className="tabular-nums">{tenant.phone}</span>
        </DetailItem>
        <DetailItem label={f.email} ltr stacked>
          {orNone(tenant.email)}
        </DetailItem>
        <DetailItem label={f.updated} stacked>
          <time dateTime={tenant.updatedAt}>
            {formatDateTime(tenant.updatedAt)}
          </time>
        </DetailItem>
        <div className="md:col-span-2">
          <DetailItem label={f.address} stacked>
            {orNone(tenant.address)}
          </DetailItem>
        </div>
      </dl>
    </DetailCard>
  );
}

function StatusCard({ tenant }: { tenant: TenantDetail }) {
  return (
    <DetailCard title={t.statusSection}>
      <div className="flex flex-col gap-2">
        <StatusBadge status={tenant.status} className="h-6 px-2.5 text-xs" />
        <p className="text-muted-foreground text-sm/relaxed">
          {t.statusHint[tenant.status]}
        </p>
      </div>
      <StatusAction tenant={tenant} className="w-full" />
    </DetailCard>
  );
}

function OwnerInfo({ tenant }: { tenant: TenantDetail }) {
  const f = t.fields;
  const owner = tenant.owner;
  return (
    <DetailCard title={t.ownerSection}>
      {owner ? (
        <>
          <dl className="flex flex-col gap-3">
            <DetailItem label={f.ownerName}>{owner.name}</DetailItem>
            <DetailItem label={f.ownerPhone} ltr>
              <span className="tabular-nums">{owner.phone}</span>
            </DetailItem>
            <DetailItem label={f.ownerEmail} ltr>
              {orNone(owner.email)}
            </DetailItem>
            <DetailItem label={f.ownerAccount}>
              {owner.isActive ? t.accountActive : t.accountDisabled}
            </DetailItem>
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
    </DetailCard>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-card shadow-panel flex min-w-0 items-start gap-3 border p-4 sm:p-5">
      <span className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-muted-foreground text-sm">{label}</dt>
        <dd className="min-w-0 text-[15px] font-semibold break-words">
          {children}
        </dd>
      </div>
    </div>
  );
}

/** Created, users and slug as a row of tiles above the details. */
function KeyFacts({ tenant }: { tenant: TenantDetail }) {
  const f = t.fields;
  return (
    <section aria-labelledby="section-key-facts">
      <h2 id="section-key-facts" className="sr-only">
        {t.factsSection}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        <Fact icon={CalendarDays} label={f.created}>
          <time dateTime={tenant.createdAt}>
            {formatDate(tenant.createdAt)}
          </time>
          <span className="text-muted-foreground block text-xs font-normal">
            {formatRelative(tenant.createdAt)}
          </span>
        </Fact>
        <Fact icon={Users} label={f.users}>
          {t.users(tenant.userCount)}
        </Fact>
        <Fact icon={Fingerprint} label={f.slug}>
          <code
            dir="ltr"
            className="bg-surface-muted inline-block max-w-full truncate rounded-md px-1.5 py-0.5 align-middle font-mono text-[13px] font-medium"
          >
            {tenant.slug}
          </code>
        </Fact>
      </dl>
    </section>
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
      <div className="flex items-start gap-4">
        <ShopAvatar
          id={tenant.id}
          name={tenant.name}
          size="lg"
          className="hidden sm:flex"
        />
        <PageHeader
          className="min-w-0 flex-1"
          title={tenant.name}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusBadge status={tenant.status} />
              {tenant.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden className="size-3.5" />
                  {tenant.city}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Phone aria-hidden className="size-3.5" />
                <span dir="ltr" className="tabular-nums">
                  {tenant.phone}
                </span>
              </span>
              <span>{formatDate(tenant.createdAt)}</span>
            </span>
          }
          actions={
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
          }
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <KeyFacts tenant={tenant} />
          <ShopInfo tenant={tenant} />
        </div>
        <aside className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-1">
          <StatusCard tenant={tenant} />
          <OwnerInfo tenant={tenant} />
        </aside>
      </div>
    </div>
  );
}
