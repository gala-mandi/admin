import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { EditShop } from "./edit-shop-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const defaultAdapter = api.defaults.adapter;

function serve(patch: (body: unknown) => Error | null = () => null) {
  const bodies: unknown[] = [];
  api.defaults.adapter = fakeAdapter(async (config) => {
    if (config.method === "get") return ok(config, tenantDetail());
    const body = JSON.parse(config.data as string);
    bodies.push(body);
    const error = patch(body);
    if (error) throw error;
    return ok(config, tenantDetail({ ...body }));
  }).adapter;
  return bodies;
}

describe("EditShop", { timeout: 15_000 }, () => {
  beforeEach(() => {
    push.mockReset();
    useSessionStore.getState().setSession(sessionFor(superAdmin));
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    useSessionStore.getState().clear();
  });

  it("saves the shop fields with PATCH; emptied fields are cleared", async () => {
    const bodies = serve();
    render(
      <TestProviders>
        <EditShop id="t1" />
      </TestProviders>,
    );

    const name = await screen.findByLabelText("Shop name");
    expect(name).toHaveValue("Al-Madina Traders");
    fireEvent.change(name, { target: { value: "Madina Traders" } });
    fireEvent.change(screen.getByLabelText(/^Address/), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/shops/t1"));
    expect(bodies).toEqual([
      {
        name: "Madina Traders",
        city: "Okara",
        address: null,
        phone: "03001234567",
        email: "shop@example.com",
      },
    ]);
    expect(await screen.findByText("Shop details saved")).toBeInTheDocument();
  });

  it("shows the server's field error", async () => {
    serve(() =>
      httpError(undefined, 400, {
        errors: [{ field: "phone", message: "Phone is not valid" }],
      }),
    );
    render(
      <TestProviders>
        <EditShop id="t1" />
      </TestProviders>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Save changes" }),
    );

    expect(await screen.findByText("Phone is not valid")).toBeInTheDocument();
    expect(screen.getByLabelText("Shop phone")).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });
});
