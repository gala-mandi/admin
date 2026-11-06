import { z } from "zod";
import { normalizePhone } from "@/features/auth/schemas";
import { shopFormText, subscriptionDialogText } from "./text";
import type {
  AssignSubscriptionInput,
  CreateTenantInput,
  UpdateTenantInput,
} from "./types";

const e = shopFormText.errors;

const emailCheck = z.email();

const phone = z
  .string()
  .trim()
  .min(1, e.phoneRequired)
  .refine((v) => normalizePhone(v) !== null, e.phoneInvalid);

const optionalEmail = z
  .string()
  .trim()
  .max(160, e.emailLong)
  .refine((v) => v === "" || emailCheck.safeParse(v).success, e.emailInvalid);

const personName = (required: string) =>
  z.string().trim().min(1, required).min(2, e.nameShort).max(120, e.nameLong);

/** Shop fields, shared by the create and edit forms. */
export const shopFieldsSchema = z.object({
  name: personName(e.nameRequired),
  city: z.string().trim().max(80, e.cityLong),
  address: z.string().trim().max(255, e.addressLong),
  phone,
  email: optionalEmail,
});
export type ShopFieldsValues = z.infer<typeof shopFieldsSchema>;

export const createShopSchema = shopFieldsSchema.extend({
  owner: z.object({
    name: personName(e.ownerNameRequired),
    phone,
    email: optionalEmail,
  }),
});
export type CreateShopValues = z.infer<typeof createShopSchema>;

export const emptyShopFields: ShopFieldsValues = {
  name: "",
  city: "",
  address: "",
  phone: "",
  email: "",
};

export const emptyCreateShop: CreateShopValues = {
  ...emptyShopFields,
  owner: { name: "", phone: "", email: "" },
};

/** Every field name the forms can show a server error on. */
export const shopFormFields = [
  "name",
  "city",
  "address",
  "phone",
  "email",
  "owner.name",
  "owner.phone",
  "owner.email",
] as const;
export type ShopFormField = (typeof shopFormFields)[number];

const orUndefined = (v: string) => (v === "" ? undefined : v);
const orNull = (v: string) => (v === "" ? null : v);

/** Phones are sent as typed; the server normalises them. Empty → left out. */
export function toCreateInput(values: CreateShopValues): CreateTenantInput {
  return {
    name: values.name,
    city: orUndefined(values.city),
    address: orUndefined(values.address),
    phone: values.phone,
    email: orUndefined(values.email),
    owner: {
      name: values.owner.name,
      phone: values.owner.phone,
      email: orUndefined(values.owner.email),
    },
  };
}

/** Empty optional fields are sent as `null`, which clears them. */
export function toUpdateInput(values: ShopFieldsValues): UpdateTenantInput {
  return {
    name: values.name,
    city: orNull(values.city),
    address: orNull(values.address),
    phone: values.phone,
    email: orNull(values.email),
  };
}

const sub = subscriptionDialogText.errors;
const day = z
  .string()
  .trim()
  .min(1, sub.dateRequired)
  .regex(/^\d{4}-\d{2}-\d{2}$/, sub.dateInvalid);

/** Extend: a new end date after the current one, not before today. */
export function extendSubscriptionSchema(currentEndsOn: string, today: string) {
  return z.object({
    endsOn: day
      .refine((v) => v > currentEndsOn, sub.endAfterCurrent)
      .refine((v) => v >= today, sub.endNotPast),
  });
}
export type ExtendSubscriptionValues = z.infer<
  ReturnType<typeof extendSubscriptionSchema>
>;

/** Assign: plan, start and end dates (end not before today) and grace days. */
export function assignSubscriptionSchema(today: string) {
  return z
    .object({
      planId: z.string().min(1, sub.planRequired),
      startsOn: day,
      endsOn: day.refine((v) => v >= today, sub.endNotPast),
      graceDays: z
        .string()
        .trim()
        .regex(/^\d{1,2}$/, sub.graceInvalid)
        .refine((v) => Number(v) <= 90, sub.graceInvalid),
    })
    .refine((v) => v.endsOn >= v.startsOn, {
      path: ["endsOn"],
      message: sub.endAfterStart,
    });
}
export type AssignSubscriptionValues = z.infer<
  ReturnType<typeof assignSubscriptionSchema>
>;

export function toAssignInput(
  values: AssignSubscriptionValues,
): AssignSubscriptionInput {
  return {
    planId: values.planId,
    startsOn: values.startsOn,
    endsOn: values.endsOn,
    graceDays: Number(values.graceDays),
  };
}
