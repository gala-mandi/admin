import { CircleAlert, FileQuestion, ShieldX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { panelRoutes } from "@/lib/routes";
import { panelText } from "../text";

function BackToDashboard({ label }: { label: string }) {
  return (
    <Button asChild size="lg">
      <Link href={panelRoutes.dashboard}>{label}</Link>
    </Button>
  );
}

/** 404 inside the panel layout (unknown URL or `notFound()`). */
export function NotFoundState() {
  const t = panelText.notFound;
  return (
    <EmptyState
      icon={FileQuestion}
      eyebrow={t.code}
      title={t.title}
      body={t.body}
      headingLevel="h1"
      action={<BackToDashboard label={t.back} />}
    />
  );
}

/** 403: shown by `RequirePermission` when the role may not open a page. */
export function ForbiddenState() {
  const t = panelText.forbidden;
  return (
    <EmptyState
      icon={ShieldX}
      eyebrow={t.code}
      title={t.title}
      body={t.body}
      headingLevel="h1"
      action={<BackToDashboard label={t.back} />}
    />
  );
}

/** Error boundary UI with a retry button. */
export function ErrorState({
  retry,
  digest,
}: {
  retry: () => void;
  digest?: string;
}) {
  const t = panelText.error;
  return (
    <EmptyState
      role="alert"
      icon={CircleAlert}
      title={t.title}
      headingLevel="h1"
      body={
        <>
          {t.body}
          {digest ? (
            <span className="mt-1 block text-xs">{t.reference(digest)}</span>
          ) : null}
        </>
      }
      action={
        <Button size="lg" variant="outline" onClick={retry}>
          {t.retry}
        </Button>
      }
    />
  );
}
