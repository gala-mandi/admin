import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
