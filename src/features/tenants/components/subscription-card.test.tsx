import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { plan, proPlan } from "@/features/plans/test-data";
import { api } from "@/lib/api";
import { addMonths, karachiToday } from "@/lib/format";
import { useSessionStore } from "@/stores/session";
import {
  fakeAdapter,
  httpError,
  ok,
  sessionFor,
  superAdmin,
} from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { subscriptionView, tenantDetail } from "../test-data";
import type { SubscriptionView, TenantDetail } from "../types";
import { ShopDetail } from "./shop-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/shops/t1",
}));

const defaultAdapter = api.defaults.adapter;
type Call = { method?: string; url?: string; body: Record<string, unknown> };

function serve(
  initial: TenantDetail,
  onWrite?: (config: InternalAxiosRequestConfig) => Error | undefined,
) {
  let shop = initial;
  const calls: Call[] = [];
  const fake = fakeAdapter(async (config) => {
    const url = config.url ?? "";
    const body = config.data ? JSON.parse(config.data as string) : {};
    calls.push({ method: config.method, url, body });
    if (config.method === "get" && url === "/admin/tenants/t1") {
      return ok(config, shop);
    }
    if (config.method === "get" && url === "/admin/plans") {
      return ok(config, {
        data: [plan(), proPlan],
        meta: { page: 1, limit: 100, total: 2 },
      });
    }
    if (url === "/admin/tenants/t1/subscription") {
      const failure = onWrite?.(config);
      if (failure) throw failure;
      const next: SubscriptionView =
        config.method === "patch"
          ? {
              ...shop.subscription!,
              endsOn: body.endsOn,
              state: "active",
              status: "active",
              daysLeft: 30,
            }
          : subscriptionView({
              id: "s2",
              plan: { ...subscriptionView().plan, id: "p-pro", name: "Pro" },
              endsOn: body.endsOn,
            });
      shop = { ...shop, subscription: next };
      return ok(config, next, config.method === "post" ? 201 : 200);
    }
    throw httpError(config, 404);
  });
  api.defaults.adapter = fake.adapter;
  return calls;
}

function renderDetail() {
  render(
    <TestProviders>
      <ShopDetail id="t1" />
    </TestProviders>,
  );
}

const card = async () =>
  (await screen.findByRole("heading", { name: "Plan", level: 2 })).closest(
    "section",
  )!;

describe("Shop plan card", { timeout: 20_000 }, () => {
  beforeEach(() => {
    useSessionStore.getState().setSession(sessionFor(superAdmin));
    // jsdom lacks these; the Radix select uses them.
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
  });
  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("shows plan, price, dates, users and days left", async () => {
    serve(tenantDetail());
    renderDetail();
    const section = await card();
    expect(within(section).getByTestId("subscription-plan")).toHaveTextContent(
      "Basic",
    );
    expect(section).toHaveTextContent("Rs 2,500.00 / month");
    expect(section).toHaveTextContent("1 Dec 2026");
    expect(section).toHaveTextContent("8 Dec 2026");
    expect(section).toHaveTextContent("3 of 5");
    expect(section).toHaveTextContent("25 days left.");
    expect(within(section).getByText("Active")).toBeInTheDocument();
  });

  it.each([
    [
      "grace",
      { state: "grace", graceDaysLeft: 4 } as const,
      "In grace",
      /4 more days of grace/,
    ],
    [
      "read-only",
      { state: "read_only", graceDaysLeft: 0 } as const,
      "Read-only",
      /can’t add or change anything/,
    ],
  ])("%s state is spelled out", async (_l, over, badge, hint) => {
    serve(tenantDetail({ subscription: subscriptionView(over) }));
    renderDetail();
    const section = await card();
    expect(within(section).getByText(badge)).toBeInTheDocument();
    expect(within(section).getByTestId("subscription-hint")).toHaveTextContent(
      hint,
    );
  });

  it("extend: quick pick sends the new end date; the card updates", async () => {
    const calls = serve(tenantDetail());
    renderDetail();
    fireEvent.click(
      within(await card()).getByRole("button", {
        name: "Assign / extend plan",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "+3 months" }));
    expect(within(dialog).getByLabelText("New end date")).toHaveValue(
      "2027-03-01",
    );
    expect(
      within(dialog).getByTestId("subscription-summary"),
    ).toHaveTextContent(
      "Full access until 1 Mar 2027; read-only after 8 Mar 2027.",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Extend plan" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(calls.find((c) => c.method === "patch")?.body).toEqual({
      endsOn: "2027-03-01",
    });
    expect(await card()).toHaveTextContent("1 Mar 2027");
  });

  it("extend: a date not after the current end is refused before sending", async () => {
    const calls = serve(tenantDetail());
    renderDetail();
    fireEvent.click(
      within(await card()).getByRole("button", {
        name: "Assign / extend plan",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("New end date"), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Extend plan" }),
    );
    expect(
      await within(dialog).findByText("Pick a date after the current end date"),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.method === "patch")).toBe(false);
  });

  it("change plan: picks a plan and sends plan, dates and grace", async () => {
    const calls = serve(tenantDetail());
    renderDetail();
    fireEvent.click(
      within(await card()).getByRole("button", {
        name: "Assign / extend plan",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("tab", { name: "Change plan" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Assign plan" }),
    );
    const trigger = within(dialog).getByRole("combobox", { name: "Plan" });
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-invalid", "true"),
    );
    await waitFor(() => expect(trigger).toBeEnabled());
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: /^Pro/ }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Assign plan" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const today = karachiToday();
    expect(calls.find((c) => c.method === "post")?.body).toEqual({
      planId: "p-pro",
      startsOn: today,
      endsOn: addMonths(today, 1),
      graceDays: 7,
    });
    expect(
      within(await card()).getByTestId("subscription-plan"),
    ).toHaveTextContent("Pro");
  });

  it("server field errors land on the field", async () => {
    serve(tenantDetail(), (config) =>
      httpError(config, 400, {
        message: "Validation failed",
        errors: [
          { field: "endsOn", message: "The end date must be today or later" },
        ],
      }),
    );
    renderDetail();
    fireEvent.click(
      within(await card()).getByRole("button", {
        name: "Assign / extend plan",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Extend plan" }),
    );
    expect(
      await within(dialog).findByText("The end date must be today or later"),
    ).toBeInTheDocument();
  });

  it("a shop without a plan offers only Assign", async () => {
    serve(tenantDetail({ subscription: null }));
    renderDetail();
    const section = await card();
    expect(section).toHaveTextContent("This shop has no plan");
    fireEvent.click(
      within(section).getByRole("button", { name: "Assign a plan" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("tab")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Assign plan" }),
    ).toBeInTheDocument();
  });
});
