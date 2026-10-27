"use client";

import { Copy, KeyRound, TriangleAlert } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { temporaryPasswordText as t } from "../text";

interface TemporaryPasswordDialogProps {
  shopName: string;
  ownerName: string;
  password: string;
  /** Called however the dialog closes; the caller forgets the password. */
  onDone: () => void;
}

/**
 * Shows the new owner's temporary password exactly once, with a copy button.
 * It is never written anywhere (no storage, URL or query cache).
 */
export function TemporaryPasswordDialog({
  shopName,
  ownerName,
  password,
  onDone,
}: TemporaryPasswordDialogProps) {
  const copyRef = useRef<HTMLButtonElement>(null);
  const inputId = "temporary-password";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onDone();
      }}
    >
      <AlertDialogContent
        className="data-[size=default]:sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          copyRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-success/10 text-success">
            <KeyRound aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle className="font-heading text-lg font-bold">
            {t.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.body(shopName, ownerName)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor={inputId} className="text-[13px] font-semibold">
            {t.label}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              readOnly
              value={password}
              dir="ltr"
              spellCheck={false}
              autoComplete="off"
              onFocus={(event) => event.currentTarget.select()}
              className="rounded-field bg-surface-muted focus-visible:ring-ring/15 h-11 min-w-0 flex-1 border px-3.5 font-mono text-base tracking-wider outline-none focus-visible:ring-4"
            />
            <Button
              ref={copyRef}
              type="button"
              variant="outline"
              className="h-11 gap-2 px-3.5"
              onClick={copy}
            >
              <Copy aria-hidden />
              {t.copy}
            </Button>
          </div>
        </div>

        <p
          role="note"
          className="bg-warning-soft text-warning flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]/relaxed font-medium"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 flex-none" />
          {t.warning}
        </p>

        <AlertDialogFooter>
          <AlertDialogAction>{t.done}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
