"use client";

import "./globals.css";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorState } from "@/features/panel/components/status-pages";
import { panelText } from "@/features/panel/text";
import { themeScript } from "@/lib/theme";

/** Last-resort boundary when the root layout itself fails. */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // No-op when Sentry is off.
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <title>{panelText.error.title}</title>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-4 font-sans">
        <div className="w-full max-w-lg">
          <ErrorState retry={retry} />
        </div>
      </body>
    </html>
  );
}
