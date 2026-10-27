"use client";

import { Ban, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api-error";
import { type TenantStatusAction, useTenantStatusAction } from "../hooks";
import { shopDetailText } from "../text";
import type { TenantDetail } from "../types";

/** Suspended and cancelled shops can be activated; the rest can be suspended. */
export function statusActionFor(
  tenant: Pick<TenantDetail, "status">,
): TenantStatusAction {
  return tenant.status === "suspended" || tenant.status === "cancelled"
    ? "activate"
    : "suspend";
}

/** Suspend / Activate button with a confirmation dialog explaining the effect. */
export function StatusAction({ tenant }: { tenant: TenantDetail }) {
  const [open, setOpen] = useState(false);
  const mutation = useTenantStatusAction(tenant.id);
  const action = statusActionFor(tenant);
  const t = shopDetailText[action];
  const pending = mutation.isPending;

  const confirm = () => {
    mutation.mutate(action, {
      onSuccess: (updated) => {
        setOpen(false);
        toast.success(t.done(updated.name));
      },
      onError: (error) => {
        const e = toApiError(error);
        toast.error(e.status === 0 || !e.message ? t.failed : e.message);
      },
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          size="lg"
          variant={action === "suspend" ? "destructive" : "default"}
          className="h-10 gap-2 px-4 font-semibold"
        >
          {action === "suspend" ? (
            <Ban aria-hidden />
          ) : (
            <RotateCcw aria-hidden />
          )}
          {t.button}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-lg font-bold">
            {t.title(tenant.name)}
          </AlertDialogTitle>
          <AlertDialogDescription>{t.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {shopDetailText.cancel}
          </AlertDialogCancel>
          <Button
            variant={action === "suspend" ? "destructive" : "default"}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirm}
            className="gap-2"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? t.pending : t.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
