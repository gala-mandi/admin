"use client";

import { AlertCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  Controller,
  type FieldValues,
  type Path,
  useFormContext,
} from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ShopFieldsValues } from "../schemas";
import { shopFormText as t } from "../text";

const controlClass =
  "rounded-field bg-card h-11 px-3.5 text-[15px] md:text-[15px] focus-visible:ring-ring/15 focus-visible:ring-4";

interface TextFieldProps<T extends FieldValues> {
  name: Path<T>;
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  multiline?: boolean;
  className?: string;
  inputProps?: Omit<ComponentProps<"input">, "id" | "name">;
}

/** Labelled input bound to the surrounding `FormProvider`, with its error. */
export function TextField<T extends FieldValues>({
  name,
  id,
  label,
  optional,
  hint,
  multiline,
  className,
  inputProps,
}: TextFieldProps<T>) {
  const { control } = useFormContext<T>();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const describedBy =
          [fieldState.error ? errorId : null, hintId]
            .filter(Boolean)
            .join(" ") || undefined;
        const common = {
          ...field,
          id,
          "aria-invalid": fieldState.invalid,
          "aria-describedby": describedBy,
        };
        return (
          <Field
            data-invalid={fieldState.invalid}
            className={cn("gap-2", className)}
          >
            <FieldLabel htmlFor={id} className="text-[13px] font-semibold">
              {label}
              {optional ? (
                <span className="text-muted-foreground font-normal">
                  {t.optional}
                </span>
              ) : null}
            </FieldLabel>
            {multiline ? (
              <Textarea
                {...common}
                rows={2}
                placeholder={inputProps?.placeholder}
                className={cn(controlClass, "h-auto min-h-20 py-2.5")}
              />
            ) : (
              <Input {...inputProps} {...common} className={controlClass} />
            )}
            {hint ? (
              <FieldDescription id={hintId}>{hint}</FieldDescription>
            ) : null}
            <FieldError id={errorId} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}

export const phoneProps = {
  type: "tel",
  inputMode: "tel",
  dir: "ltr",
  placeholder: t.phonePlaceholder,
} as const;

export const emailProps = {
  type: "email",
  inputMode: "email",
  dir: "ltr",
  placeholder: t.emailPlaceholder,
} as const;

/** Shop name, city, address, phone and email (create and edit forms). */
export function ShopFields({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField<ShopFieldsValues>
        name="name"
        id={`${idPrefix}-name`}
        label={t.name}
        className="sm:col-span-2"
        inputProps={{
          placeholder: t.namePlaceholder,
          autoComplete: "organization",
        }}
      />
      <TextField<ShopFieldsValues>
        name="city"
        id={`${idPrefix}-city`}
        label={t.city}
        optional
        inputProps={{
          placeholder: t.cityPlaceholder,
          autoComplete: "address-level2",
        }}
      />
      <TextField<ShopFieldsValues>
        name="phone"
        id={`${idPrefix}-phone`}
        label={t.phone}
        inputProps={phoneProps}
      />
      <TextField<ShopFieldsValues>
        name="address"
        id={`${idPrefix}-address`}
        label={t.address}
        optional
        multiline
        className="sm:col-span-2"
        inputProps={{ placeholder: t.addressPlaceholder }}
      />
      <TextField<ShopFieldsValues>
        name="email"
        id={`${idPrefix}-email`}
        label={t.email}
        optional
        className="sm:col-span-2"
        inputProps={emailProps}
      />
    </div>
  );
}

/** One titled block of a form (Shop, Owner). */
export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-5 flex flex-col gap-1">
        <span className="font-heading text-lg font-bold">{title}</span>
        {hint ? (
          <span className="text-muted-foreground text-sm">{hint}</span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}

/** Error that isn't about one field (network, server). */
export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="bg-destructive-soft border-destructive-border text-destructive flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold"
    >
      <AlertCircle aria-hidden className="mt-px size-4 flex-none" />
      {message}
    </div>
  );
}
