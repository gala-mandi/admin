"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api-error";
import { shopRoutes } from "@/lib/routes";
import { applyServerErrors, generalErrorMessage } from "../form-errors";
import { useTenant, useUpdateTenant } from "../hooks";
import {
  type ShopFieldsValues,
  shopFieldsSchema,
  shopFormFields,
  toUpdateInput,
} from "../schemas";
import { shopDetailText, shopFormText as t } from "../text";
import type { TenantDetail } from "../types";
import { FormAlert, FormSection, ShopFields } from "./shop-form-fields";
import { ShopLoadError, ShopPageSkeleton } from "./shop-state";

function valuesOf(tenant: TenantDetail): ShopFieldsValues {
  return {
    name: tenant.name,
    city: tenant.city ?? "",
    address: tenant.address ?? "",
    phone: tenant.phone,
    email: tenant.email ?? "",
  };
}

function EditForm({ tenant }: { tenant: TenantDetail }) {
  const router = useRouter();
  const update = useUpdateTenant(tenant.id);
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const inFlight = useRef(false);

  const form = useForm<ShopFieldsValues>({
    resolver: zodResolver(shopFieldsSchema),
    defaultValues: valuesOf(tenant),
  });

  const submit = async (values: ShopFieldsValues) => {
    setFormError(null);
    try {
      await update.mutateAsync(toUpdateInput(values));
      toast.success(t.saved);
      setLeaving(true);
      router.push(shopRoutes.detail(tenant.id));
    } catch (error) {
      const e = toApiError(error);
      if (e.status === 404) {
        setFormError(t.errors.notFound);
      } else if (!applyServerErrors(e, form.setError, shopFormFields)) {
        setFormError(generalErrorMessage(e));
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || leaving) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const busy = form.formState.isSubmitting || leaving;

  return (
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
          <ShopFields idPrefix="edit" />
        </FormSection>
        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" size="lg" className="h-11 px-5">
            <Link href={shopRoutes.detail(tenant.id)}>{t.cancel}</Link>
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
            {busy ? t.saving : t.save}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

/** `/shops/[id]/edit`: the create form's shop fields, saved with PATCH. */
export function EditShop({ id }: { id: string }) {
  const query = useTenant(id);

  if (query.isPending) return <ShopPageSkeleton />;
  if (query.isError) {
    return <ShopLoadError error={query.error} retry={() => query.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={shopDetailText.editTitle(query.data.name)}
        description={shopDetailText.editDescription}
      />
      <EditForm tenant={query.data} />
    </div>
  );
}
