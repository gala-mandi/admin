import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tenantStatusText } from "../text";
import type { TenantStatus } from "../types";

const tone: Record<TenantStatus, string> = {
  trial: "bg-secondary text-secondary-foreground",
  active: "bg-success/10 text-success",
  suspended: "bg-destructive/10 text-destructive",
  cancelled: "border-border text-muted-foreground bg-transparent",
};

/** Colour of the dot next to a status in the status filter. */
export const statusDotClass: Record<TenantStatus, string> = {
  trial: "bg-secondary-foreground",
  active: "bg-success",
  suspended: "bg-destructive",
  cancelled: "bg-muted-foreground",
};

/** Shop status as a coloured pill; the word is always shown, not only the colour. */
export function StatusBadge({
  status,
  className,
}: {
  status: TenantStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn(
        "border-transparent font-semibold",
        tone[status],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {tenantStatusText[status]}
    </Badge>
  );
}
