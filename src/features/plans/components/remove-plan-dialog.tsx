"use client";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api-error";
import { useRemovePlan } from "../hooks";
import { removePlanText as t } from "../text";
import type { Plan } from "../types";

/**
 * Confirms deleting a plan. The server decides: a plan no shop ever used is
 * deleted, one shops have used is turned off instead.
 */
export function RemovePlanDialog({
  plan,
  onClose,
}: {
  plan: Plan;
  onClose: () => void;
}) {
  const remove = useRemovePlan();

  const confirm = async () => {
    try {
      const { result } = await remove.mutateAsync(plan);
      toast.success(
        result === "deleted" ? t.deleted(plan.name) : t.deactivated(plan.name),
      );
      onClose();
    } catch (error) {
      const e = toApiError(error);
      toast.error(e.code === "TRIAL_PLAN_LOCKED" ? t.trialLocked : t.failed);
    }
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !remove.isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>{t.title(plan.name)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.body(plan.shopCount)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {t.cancel}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => void confirm()}
            disabled={remove.isPending}
            aria-busy={remove.isPending || undefined}
            className="gap-2"
          >
            {remove.isPending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : null}
            {remove.isPending ? t.pending : t.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
