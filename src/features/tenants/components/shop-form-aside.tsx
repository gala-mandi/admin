import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { shopPagesText } from "../text";
import type { TenantDetail } from "../types";
import { ShopAvatar } from "./shop-avatar";
import { StatusBadge } from "./status-badge";

const asideCard =
  "bg-card text-card-foreground rounded-card shadow-panel flex flex-col gap-4 border p-5 sm:p-6 xl:sticky xl:top-24";

/** New shop page: what creating a shop sets up, as a numbered list. */
export function CreateShopNextSteps({ className }: { className?: string }) {
  const t = shopPagesText.nextSteps;
  return (
    <aside
      aria-labelledby="next-steps-title"
      className={cn(asideCard, className)}
    >
      <h2 id="next-steps-title" className="font-heading text-base font-bold">
        {t.title}
      </h2>
      <ol className="flex flex-col gap-4">
        {t.steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden
              className="bg-secondary text-secondary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums"
            >
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{step.title}</span>
              <span className="text-muted-foreground text-[13px]/relaxed">
                {step.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/** Edit shop page: the shop being edited, with what the form can't change. */
export function EditShopSummary({
  tenant,
  className,
}: {
  tenant: TenantDetail;
  className?: string;
}) {
  const t = shopPagesText.summary;
  return (
    <aside
      aria-labelledby="shop-summary-title"
      className={cn(asideCard, className)}
    >
      <h2 id="shop-summary-title" className="font-heading text-base font-bold">
        {t.title}
      </h2>
      <div className="flex items-center gap-3">
        <ShopAvatar id={tenant.id} name={tenant.name} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{tenant.name}</span>
          <span dir="ltr" className="text-muted-foreground truncate text-xs">
            {tenant.slug}
          </span>
        </div>
      </div>
      <dl className="flex flex-col gap-3 border-t pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{t.status}</dt>
          <dd>
            <StatusBadge status={tenant.status} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{t.created}</dt>
          <dd className="text-end font-medium">
            <time dateTime={tenant.createdAt}>
              {formatDateTime(tenant.createdAt)}
            </time>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{t.updated}</dt>
          <dd className="text-end font-medium">
            <time dateTime={tenant.updatedAt}>
              {formatDateTime(tenant.updatedAt)}
            </time>
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground bg-surface-muted/60 rounded-xl px-3.5 py-3 text-[13px]/relaxed">
        {t.note}
      </p>
    </aside>
  );
}
