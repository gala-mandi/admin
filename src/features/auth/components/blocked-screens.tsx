import { Lock } from "lucide-react";
import { blockedText } from "../text";
import { AuthCard, TextLink, UrduLine } from "./auth-ui";

/** 4.2 Account disabled (403 `ACCOUNT_DISABLED`). */
export function AccountDisabled() {
  const t = blockedText.accountDisabled;
  return (
    <AuthCard className="items-center gap-[18px] p-6 text-center sm:p-9">
      <div className="relative size-[84px]">
        <div className="bg-surface-muted text-foreground/70 flex size-[84px] items-center justify-center rounded-full">
          <Lock aria-hidden className="size-8" />
        </div>
        <div className="bg-destructive border-card absolute -end-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full border-4">
          <span aria-hidden className="h-0.5 w-3 rounded bg-white" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[26px] font-extrabold tracking-tight">
          {t.title}
        </h2>
        <p className="text-muted-foreground text-[14.5px]/relaxed">{t.body}</p>
        <UrduLine>{t.ur}</UrduLine>
      </div>
      <div className="bg-background text-foreground/85 w-full rounded-xl px-3.5 py-3 text-start text-[13px]/normal">
        {t.hint} <strong className="text-foreground">{t.hintPath}</strong>.
      </div>
      <TextLink href="/login">{t.back}</TextLink>
    </AuthCard>
  );
}
