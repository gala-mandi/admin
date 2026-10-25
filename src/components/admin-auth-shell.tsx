import { Wheat } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { brandText, loginText } from "@/features/auth/text";

/** 4.3 layout: dark page over the wheat-field photo, centred column. */
export function AdminAuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-admin-bg text-admin-text relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <Image
        src="/images/wheat-field.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(15_13_22/0.55)_0%,rgb(15_13_22/0.96)_70%)]" />
      <main className="relative flex w-full max-w-[420px] flex-col gap-[22px]">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-primary flex size-10 items-center justify-center rounded-xl">
            <Wheat
              aria-hidden
              className="size-[22px] text-white"
              strokeWidth={1.8}
            />
          </div>
          <span className="font-heading text-[19px] font-extrabold">
            {brandText.name}
          </span>
          <span className="rounded-full border border-violet-300/30 bg-violet-300/15 px-2.5 py-1 text-[11px] font-bold tracking-wider text-violet-200 uppercase">
            {loginText.platform}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
