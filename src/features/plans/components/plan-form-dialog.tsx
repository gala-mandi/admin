"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  FormAlert,
  TextField,
} from "@/features/tenants/components/shop-form-fields";
import { type ApiError, toApiError } from "@/lib/api-error";
import { useCreatePlan, useUpdatePlan } from "../hooks";
import {
  changedPlanInput,
  emptyPlanForm,
  planFormFields,
  planFormSchema,
  type PlanFormValues,
  toPlanForm,
  toPlanInput,
} from "../schemas";
import { planFormText as t } from "../text";
import type { Plan } from "../types";

const e = t.errors;

function generalMessage(error: ApiError): string {
  if (error.status === 0) return e.network;
  return error.message ?? e.unknown;
}

interface PlanFormDialogProps {
  /** The plan to edit; `null` creates a new one. */
  plan: Plan | null;
  onClose: () => void;
}

/** Create or edit a plan (name, limits, monthly price, on/off). */
export function PlanFormDialog({ plan, onClose }: PlanFormDialogProps) {
  const create = useCreatePlan();
  const update = useUpdatePlan(plan?.id ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const locked = plan?.isTrial ?? false;

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: plan ? toPlanForm(plan) : emptyPlanForm,
  });

  const submit = async (values: PlanFormValues) => {
    setFormError(null);
    try {
      if (plan) {
        const changes = changedPlanInput(plan, values);
        const saved = Object.keys(changes).length
          ? await update.mutateAsync(changes)
          : plan;
        toast.success(t.saved(saved.name));
      } else {
        const saved = await create.mutateAsync(toPlanInput(values));
        toast.success(t.created(saved.name));
      }
      onClose();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === "PLAN_NAME_TAKEN") {
        form.setError("name", { message: e.nameTaken }, { shouldFocus: true });
        return;
      }
      let applied = 0;
      for (const { field, message } of apiError.errors) {
        if (!(planFormFields as readonly string[]).includes(field)) continue;
        form.setError(
          field as (typeof planFormFields)[number],
          { message },
          { shouldFocus: applied === 0 },
        );
        applied += 1;
      }
      if (!applied) setFormError(generalMessage(apiError));
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const busy = form.formState.isSubmitting;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="sm:rounded-card gap-6 p-5 sm:max-w-xl sm:p-7"
        closeLabel={t.cancel}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">
            {plan ? t.editTitle(plan.name) : t.createTitle}
          </DialogTitle>
          <DialogDescription>
            {plan ? t.editDescription : t.createDescription}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form
            noValidate
            onSubmit={onSubmit}
            aria-busy={busy || undefined}
            className="flex flex-col gap-5"
          >
            {formError ? <FormAlert message={formError} /> : null}
            {locked ? (
              <p className="bg-secondary text-secondary-foreground flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium">
                <Lock aria-hidden className="mt-0.5 size-4 flex-none" />
                {t.trialLocked}
              </p>
            ) : null}

            <TextField<PlanFormValues>
              name="name"
              id="plan-name"
              label={t.name}
              inputProps={{
                placeholder: t.namePlaceholder,
                autoComplete: "off",
                readOnly: locked,
                "aria-readonly": locked || undefined,
              }}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField<PlanFormValues>
                name="maxUsers"
                id="plan-max-users"
                label={t.maxUsers}
                hint={t.maxUsersHint}
                inputProps={{ inputMode: "numeric", dir: "ltr" }}
              />
              <TextField<PlanFormValues>
                name="maxBranches"
                id="plan-max-branches"
                label={t.maxBranches}
                hint={t.maxBranchesHint}
                inputProps={{ inputMode: "numeric", dir: "ltr" }}
              />
            </div>
            <TextField<PlanFormValues>
              name="priceMonthly"
              id="plan-price"
              label={`${t.price} (${t.pricePrefix})`}
              inputProps={{
                inputMode: "decimal",
                dir: "ltr",
                placeholder: t.pricePlaceholder,
              }}
            />
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <div className="bg-surface-muted flex items-start gap-3 rounded-xl px-3.5 py-3">
                  <Checkbox
                    id="plan-active"
                    checked={field.value}
                    disabled={locked}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    aria-describedby="plan-active-hint"
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel
                      htmlFor="plan-active"
                      className="text-[13px] font-semibold"
                    >
                      {t.isActive}
                    </FieldLabel>
                    <FieldDescription id="plan-active-hint">
                      {t.isActiveHint}
                    </FieldDescription>
                  </div>
                </div>
              )}
            />

            <DialogFooter className="border-t pt-5">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 px-5"
                onClick={onClose}
                disabled={busy}
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={busy}
                aria-busy={busy || undefined}
                className="h-11 gap-2 px-5 font-semibold"
              >
                {busy ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : null}
                {plan
                  ? busy
                    ? t.saving
                    : t.save
                  : busy
                    ? t.creating
                    : t.create}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
