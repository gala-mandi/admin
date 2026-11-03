"use client";

import { ArrowRight, Plus, Store } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/hooks";
import type { User } from "@/features/auth/types";
import { can } from "@/lib/can";
import { panelRoutes, shopRoutes } from "@/lib/routes";
import { menuFor } from "../menu";
import { panelText } from "../text";
import { RequirePermission } from "./require-permission";

const t = panelText.dashboard;
const section = panelText.sections.dashboard;

const card =
  "bg-card text-card-foreground rounded-card shadow-panel border p-5 sm:p-6";

function Welcome({ user }: { user: User }) {
  return (
    <section
      aria-labelledby="dashboard-welcome"
      className="rounded-card from-brand-from to-brand-to shadow-panel relative flex flex-col justify-between gap-6 overflow-hidden bg-linear-to-br p-6 text-white sm:p-8 xl:col-span-2"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative flex flex-col gap-2">
        <h2
          id="dashboard-welcome"
          className="font-heading text-2xl font-extrabold tracking-tight sm:text-[1.75rem]"
        >
          {t.welcome(user.name)}
        </h2>
        <p className="max-w-xl text-[15px]/relaxed text-white/90">{t.body}</p>
      </div>
      {can(user.role, "shops:manage") ? (
        <div className="relative flex flex-wrap gap-2">
          <Button
            asChild
            size="lg"
            className="text-primary h-10 gap-2 bg-white px-4 font-semibold hover:bg-white/90"
          >
            <Link href={shopRoutes.list}>
              <Store aria-hidden />
              {t.openShops}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-10 gap-2 border-white/40 bg-white/10 px-4 font-semibold text-white hover:bg-white/20 hover:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <Link href={shopRoutes.create}>
              <Plus aria-hidden />
              {t.newShop}
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Account({ user }: { user: User }) {
  const a = t.account;
  return (
    <section aria-labelledby="dashboard-account" className={card}>
      <h2 id="dashboard-account" className="font-heading text-base font-bold">
        {a.title}
      </h2>
      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{a.role}</dt>
          <dd className="font-medium">{panelText.roles[user.role]}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{a.email}</dt>
          <dd dir="ltr" className="min-w-0 truncate font-medium">
            {user.email ?? a.none}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{a.phone}</dt>
          <dd dir="ltr" className="font-medium tabular-nums">
            {user.phone}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Sections({ user }: { user: User }) {
  const items = menuFor(user.role).filter(
    (item) => item.href !== panelRoutes.dashboard,
  );
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="dashboard-sections"
      className="flex flex-col gap-3"
    >
      <h2
        id="dashboard-sections"
        className="text-muted-foreground text-xs font-semibold tracking-[0.06em] uppercase"
      >
        {t.sectionsTitle}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {items.map(({ key, href, icon: Icon, label }) => (
          <li key={key} className="flex">
            <Link
              href={href}
              className="group bg-card text-card-foreground rounded-card shadow-panel hover:border-primary/40 focus-visible:ring-ring/50 flex w-full flex-col gap-3 border p-5 transition-colors outline-none focus-visible:ring-3"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="bg-secondary text-secondary-foreground flex size-10 items-center justify-center rounded-xl">
                  <Icon aria-hidden className="size-5" />
                </span>
                <ArrowRight
                  aria-hidden
                  className="text-muted-foreground group-hover:text-link size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-heading font-bold">{label}</span>
                <span className="text-muted-foreground text-sm/relaxed">
                  {panelText.sections[key].description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Dashboard until its own ticket: welcome, account and links to every section. */
export function DashboardHome() {
  const me = useMe();

  return (
    <RequirePermission permission="dashboard:view">
      <div className="flex flex-col gap-6">
        <PageHeader title={section.label} description={section.description} />
        {me.isPending ? (
          <div role="status" className="grid gap-6 xl:grid-cols-3">
            <span className="sr-only">{t.loading}</span>
            <Skeleton className="rounded-card h-48 xl:col-span-2" />
            <Skeleton className="rounded-card h-48" />
          </div>
        ) : me.isError ? (
          <section
            role="alert"
            className={`${card} flex flex-col items-start gap-3`}
          >
            <p className="text-destructive">{t.error}</p>
            <Button variant="outline" onClick={() => me.refetch()}>
              {t.retry}
            </Button>
          </section>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-3">
              <Welcome user={me.data} />
              <Account user={me.data} />
            </div>
            <Sections user={me.data} />
          </>
        )}
      </div>
    </RequirePermission>
  );
}
