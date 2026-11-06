import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { planStatusText } from "../text";

/** Active / Inactive pill; the word is always shown, not only the colour. */
export function PlanStatusBadge({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) {
  const key = isActive ? "active" : "inactive";
  return (
    <Badge
      variant="outline"
      data-status={key}
      className={cn(
        "border-transparent font-semibold",
        isActive
          ? "bg-success/10 text-success"
          : "border-border text-muted-foreground bg-transparent",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {planStatusText[key]}
    </Badge>
  );
}
