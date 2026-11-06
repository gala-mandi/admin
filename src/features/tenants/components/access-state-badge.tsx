import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { accessStateText } from "../text";
import type { AccessState } from "../types";

const tone: Record<AccessState, string> = {
  active: "bg-success/10 text-success",
  grace: "bg-notice-soft text-notice",
  read_only: "bg-destructive/10 text-destructive",
};

/** Plan state today as a pill; the word is always shown, not only colour. */
export function AccessStateBadge({
  state,
  className,
}: {
  state: AccessState;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-state={state}
      className={cn("border-transparent font-semibold", tone[state], className)}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {accessStateText[state]}
    </Badge>
  );
}
