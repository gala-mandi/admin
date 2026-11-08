"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Loader2, Repeat } from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActivePlans } from "@/features/plans/hooks";
import { type ApiError, toApiError } from "@/lib/api-error";
import {
  addDays,
  addMonths,
  formatDay,
  formatRs,
  karachiToday,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAssignSubscription, useExtendSubscription } from "../hooks";
import {
  type AssignSubscriptionValues,
  assignSubscriptionSchema,
  type ExtendSubscriptionValues,
  extendSubscriptionSchema,
  toAssignInput,
} from "../schemas";
import { subscriptionDialogText as t } from "../text";
import type { SubscriptionView, TenantDetail } from "../types";
import { FormAlert, TextField } from "./shop-form-fields";
import { useReturnFocus } from "@/hooks/use-return-focus";

type Mode = "extend" | "assign";
const e = t.errors;

function generalMessage(error: ApiError): string {
  if (error.status === 0) return e.network;
  return error.message ?? e.unknown;
}

/** Server field errors onto the form; false when none belonged to it. */
function applyErrors<T extends Record<string, unknown>>(
  error: ApiError,
  form: UseFormReturn<T>,
  fields: readonly string[],
): boolean {
  if (error.code === "PLAN_INACTIVE" && fields.includes("planId")) {
    form.setError("planId" as never, { message: e.planInactive });
    return true;
  }
  let applied = 0;
  for (const { field, message } of error.errors) {
    if (!fields.includes(field)) continue;
    form.setError(field as never, { message }, { shouldFocus: applied === 0 });
    applied += 1;
  }
  return applied > 0;
}

const dateProps = { type: "date", dir: "ltr" } as const;

function ExtendForm({
  tenant,
  sub,
  today,
  onDone,
}: {
  tenant: TenantDetail;
  sub: SubscriptionView;
  today: string;
  onDone: () => void;
}) {
  const extend = useExtendSubscription(tenant.id);
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);
  // From the later of today and the current end, so a lapsed shop gets a
  // full month from now.
  const base = sub.endsOn > today ? sub.endsOn : today;
  const form = useForm<ExtendSubscriptionValues>({
    resolver: zodResolver(extendSubscriptionSchema(sub.endsOn, today)),
    defaultValues: { endsOn: addMonths(base, 1) },
  });
  const endsOn = useWatch({ control: form.control, name: "endsOn" });

  const submit = async (values: ExtendSubscriptionValues) => {
    setFormError(null);
    try {
      const saved = await extend.mutateAsync(values);
      toast.success(t.extended(tenant.name, formatDay(saved.endsOn)));
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      if (!applyErrors(apiError, form, ["endsOn"])) {
        setFormError(generalMessage(apiError));
      }
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
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(endsOn ?? "");

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {formError ? <FormAlert message={formError} /> : null}
        <p className="text-muted-foreground text-sm">{t.extendHint}</p>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold" id="quick-pick">
            {t.quick}
          </span>
          <div
            role="group"
            aria-labelledby="quick-pick"
            className="flex flex-wrap gap-2"
          >
            {t.quickOptions.map((option) => {
              const value = addMonths(base, option.months);
              const selected = endsOn === value;
              return (
                <Button
                  key={option.months}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  aria-pressed={selected}
                  className="rounded-full px-3.5"
                  onClick={() =>
                    form.setValue("endsOn", value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
        <TextField<ExtendSubscriptionValues>
          name="endsOn"
          id="extend-ends-on"
          label={t.newEndsOn}
          hint={t.endsOnHint(formatDay(today))}
          inputProps={{ ...dateProps, min: addDays(sub.endsOn, 1) }}
        />
        {valid ? (
          <p
            data-testid="subscription-summary"
            className="bg-secondary text-secondary-foreground rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium"
          >
            {t.summary(
              formatDay(endsOn),
              formatDay(addDays(endsOn, sub.graceDays)),
            )}
          </p>
        ) : null}
        <DialogFooter className="border-t pt-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 px-5"
            onClick={onDone}
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
            {busy ? t.extending : t.extend}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}

function AssignForm({
  tenant,
  today,
  onDone,
}: {
  tenant: TenantDetail;
  today: string;
  onDone: () => void;
}) {
  const assign = useAssignSubscription(tenant.id);
  const plans = useActivePlans();
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const form = useForm<AssignSubscriptionValues>({
    resolver: zodResolver(assignSubscriptionSchema(today)),
    defaultValues: {
      planId: "",
      startsOn: today,
      endsOn: addMonths(today, 1),
      graceDays: String(tenant.subscription?.graceDays ?? 7),
    },
  });
  const [endsOn, graceDays] = useWatch({
    control: form.control,
    name: ["endsOn", "graceDays"],
  });
  const options = plans.data?.data ?? [];

  const submit = async (values: AssignSubscriptionValues) => {
    setFormError(null);
    try {
      const saved = await assign.mutateAsync(toAssignInput(values));
      toast.success(t.assigned(tenant.name, saved.plan.name));
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      if (
        !applyErrors(apiError, form, [
          "planId",
          "startsOn",
          "endsOn",
          "graceDays",
        ])
      ) {
        setFormError(generalMessage(apiError));
      }
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
  const showSummary =
    /^\d{4}-\d{2}-\d{2}$/.test(endsOn ?? "") && /^\d{1,2}$/.test(graceDays);

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {formError ? <FormAlert message={formError} /> : null}
        {plans.isError ? <FormAlert message={t.plansError} /> : null}
        <p className="text-muted-foreground text-sm">{t.assignHint}</p>
        <Controller
          control={form.control}
          name="planId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel
                htmlFor="assign-plan"
                className="text-[13px] font-semibold"
              >
                {t.plan}
              </FieldLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={plans.isPending}
              >
                <SelectTrigger
                  id="assign-plan"
                  ref={field.ref}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.error ? "assign-plan-error" : undefined
                  }
                  className="rounded-field bg-card h-[50px]! w-full px-3.5 text-[15px]"
                >
                  <SelectValue
                    placeholder={
                      plans.isPending ? t.plansLoading : t.planPlaceholder
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {options.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {t.planOption(
                        plan.name,
                        plan.maxUsers,
                        formatRs(plan.priceMonthly),
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="assign-plan-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField<AssignSubscriptionValues>
            name="startsOn"
            id="assign-starts-on"
            label={t.startsOn}
            inputProps={dateProps}
          />
          <TextField<AssignSubscriptionValues>
            name="endsOn"
            id="assign-ends-on"
            label={t.endsOn}
            inputProps={{ ...dateProps, min: today }}
          />
        </div>
        <TextField<AssignSubscriptionValues>
          name="graceDays"
          id="assign-grace"
          label={t.graceDays}
          hint={t.graceHint}
          inputProps={{ inputMode: "numeric", dir: "ltr" }}
        />
        {showSummary ? (
          <p
            data-testid="subscription-summary"
            className="bg-secondary text-secondary-foreground rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium"
          >
            {t.summary(
              formatDay(endsOn),
              formatDay(addDays(endsOn, Number(graceDays))),
            )}
          </p>
        ) : null}
        <DialogFooter className="border-t pt-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 px-5"
            onClick={onDone}
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
            {busy ? t.assigning : t.assign}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}

/**
 * "Assign / extend plan": extend keeps the plan and moves its end date;
 * change plan puts the shop on another plan from a start date. Both take
 * effect on the server at once (a read-only shop is unlocked).
 */
export function SubscriptionDialog({
  tenant,
  onClose,
}: {
  tenant: TenantDetail;
  onClose: () => void;
}) {
  const sub = tenant.subscription ?? null;
  const [mode, setMode] = useState<Mode>(sub ? "extend" : "assign");
  const today = useMemo(() => karachiToday(), []);
  const returnFocus = useReturnFocus(true);

  const tabs: { mode: Mode; label: string; icon: typeof Repeat }[] = [
    { mode: "extend", label: t.tabs.extend, icon: CalendarPlus },
    { mode: "assign", label: t.tabs.assign, icon: Repeat },
  ];

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        {...returnFocus}
        className="sm:rounded-card gap-6 p-5 sm:max-w-lg sm:p-7"
        closeLabel={t.cancel}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description(tenant.name)}</DialogDescription>
          {sub ? (
            <p className="text-foreground mt-1 text-sm font-medium">
              {t.current(sub.plan.name, formatDay(sub.endsOn))}
            </p>
          ) : null}
        </DialogHeader>

        {sub ? (
          <div
            role="tablist"
            aria-label={t.title}
            className="bg-surface-muted grid grid-cols-2 gap-1 rounded-xl p-1"
          >
            {tabs.map(({ mode: m, label, icon: Icon }) => (
              <button
                key={m}
                type="button"
                role="tab"
                id={`subscription-tab-${m}`}
                aria-selected={mode === m}
                aria-controls={`subscription-panel-${m}`}
                onClick={() => setMode(m)}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-3",
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <div
          role={sub ? "tabpanel" : undefined}
          id={`subscription-panel-${mode}`}
          aria-labelledby={sub ? `subscription-tab-${mode}` : undefined}
        >
          {mode === "extend" && sub ? (
            <ExtendForm
              tenant={tenant}
              sub={sub}
              today={today}
              onDone={onClose}
            />
          ) : (
            <AssignForm tenant={tenant} today={today} onDone={onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
