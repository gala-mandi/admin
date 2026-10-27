import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/lib/api-error";
import { shopFormText } from "./text";

const e = shopFormText.errors;

/** 409 codes the server sends without (or with) a field. */
const conflictFields: Record<string, { field: string; message: string }> = {
  PHONE_TAKEN: { field: "owner.phone", message: e.phoneTaken },
  EMAIL_TAKEN: { field: "owner.email", message: e.emailTaken },
};

/**
 * Puts the server's field errors (`400`, `409 PHONE_TAKEN`/`EMAIL_TAKEN`) on
 * the matching form fields and focuses the first one. Returns false when none
 * of them belong to this form, so the caller shows a general error instead.
 */
export function applyServerErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): boolean {
  const conflict = error.code ? conflictFields[error.code] : undefined;
  const entries =
    error.errors.length > 0
      ? error.errors.map(({ field, message }) => ({
          field,
          message:
            message ||
            (conflict && conflict.field === field ? conflict.message : "") ||
            error.message ||
            e.unknown,
        }))
      : conflict
        ? [conflict]
        : [];

  let applied = 0;
  for (const { field, message } of entries) {
    if (!fields.includes(field)) continue;
    setError(
      field as Path<T>,
      { type: "server", message },
      { shouldFocus: applied === 0 },
    );
    applied += 1;
  }
  return applied > 0;
}

/** Message for an error that isn't about one field. */
export function generalErrorMessage(error: ApiError): string {
  if (error.status === 0) return e.network;
  return error.message ?? e.unknown;
}
