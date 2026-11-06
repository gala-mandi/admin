import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { makeQueryClient } from "@/lib/query-client";
import { useSessionStore } from "@/stores/session";
import {
  fakeAdapter,
  httpError,
  ok,
  sessionFor,
  superAdmin,
} from "@/test/fake-api";
import { plan, planList, proPlan, trialPlan } from "../test-data";
import type { Plan } from "../types";
import { PlansList } from "./plans-list";

const defaultAdapter = api.defaults.adapter;

type Handler = (
  config: InternalAxiosRequestConfig,
) => ReturnType<typeof ok> | Error | undefined;

/** A fake `/admin/plans` holding `initial`; `handler` may answer first. */
function serve(initial: Plan[], handler?: Handler) {
  let plans = [...initial];
  const calls: { method?: string; url?: string; data?: unknown }[] = [];
  const fake = fakeAdapter(async (config) => {
    calls.push({ method: config.method, url: config.url, data: config.data });
    const custom = handler?.(config);
    if (custom instanceof Error) throw custom;
    if (custom) return custom;
    const url = config.url ?? "";
    const body = config.data ? JSON.parse(config.data as string) : {};
    if (config.method === "get" && url === "/admin/plans") {
      return ok(config, planList(plans));
    }
    if (config.method === "post" && url === "/admin/plans") {
      const created = plan({
        ...body,
        id: "p-new",
        priceMonthly: `${body.priceMonthly}.00`,
        shopCount: 0,
      });
      plans = [...plans, created];
      return ok(config, created, 201);
    }
    const id = /^\/admin\/plans\/([^/]+)$/.exec(url)?.[1];
    if (config.method === "patch" && id) {
      plans = plans.map((p) => (p.id === id ? { ...p, ...body } : p));
      return ok(
        config,
        plans.find((p) => p.id === id),
      );
    }
    if (config.method === "delete" && id) {
      const target = plans.find((p) => p.id === id)!;
      const off = { ...target, isActive: false };
      plans = plans.map((p) => (p.id === id ? off : p));
      return ok(config, { result: "deactivated", plan: off });
    }
    throw httpError(config, 404);
  });
  api.defaults.adapter = fake.adapter;
  return { calls };
}

function renderList() {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter hasMemory>
        <QueryClientProvider client={client}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );
  }
  render(<PlansList />, { wrapper: Wrapper });
}

const rowOf = async (name: string) =>
  (await screen.findByRole("button", { name })).closest("tr")!;

describe("PlansList", { timeout: 20_000 }, () => {
  beforeEach(() => {
    useSessionStore.getState().setSession(sessionFor(superAdmin));
  });
  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("lists plans with price in rupees, limits, shops and status", async () => {
    serve([trialPlan, plan(), proPlan]);
    renderList();

    const basic = await rowOf("Basic");
    expect(within(basic).getByText("Rs 2,500.00")).toBeInTheDocument();
    expect(within(basic).getByText("Active")).toBeInTheDocument();
    const trial = await rowOf("Trial");
    expect(within(trial).getByText("Free")).toBeInTheDocument();
    expect(within(trial).getByText("New shops")).toBeInTheDocument();
    expect(screen.getByTestId("plans-result-count")).toHaveTextContent(
      "3 plans",
    );
    expect(screen.getByText(/placeholders/)).toBeInTheDocument();
  });

  it("creates a plan: validates, sends the price as a string", async () => {
    const fake = serve([trialPlan]);
    renderList();
    await rowOf("Trial");

    fireEvent.click(screen.getAllByRole("button", { name: "New plan" })[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create plan" }),
    );
    expect(
      await within(dialog).findByText("Enter the plan name"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Enter the monthly price (0 for free)"),
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Plan name"), {
      target: { value: "Gold" },
    });
    fireEvent.change(within(dialog).getByLabelText("Max users"), {
      target: { value: "8" },
    });
    fireEvent.change(within(dialog).getByLabelText("Price per month (Rs)"), {
      target: { value: "12.345" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create plan" }),
    );
    expect(
      await within(dialog).findByText(/up to 2 decimals/),
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Price per month (Rs)"), {
      target: { value: "3500" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create plan" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const post = fake.calls.find((c) => c.method === "post");
    expect(JSON.parse(post!.data as string)).toEqual({
      name: "Gold",
      maxUsers: 8,
      maxBranches: 1,
      priceMonthly: "3500",
      isActive: true,
    });
    expect(await rowOf("Gold")).toBeInTheDocument();
  });

  it("shows PLAN_NAME_TAKEN on the name field", async () => {
    serve([trialPlan], (config) =>
      config.method === "post"
        ? httpError(config, 409, {
            code: "PLAN_NAME_TAKEN",
            message: "A plan with this name already exists",
          })
        : undefined,
    );
    renderList();
    await rowOf("Trial");
    fireEvent.click(screen.getAllByRole("button", { name: "New plan" })[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Plan name"), {
      target: { value: "trial" },
    });
    fireEvent.change(within(dialog).getByLabelText("Max users"), {
      target: { value: "3" },
    });
    fireEvent.change(within(dialog).getByLabelText("Price per month (Rs)"), {
      target: { value: "0" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create plan" }),
    );
    expect(
      await within(dialog).findByText("A plan with this name already exists"),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Plan name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("edits a plan and sends only what changed", async () => {
    const fake = serve([plan()]);
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Basic" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Basic" });
    fireEvent.change(within(dialog).getByLabelText("Max users"), {
      target: { value: "7" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const patch = fake.calls.find((c) => c.method === "patch");
    expect(patch!.url).toBe("/admin/plans/p-basic");
    expect(JSON.parse(patch!.data as string)).toEqual({ maxUsers: 7 });
  });

  it("the Trial plan: name read-only, can't be turned off, no Delete", async () => {
    serve([trialPlan]);
    renderList();
    const row = await rowOf("Trial");
    fireEvent.pointerDown(
      within(row).getByRole("button", { name: /Actions for Trial/ }),
      { button: 0, ctrlKey: false },
    );
    const menu = await screen.findByRole("menu");
    expect(
      within(menu).queryByRole("menuitem", { name: "Delete" }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Plan name")).toHaveAttribute(
      "readonly",
    );
    expect(
      within(dialog).getByRole("checkbox", {
        name: "Available for new subscriptions",
      }),
    ).toBeDisabled();
  });

  it("delete of a used plan turns it off (row stays, Inactive)", async () => {
    const fake = serve([plan()]);
    renderList();
    const row = await rowOf("Basic");
    fireEvent.pointerDown(
      within(row).getByRole("button", { name: /Actions for Basic/ }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Delete",
      }),
    );
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("4 shops are on it");
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Delete plan" }),
    );
    await waitFor(() =>
      expect(fake.calls.some((c) => c.method === "delete")).toBe(true),
    );
    await waitFor(async () =>
      expect(within(await rowOf("Basic")).getByText("Inactive")).toBeVisible(),
    );
  });

  it("403 shows the forbidden state", async () => {
    serve([], (config) => httpError(config, 403));
    renderList();
    expect(
      await screen.findByRole("heading", { name: /access/i }),
    ).toBeInTheDocument();
  });
});
