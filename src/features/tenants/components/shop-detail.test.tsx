import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import {
  fakeAdapter,
  httpError,
  ok,
  sessionFor,
  superAdmin,
} from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { tenantDetail } from "../test-data";
import type { TenantDetail } from "../types";
import { ShopDetail } from "./shop-detail";

const defaultAdapter = api.defaults.adapter;

type Reply = (config: InternalAxiosRequestConfig) => unknown;

/** A fake server holding one shop; `onAction` overrides suspend/activate. */
function serve(initial: TenantDetail, onAction?: Reply) {
  let shop = initial;
  const fake = fakeAdapter(async (config) => {
    const url = config.url ?? "";
    if (config.method === "get" && url === "/admin/tenants/t1") {
      return ok(config, shop);
    }
    const action = /\/admin\/tenants\/t1\/(suspend|activate)$/.exec(url)?.[1];
    if (config.method === "post" && action) {
      const override = onAction?.(config);
      if (override instanceof Error) throw override;
      shop = {
        ...shop,
        status: action === "suspend" ? "suspended" : "active",
      };
      return ok(config, shop);
    }
    throw httpError(config, 404);
  });
  api.defaults.adapter = fake.adapter;
  return fake;
}

function renderDetail() {
  render(
    <TestProviders>
      <ShopDetail id="t1" />
    </TestProviders>,
  );
}

const actionCalls = (fake: ReturnType<typeof fakeAdapter>) =>
  fake.calls.filter((c) => /suspend|activate/.test(c.url ?? ""));

describe("ShopDetail", { timeout: 15_000 }, () => {
  beforeEach(() => {
    useSessionStore.getState().setSession(sessionFor(superAdmin));
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("shows the shop, its owner and the must-change-password note", async () => {
    serve(tenantDetail());
    renderDetail();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Al-Madina Traders",
      }),
    ).toBeInTheDocument();
    const shop = screen.getByRole("region", { name: "Shop details" });
    expect(shop).toHaveTextContent("Shop 12, Grain Market");
    expect(shop).toHaveTextContent("03001234567");
    expect(shop).toHaveTextContent("3 users");
    expect(shop).toHaveTextContent("27 Oct 2026");
    const owner = screen.getByRole("region", { name: "Owner" });
    expect(owner).toHaveTextContent("Haji Aslam");
    expect(owner).toHaveTextContent("03007654321");
    expect(owner).toHaveTextContent(
      "must change the temporary password at first sign-in",
    );
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/shops/t1/edit",
    );
  });

  it("suspends only after confirming, explaining what happens", async () => {
    const fake = serve(tenantDetail());
    renderDetail();

    fireEvent.click(
      await screen.findByRole("button", { name: "Suspend shop" }),
    );
    let dialog = screen.getByRole("alertdialog", {
      name: "Suspend Al-Madina Traders?",
    });
    expect(dialog).toHaveTextContent(
      "Its users are signed out within 15 minutes and can’t sign in until you activate it.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(actionCalls(fake)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Suspend shop" }));
    dialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Suspend shop" }),
    );

    expect(
      await screen.findByText("Al-Madina Traders is suspended"),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(actionCalls(fake).map((c) => c.url)).toEqual([
      "/admin/tenants/t1/suspend",
    ]);
    expect(
      screen.getByRole("region", { name: "Shop details" }),
    ).toHaveTextContent("Suspended");
    expect(
      screen.getByRole("button", { name: "Activate shop" }),
    ).toBeInTheDocument();
  });

  it("activates a suspended shop after confirming", async () => {
    const fake = serve(tenantDetail({ status: "suspended" }));
    renderDetail();

    fireEvent.click(
      await screen.findByRole("button", { name: "Activate shop" }),
    );
    const dialog = screen.getByRole("alertdialog", {
      name: "Activate Al-Madina Traders?",
    });
    expect(dialog).toHaveTextContent("Its users can sign in again");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Activate shop" }),
    );

    expect(
      await screen.findByText("Al-Madina Traders is active again"),
    ).toBeInTheDocument();
    expect(actionCalls(fake).map((c) => c.url)).toEqual([
      "/admin/tenants/t1/activate",
    ]);
    expect(
      screen.getByRole("button", { name: "Suspend shop" }),
    ).toBeInTheDocument();
  });

  it("keeps the dialog open with an error toast when the request fails", async () => {
    serve(tenantDetail(), (config) => httpError(config, 500, { message: "" }));
    renderDetail();

    fireEvent.click(
      await screen.findByRole("button", { name: "Suspend shop" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Suspend shop",
      }),
    );

    expect(
      await screen.findByText("Couldn’t suspend the shop. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows the panel's 404 for an unknown shop", async () => {
    api.defaults.adapter = fakeAdapter(async (config) => {
      throw httpError(config, 404);
    }).adapter;
    renderDetail();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("shows 403 when the server refuses", async () => {
    api.defaults.adapter = fakeAdapter(async (config) => {
      throw httpError(config, 403);
    }).adapter;
    renderDetail();

    expect(await screen.findByText("403")).toBeInTheDocument();
  });
});
