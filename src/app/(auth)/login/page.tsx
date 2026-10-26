import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminAuthShell } from "@/components/admin-auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Super-admin sign in — Galla Mandi",
};

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

async function LoginWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  return <LoginForm reason={first(params.reason)} next={first(params.next)} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AdminAuthShell>
      <Suspense
        fallback={
          <div className="bg-admin-card h-[420px] animate-pulse rounded-[22px]" />
        }
      >
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
    </AdminAuthShell>
  );
}
