"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api-error";
import { shopRoutes } from "@/lib/routes";
import { applyServerErrors, generalErrorMessage } from "../form-errors";
import { useCreateTenant } from "../hooks";
import {
  type CreateShopValues,
  createShopSchema,
  emptyCreateShop,
  shopFormFields,
  toCreateInput,
} from "../schemas";
import { shopFormText as t } from "../text";
import {
  emailProps,
  FormAlert,
  FormSection,
  phoneProps,
  ShopFields,
  TextField,
} from "./shop-form-fields";
import { TemporaryPasswordDialog } from "./temporary-password-dialog";

/** Create a shop and its owner; then show the owner's temporary password once. */
export function CreateShopForm() {
  const router = useRouter();
  const create = useCreateTenant();
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const inFlight = useRef(false);

  const form = useForm<CreateShopValues>({
    resolver: zodResolver(createShopSchema),
    defaultValues: emptyCreateShop,
  });

  const submit = async (values: CreateShopValues) => {
    setFormError(null);
    try {
      await create.mutateAsync(toCreateInput(values));
    } catch (error) {
      const e = toApiError(error);
      if (!applyServerErrors(e, form.setError, shopFormFields)) {
        setFormError(generalErrorMessage(e));
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A double click must never create two shops.
    if (inFlight.current || create.isSuccess || leaving) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const created = create.data;
  const finish = () => {
    if (!created) return;
    const id = created.tenant.id;
    // Drops the response (and the password in it) from memory.
    create.reset();
    setLeaving(true);
    router.push(shopRoutes.detail(id));
  };

  const busy =
    form.formState.isSubmitting ||
    create.isPending ||
    create.isSuccess ||
    leaving;

  return (
    <>
      <FormProvider {...form}>
        <form
          method="post"
          noValidate
          onSubmit={onSubmit}
          aria-busy={busy || undefined}
          className="bg-card text-card-foreground rounded-card flex flex-col gap-8 border p-5 sm:p-8"
        >
          {formError ? <FormAlert message={formError} /> : null}

          <FormSection title={t.shopSection} hint={t.shopSectionHint}>
            <ShopFields idPrefix="shop" />
          </FormSection>

          <FormSection title={t.ownerSection} hint={t.ownerSectionHint}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField<CreateShopValues>
                name="owner.name"
                id="owner-name"
                label={t.ownerName}
                className="sm:col-span-2"
                inputProps={{
                  placeholder: t.ownerNamePlaceholder,
                  autoComplete: "off",
                }}
              />
              <TextField<CreateShopValues>
                name="owner.phone"
                id="owner-phone"
                label={t.ownerPhone}
                hint={t.ownerPhoneHint}
                inputProps={{ ...phoneProps, autoComplete: "off" }}
              />
              <TextField<CreateShopValues>
                name="owner.email"
                id="owner-email"
                label={t.ownerEmail}
                optional
                inputProps={{ ...emailProps, autoComplete: "off" }}
              />
            </div>
          </FormSection>

          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href={shopRoutes.list}>{t.cancel}</Link>
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
              {busy ? t.creating : t.create}
            </Button>
          </div>
        </form>
      </FormProvider>

      {created ? (
        <TemporaryPasswordDialog
          shopName={created.tenant.name}
          ownerName={created.tenant.owner?.name ?? created.tenant.ownerName}
          password={created.temporaryPassword}
          onDone={finish}
        />
      ) : null}
    </>
  );
}
