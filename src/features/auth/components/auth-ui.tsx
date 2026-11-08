"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { passwordText } from "../text";

/** The white card every auth screen sits in. */
export function AuthCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-card shadow-card flex w-full max-w-[420px] min-w-0 flex-col gap-5 px-6 pt-10 pb-7 sm:px-9",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeading({
  title,
  description,
  ur,
  id,
  size = "lg",
}: {
  title: ReactNode;
  description?: ReactNode;
  ur?: string;
  id?: string;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2
        id={id}
        className={cn(
          "font-heading font-extrabold tracking-tight",
          size === "lg" ? "text-3xl" : "text-[26px]",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground text-[15px]/relaxed">
          {description}
        </p>
      ) : null}
      {ur ? <UrduLine>{ur}</UrduLine> : null}
    </div>
  );
}

export function UrduLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      lang="ur"
      dir="rtl"
      className={cn(
        "font-urdu text-muted-foreground text-[13px]/loose",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Big gradient button. `ur` adds the Urdu label after a dot, as in the designs. */
export function PrimaryButton({
  children,
  ur,
  pending,
  className,
  ...props
}: ComponentProps<typeof Button> & { ur?: string; pending?: boolean }) {
  return (
    <Button
      className={cn(
        // The label and its Urdu line wrap on a narrow phone instead of
        // pushing the card wider than the screen.
        "rounded-button from-primary to-primary-to text-primary-foreground shadow-button h-auto min-h-[52px] w-full flex-wrap gap-x-2.5 gap-y-0 bg-linear-90 py-2 text-base font-bold whitespace-normal hover:opacity-95 disabled:opacity-60",
        "focus-visible:ring-ring/15 focus-visible:ring-4",
        className,
      )}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : null}
      {children}
      {ur && !pending ? (
        <>
          <span aria-hidden>·</span>
          <span lang="ur" className="font-urdu text-[15px] font-semibold">
            {ur}
          </span>
        </>
      ) : null}
    </Button>
  );
}

export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-link focus-visible:ring-ring/15 rounded-sm text-[13px] font-semibold hover:underline focus-visible:ring-4 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

const fieldGroupClass =
  "h-[50px] rounded-field bg-card has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/15";

/** Input with a leading icon, 50px tall as in the designs. */
export function IconInput({
  icon,
  end,
  className,
  ...props
}: ComponentProps<"input"> & { icon?: ReactNode; end?: ReactNode }) {
  return (
    <InputGroup className={cn(fieldGroupClass, className)}>
      {icon ? (
        <InputGroupAddon className="text-muted-foreground ps-3.5 [&>svg]:size-[18px]">
          {icon}
        </InputGroupAddon>
      ) : null}
      <InputGroupInput className="text-[15px] md:text-[15px]" {...props} />
      {end ? <InputGroupAddon align="inline-end">{end}</InputGroupAddon> : null}
    </InputGroup>
  );
}

/** Password input with a show/hide button. */
export function PasswordInput(props: ComponentProps<typeof IconInput>) {
  const [visible, setVisible] = useState(false);
  return (
    <IconInput
      {...props}
      type={visible ? "text" : "password"}
      end={
        <InputGroupButton
          size="icon-sm"
          aria-label={visible ? passwordText.hide : passwordText.show}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          // 44px to tap on a phone, 40px as designed from `sm` up.
          className="size-11 rounded-[10px] sm:size-10"
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </InputGroupButton>
      }
    />
  );
}

export const fieldLabelClass = "text-[13px] font-semibold text-foreground/85";
