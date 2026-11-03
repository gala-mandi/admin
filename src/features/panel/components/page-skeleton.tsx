import { Skeleton } from "@/components/ui/skeleton";
import { panelText } from "../text";

/** Loading skeleton for a panel page (`loading.tsx`). */
export function PageSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-6"
      data-testid="page-skeleton"
    >
      <span className="sr-only">{panelText.loading}</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className="rounded-card h-28 first:col-span-2 lg:first:col-span-1"
          />
        ))}
      </div>
      <Skeleton className="rounded-card h-64" />
    </div>
  );
}
