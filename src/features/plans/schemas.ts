import { z } from "zod";
import { planFormText } from "./text";
import type { Plan, PlanInput } from "./types";

const e = planFormText.errors;

/** Whole-number field typed as text (counts, never money). */
const count = (max: number, maxMessage: string) =>
  z
    .string()
    .trim()
    .min(1, e.countRequired)
    .regex(/^\d+$/, e.countRequired)
    .refine((v) => Number(v) >= 1, e.countMin)
    .refine((v) => Number(v) <= max, maxMessage);

export const planFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, e.nameRequired)
    .min(2, e.nameShort)
    .max(60, e.nameLong),
  maxUsers: count(10_000, e.usersMax),
  maxBranches: count(1_000, e.branchesMax),
  // Money stays a string end to end; the server keeps 2 decimals.
  priceMonthly: z
    .string()
    .trim()
    .min(1, e.priceRequired)
    .regex(/^\d{1,12}(\.\d{1,2})?$/, e.priceInvalid),
  isActive: z.boolean(),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;

export const emptyPlanForm: PlanFormValues = {
  name: "",
  maxUsers: "",
  maxBranches: "1",
  priceMonthly: "",
  isActive: true,
};

export const planFormFields = [
  "name",
  "maxUsers",
  "maxBranches",
  "priceMonthly",
  "isActive",
] as const;

/** A saved plan as form values ("2500.00" stays as the server sent it). */
export function toPlanForm(plan: Plan): PlanFormValues {
  return {
    name: plan.name,
    maxUsers: String(plan.maxUsers),
    maxBranches: String(plan.maxBranches),
    priceMonthly: plan.priceMonthly,
    isActive: plan.isActive,
  };
}

export function toPlanInput(values: PlanFormValues): PlanInput {
  return {
    name: values.name,
    maxUsers: Number(values.maxUsers),
    maxBranches: Number(values.maxBranches),
    priceMonthly: values.priceMonthly,
    isActive: values.isActive,
  };
}

/** Only what changed, so an edit of the Trial plan never sends its name. */
export function changedPlanInput(
  plan: Plan,
  values: PlanFormValues,
): Partial<PlanInput> {
  const next = toPlanInput(values);
  const out: Partial<PlanInput> = {};
  if (next.name !== plan.name) out.name = next.name;
  if (next.maxUsers !== plan.maxUsers) out.maxUsers = next.maxUsers;
  if (next.maxBranches !== plan.maxBranches) out.maxBranches = next.maxBranches;
  if (next.priceMonthly !== plan.priceMonthly)
    out.priceMonthly = next.priceMonthly;
  if (next.isActive !== plan.isActive) out.isActive = next.isActive;
  return out;
}
