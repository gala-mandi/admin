import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { makeQueryClient } from "@/lib/query-client";
import { httpError } from "@/test/fake-api";
import { createTenant } from "../api";
import { tenantDetail } from "../test-data";
import type { CreateTenantResult } from "../types";
import { CreateShopForm } from "./create-shop-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("../api", () => ({ createTenant: vi.fn() }));

const PASSWORD = "Tmp-9fK2-xQ7w";
const created: CreateTenantResult = {
  tenant: tenantDetail({ id: "t9", name: "Al-Madina Traders" }),
  temporaryPassword: PASSWORD,
};

function renderForm() {
  const client = makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <CreateShopForm />
      <Toaster />
    </QueryClientProvider>,
  );
  return client;
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValid() {
  type("Shop name", "Al-Madina Traders");
  type(/^City/, "Okara");
  type("Shop phone", "0300-1234567");
  type("Owner name", "Haji Aslam");
  type("Owner phone", "0300 7654321");
}

const submitButton = () =>
  screen.getByRole("button", { name: /Create shop|Creating shop/ });

describe("CreateShopForm", { timeout: 15_000 }, () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createTenant).mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows field errors and sends nothing when the form is invalid", async () => {
    renderForm();

    fireEvent.click(submitButton());

    expect(await screen.findByText("Enter the shop name")).toBeInTheDocument();
    expect(screen.getByText("Enter the owner’s name")).toBeInTheDocument();
    expect(screen.getAllByText("Enter a phone number")).toHaveLength(2);
    expect(createTenant).not.toHaveBeenCalled();
  });

  it("checks phone and email formats", async () => {
    renderForm();
    fillValid();
    type("Owner phone", "12345");
    type(/^Owner email/, "not-an-email");

    fireEvent.click(submitButton());

    expect(
      await screen.findByText("Enter a mobile number like 0300 1234567"),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(createTenant).not.toHaveBeenCalled();
  });

  it("sends the shop and owner, leaving out empty optional fields", async () => {
    vi.mocked(createTenant).mockResolvedValue(created);
    renderForm();
    fillValid();

    fireEvent.click(submitButton());

    await waitFor(() => expect(createTenant).toHaveBeenCalledOnce());
    expect(vi.mocked(createTenant).mock.calls[0][0]).toEqual({
      name: "Al-Madina Traders",
      city: "Okara",
      address: undefined,
      phone: "0300-1234567",
      email: undefined,
      owner: { name: "Haji Aslam", phone: "0300 7654321", email: undefined },
    });
  });

  it("puts 400 field errors on the matching fields", async () => {
    vi.mocked(createTenant).mockRejectedValue(
      httpError(undefined, 400, {
        message: "Validation failed",
        errors: [
          { field: "name", message: "Name is too common" },
          { field: "owner.email", message: "Email domain not allowed" },
        ],
      }),
    );
    renderForm();
    fillValid();

    fireEvent.click(submitButton());

    expect(await screen.findByText("Name is too common")).toBeInTheDocument();
    expect(screen.getByText("Email domain not allowed")).toBeInTheDocument();
    expect(screen.getByLabelText("Shop name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("409 PHONE_TAKEN shows the error on the owner phone and focuses it", async () => {
    vi.mocked(createTenant).mockRejectedValue(
      httpError(undefined, 409, {
        code: "PHONE_TAKEN",
        message: "This phone already has an account",
        errors: [{ field: "owner.phone" }],
      }),
    );
    renderForm();
    fillValid();

    fireEvent.click(submitButton());

    const phone = screen.getByLabelText("Owner phone");
    await waitFor(() => expect(phone).toHaveAttribute("aria-invalid", "true"));
    expect(phone).toHaveAccessibleDescription(
      expect.stringContaining("This phone already has an account"),
    );
    expect(phone).toHaveFocus();
    expect(submitButton()).toBeEnabled();
  });

  it("409 EMAIL_TAKEN without field list still marks the owner email", async () => {
    vi.mocked(createTenant).mockRejectedValue(
      httpError(undefined, 409, { code: "EMAIL_TAKEN", message: "Taken" }),
    );
    renderForm();
    fillValid();
    type(/^Owner email/, "owner@example.com");

    fireEvent.click(submitButton());

    expect(
      await screen.findByText("This email already has an account"),
    ).toBeInTheDocument();
  });

  it("shows a general error when the server can't be reached", async () => {
    vi.mocked(createTenant).mockRejectedValue(new Error("Network Error"));
    renderForm();
    fillValid();

    fireEvent.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can’t reach the server",
    );
  });

  it("sends one request however often submit is pressed", async () => {
    let resolve!: (value: CreateTenantResult) => void;
    vi.mocked(createTenant).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderForm();
    fillValid();

    const form = submitButton().closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(submitButton()).toBeDisabled());
    fireEvent.submit(form);
    fireEvent.click(submitButton());

    expect(submitButton()).toHaveTextContent("Creating shop…");
    await act(async () => resolve(created));
    expect(createTenant).toHaveBeenCalledOnce();
  });

  it("shows the temporary password once, then forgets it", async () => {
    vi.mocked(createTenant).mockResolvedValue(created);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const client = renderForm();
    fillValid();

    fireEvent.click(submitButton());

    const dialog = await screen.findByRole("alertdialog", {
      name: "Shop created",
    });
    expect(screen.getByLabelText("Temporary password")).toHaveValue(PASSWORD);
    expect(dialog).toHaveTextContent("shown only now");
    expect(dialog).toHaveTextContent(
      "The owner must change it at first sign-in.",
    );
    expect(screen.getByRole("button", { name: "Copy password" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(PASSWORD));
    expect(await screen.findByText("Password copied")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "I’ve saved it, open the shop" }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(push).toHaveBeenCalledWith("/shops/t9");
    expect(document.body.innerHTML).not.toContain(PASSWORD);
    const cached = JSON.stringify([
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
      client
        .getMutationCache()
        .getAll()
        .map((m) => m.state.data),
    ]);
    expect(cached).not.toContain(PASSWORD);
    expect(cached).toContain("Al-Madina Traders");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
