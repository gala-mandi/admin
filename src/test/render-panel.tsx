import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PanelShell } from "@/features/panel/components/panel-shell";
import { makeQueryClient } from "@/lib/query-client";
import { useSessionStore } from "@/stores/session";
import { useUiStore } from "@/stores/ui";
import { superAdmin } from "./fake-api";

/** Everything `Providers` gives the app, with a fresh query client. */
export function TestProviders({ children }: { children: ReactNode }) {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

/** Renders the panel shell as a signed-in user. */
export function renderPanel(children: ReactNode = "page", user = superAdmin) {
  useSessionStore.getState().setSession({ accessToken: "token-1", user });
  return render(
    <TestProviders>
      <PanelShell>{children}</PanelShell>
    </TestProviders>,
  );
}

export function resetStores(): void {
  useSessionStore.getState().clear();
  useUiStore.setState({ theme: "system", sidebarOpen: true, hydrated: false });
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
}
