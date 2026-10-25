import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { httpError, owner, sessionFor, superAdmin } from "@/test/fake-api";
import { login, logout } from "../api";
import { LoginForm } from "./login-form";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("../api", () => ({ login: vi.fn(), logout: vi.fn() }));

function fill(identifier: string, password: string) {
  fireEvent.change(screen.getByLabelText("Work email or phone"), {
    target: { value: identifier },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

const submit = () =>
  fireEvent.click(
    screen.getByRole("button", { name: /sign in securely|try again/i }),
  );

describe("admin LoginForm", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(login).mockReset();
    vi.mocked(logout).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    useSessionStore.getState().clear();
  });

  it("shows field errors for empty fields and sends nothing", async () => {
    render(<LoginForm />);

    submit();

    expect(
      await screen.findByText("Enter your email or phone number"),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("rejects values that are too long", async () => {
    render(<LoginForm />);
    fill("a".repeat(161), "p".repeat(129));

    submit();

    expect(
      await screen.findByText("Use 160 characters or fewer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Use 128 characters or fewer")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in a super-admin and goes to the dashboard", async () => {
    vi.mocked(login).mockResolvedValue(sessionFor(superAdmin, "abc"));
    render(<LoginForm />);
    fill(" admin@gallamandi.pk ", "secret");

    submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(login).toHaveBeenCalledWith({
      identifier: "admin@gallamandi.pk",
      password: "secret",
    });
    expect(useSessionStore.getState().accessToken).toBe("abc");
  });

  it("rejects a shop user: clears the session, no logout call, shows the message", async () => {
    vi.mocked(login).mockResolvedValue(sessionFor(owner, "shop-token"));
    render(<LoginForm />);
    fill("03000000002", "secret");

    submit();

    expect(
      await screen.findByText("This account can't sign in to the admin panel"),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().accessToken).toBeNull();
    expect(useSessionStore.getState().user).toBeNull();
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the not-admin message from ?reason=not-admin", () => {
    render(<LoginForm reason="not-admin" />);

    expect(
      screen.getByText("This account can't sign in to the admin panel"),
    ).toBeInTheDocument();
  });

  it("shows the not-admin message when the shop is suspended (a shop account)", async () => {
    vi.mocked(login).mockRejectedValue(
      httpError(undefined, 403, { code: "TENANT_SUSPENDED" }),
    );
    render(<LoginForm />);
    fill("03000000002", "secret");

    submit();

    expect(
      await screen.findByText("This account can't sign in to the admin panel"),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes to the account-disabled page on 403 ACCOUNT_DISABLED", async () => {
    vi.mocked(login).mockRejectedValue(
      httpError(undefined, 403, { code: "ACCOUNT_DISABLED" }),
    );
    render(<LoginForm />);
    fill("admin@gallamandi.pk", "secret");

    submit();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/account-disabled"),
    );
  });

  it("shows the generic message on 401 with attempts left", async () => {
    vi.mocked(login).mockRejectedValue(
      httpError(
        undefined,
        401,
        { message: "Invalid credentials" },
        { "x-ratelimit-remaining": "3" },
      ),
    );
    render(<LoginForm />);
    fill("admin@gallamandi.pk", "wrong");

    submit();

    expect(
      await screen.findByText("Email or password is incorrect"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "3 attempts left before sign-in is paused for 1 minute.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows the locked state with a countdown on 429", async () => {
    vi.mocked(login).mockRejectedValue(
      httpError(
        undefined,
        429,
        { message: "Too many attempts. Try again in a minute." },
        {
          "retry-after": "60",
        },
      ),
    );
    render(<LoginForm />);
    fill("admin@gallamandi.pk", "wrong");

    submit();

    expect(
      await screen.findByRole("heading", { name: "Sign-in paused" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("01:00");
    expect(
      screen.getByRole("button", { name: "Try again in 1:00" }),
    ).toBeDisabled();
  });

  it("sends only one request on a double click", async () => {
    let resolve: (value: ReturnType<typeof sessionFor>) => void = () =>
      undefined;
    vi.mocked(login).mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LoginForm />);
    fill("admin@gallamandi.pk", "secret");

    const button = screen.getByRole("button", { name: /sign in securely/i });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    await act(async () => resolve(sessionFor(superAdmin)));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("shows the session-expired message", () => {
    render(<LoginForm reason="session-expired" />);

    expect(screen.getByText("Your session has ended")).toBeInTheDocument();
  });
});
