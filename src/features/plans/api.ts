import { api } from "@/lib/api";
import type {
  Plan,
  PlanInput,
  PlanList,
  PlanListParams,
  PlanRemoved,
} from "./types";

const base = "/admin/plans";
const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

export async function listPlans(
  params: PlanListParams,
  signal?: AbortSignal,
): Promise<PlanList> {
  const { data } = await api.get<PlanList>(base, { params, signal });
  return data;
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  const { data } = await api.post<Plan>(base, input);
  return data;
}

export async function updatePlan(
  id: string,
  input: Partial<PlanInput>,
): Promise<Plan> {
  const { data } = await api.patch<Plan>(one(id), input);
  return data;
}

/** Deletes an unused plan; deactivates one shops have used. */
export async function removePlan(id: string): Promise<PlanRemoved> {
  const { data } = await api.delete<PlanRemoved>(one(id));
  return data;
}
