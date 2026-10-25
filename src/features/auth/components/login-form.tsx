"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Clock, Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  remainingAttempts,
  retryAfterSeconds,
  toApiError,
} from "@/lib/api-error";
import {
  blockedPageFor,
  homePathFor,
  NotSuperAdminError,
  notAdminPath,
  startSession,
} from "@/lib/auth-session";
import { safeNextPath } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { login } from "../api";
import {
  type LoginValues,
  loginSchema,
  maskIdentifier,
  normalizeIdentifier,
} from "../schemas";
import { loginText } from "../text";
import { LockedOut } from "./locked-out";

const t = loginText;

type Failure =
  | { kind: "credentials"; attemptsLeft: number | null }
  | { kind: "not-admin" }
  | { kind: "network" }
  | { kind: "unknown" };

interface Lock {
  id: number;
  seconds: number;
  who: string | null;
}

export interface LoginFormProps {
  /** `?reason=` from the URL: `session-expired` or `not-admin`. */
  reason?: string | null;
  /** `?next=` from the URL, only same-origin paths are used. */
  next?: string | null;
}

const inputClass =
  "h-12 rounded-field border-admin-border bg-admin-input px-3.5 text-[15px] text-admin-text placeholder:text-admin-muted/70 md:text-[15px] focus-visible:border-2 focus-visible:border-admin-focus focus-visible:ring-4 focus-visible:ring-admin-focus/20 aria-invalid:border-rose-400 aria-invalid:ring-rose-400/20";

function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: "error" | "info";
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-[14px] border px-4 py-3.5 text-sm",
        tone === "error"
          ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
          : "border-admin-border bg-admin-input text-admin-text",
      )}
    >
      <span className="mt-0.5 flex-none [&>svg]:size-5">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="font-bold">{title}</span>
        {children ? (
          <span className="text-admin-muted text-[13px]">{children}</span>
        ) : null}
      </div>
    </div>
  );
}

/** 4.3 Super-admin sign in, with wrong password, locked, session expired and not-admin states. */
export function LoginForm({ reason = null, next = null }: LoginFormProps) {
  const router = useRouter();
  const [failure, setFailure] = useState<Failure | null>(
    reason === "not-admin" ? { kind: "not-admin" } : null,
  );
  const [lock, setLock] = useState<Lock | null>(null);
  const [leaving, setLeaving] = useState(false);
  const inFlight = useRef(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const submit = async (values: LoginValues) => {
    setFailure(null);
    try {
      const session = await login({
        identifier: normalizeIdentifier(values.identifier),
        password: values.password,
      });
      // Throws NotSuperAdminError for shop users (no /auth/logout call).
      startSession(session);
      setLeaving(true);
      router.replace(homePathFor(session.user, safeNextPath(next)));
    } catch (error) {
      if (error instanceof NotSuperAdminError) {
        setFailure({ kind: "not-admin" });
        return;
      }
      const e = toApiError(error);
      const blocked = e.status === 403 ? blockedPageFor(e.code) : null;
      if (blocked === notAdminPath) {
        setFailure({ kind: "not-admin" });
      } else if (blocked) {
        setLeaving(true);
        router.replace(blocked);
      } else if (e.status === 401) {
        setFailure({ kind: "credentials", attemptsLeft: remainingAttempts(e) });
        form.setError("password", {
          type: "server",
          message: t.errors.capsLock,
        });
      } else if (e.status === 429) {
        setLock((prev) => ({
          id: (prev?.id ?? 0) + 1,
          seconds: retryAfterSeconds(e),
          who: maskIdentifier(values.identifier),
        }));
      } else if (e.status === 400 && e.errors.length > 0) {
        for (const { field, message } of e.errors) {
          if (field === "identifier" || field === "password") {
            form.setError(field, { type: "server", message });
          }
        }
      } else {
        setFailure({ kind: e.status === 0 ? "network" : "unknown" });
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A double click must never send two requests.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await form.handleSubmit(submit)(event);
    } finally {
      inFlight.current = false;
    }
  };

  const unlock = useCallback(() => setLock(null), []);

  if (lock) {
    return (
      <LockedOut
        lockId={lock.id}
        seconds={lock.seconds}
        who={lock.who}
        onUnlock={unlock}
      />
    );
  }

  const busy = form.formState.isSubmitting || leaving;

  return (
    <div className="bg-admin-card flex flex-col gap-[18px] rounded-[22px] border border-white/10 p-6 shadow-[0_32px_64px_-16px_rgb(0_0_0/0.6)] sm:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-[26px] font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="text-admin-muted text-sm">{t.subtitle}</p>
      </div>

      {reason === "session-expired" && !failure ? (
        <Notice
          tone="info"
          icon={<Clock className="text-admin-link" />}
          title={t.sessionExpired.title}
        >
          {t.sessionExpired.body}
        </Notice>
      ) : null}

      {failure ? (
        <Notice
          tone="error"
          icon={<AlertCircle className="text-rose-300" />}
          title={
            failure.kind === "credentials"
              ? t.errors.invalidCredentials
              : failure.kind === "not-admin"
                ? t.errors.notAdmin
                : failure.kind === "network"
                  ? t.errors.network
                  : t.errors.unknown
          }
        >
          {failure.kind === "credentials" && failure.attemptsLeft !== null
            ? t.errors.attemptsLeft(failure.attemptsLeft)
            : failure.kind === "not-admin"
              ? t.errors.notAdminHint
              : null}
        </Notice>
      ) : null}

      <form
        method="post"
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-[18px]"
      >
        <Controller
          name="identifier"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel
                htmlFor="ad-identifier"
                className="text-admin-label text-[13px] font-semibold"
              >
                {t.identifierLabel}
              </FieldLabel>
              <Input
                {...field}
                id="ad-identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder={t.identifierPlaceholder}
                className={inputClass}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error ? "ad-identifier-error" : undefined
                }
              />
              <FieldError
                id="ad-identifier-error"
                className="text-rose-300"
                errors={[fieldState.error]}
              />
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel
                htmlFor="ad-password"
                className="text-admin-label text-[13px] font-semibold"
              >
                {t.passwordLabel}
              </FieldLabel>
              <Input
                {...field}
                id="ad-password"
                type="password"
                autoComplete="current-password"
                placeholder={t.passwordPlaceholder}
                className={inputClass}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error ? "ad-password-error" : undefined
                }
              />
              <FieldError
                id="ad-password-error"
                className="text-rose-300"
                errors={[fieldState.error]}
              />
            </Field>
          )}
        />
        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy || undefined}
          className="rounded-button from-primary to-brand-to focus-visible:ring-admin-focus/30 h-[50px] w-full gap-2.5 bg-linear-90 text-base font-bold text-white hover:opacity-95 focus-visible:ring-4 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 aria-hidden className="size-5 animate-spin" />
          ) : null}
          {busy
            ? t.submitting
            : failure?.kind === "credentials"
              ? t.retry
              : t.submit}
        </Button>
      </form>

      <div className="flex gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-3 text-[12.5px]/normal text-amber-200">
        <ShieldAlert
          aria-hidden
          className="size-[18px] flex-none text-amber-300"
        />
        <span>{t.restricted}</span>
      </div>
    </div>
  );
}
