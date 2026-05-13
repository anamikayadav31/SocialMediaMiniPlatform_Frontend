/**
 * AuthContext – unit tests
 * Tests the provider's state management and exposed methods.
 */
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import * as api from "../services/api";

// ── Mock the entire api module ────────────────────────────────────────────────
jest.mock("../services/api", () => ({
  getToken:     jest.fn(),
  getUser:      jest.fn(),
  clearSession: jest.fn(),
  authApi: {
    login:       jest.fn(),
    register:    jest.fn(),
    googleLogin: jest.fn(),
    logout:      jest.fn(),
  },
}));

// ── Helper: renders a child component that exposes AuthContext values ──────────
function TestConsumer({ onRender }) {
  const ctx = useAuth();
  onRender(ctx);
  return <div data-testid="consumer">{ctx.loading ? "loading" : ctx.user ? "logged-in" : "logged-out"}</div>;
}

function renderWithAuth(onRender) {
  return render(
    <AuthProvider>
      <TestConsumer onRender={onRender} />
    </AuthProvider>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════════
describe("AuthProvider – initial state", () => {
  test("shows logged-out when no token is stored", async () => {
    api.getToken.mockReturnValue(null);
    api.getUser.mockReturnValue(null);

    let ctx;
    renderWithAuth((c) => { ctx = c; });

    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(ctx.user).toBeNull();
    expect(screen.getByTestId("consumer")).toHaveTextContent("logged-out");
  });

  test("shows logged-in when valid token is stored", async () => {
    api.getToken.mockReturnValue("tok");
    api.getUser.mockReturnValue({ userId: 1, userName: "alice", fullName: "Alice", role: "User" });

    let ctx;
    renderWithAuth((c) => { ctx = c; });

    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(ctx.user?.userName).toBe("alice");
    expect(screen.getByTestId("consumer")).toHaveTextContent("logged-in");
  });

  test("clears user when token is missing even if user object exists", async () => {
    api.getToken.mockReturnValue(null);
    api.getUser.mockReturnValue({ userId: 1, userName: "ghost" });

    let ctx;
    renderWithAuth((c) => { ctx = c; });

    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(ctx.user).toBeNull();
    expect(api.clearSession).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("AuthProvider – login", () => {
  test("sets user state on successful login", async () => {
    api.getToken.mockReturnValue(null);
    api.getUser.mockReturnValue(null);
    api.authApi.login.mockResolvedValue({
      token: "new-tok", userId: 5, userName: "bob", fullName: "Bob Builder", role: "User",
    });

    let ctx;
    renderWithAuth((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => {
      await ctx.login({ email: "b@b.com", password: "pass" });
    });

    expect(ctx.user?.userName).toBe("bob");
    expect(ctx.user?.role).toBe("User");
  });

  test("propagates errors from authApi.login", async () => {
    api.getToken.mockReturnValue(null);
    api.getUser.mockReturnValue(null);
    api.authApi.login.mockRejectedValue(new Error("Bad credentials"));

    let ctx;
    renderWithAuth((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await expect(
      act(async () => { await ctx.login({ email: "x@x.com", password: "bad" }); })
    ).rejects.toThrow("Bad credentials");

    expect(ctx.user).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("AuthProvider – register", () => {
  test("sets user state on successful register", async () => {
    api.getToken.mockReturnValue(null);
    api.getUser.mockReturnValue(null);
    api.authApi.register.mockResolvedValue({
      token: "tok-r", userId: 6, userName: "carol", fullName: "Carol C", role: "User",
    });

    let ctx;
    renderWithAuth((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => { await ctx.register({ email: "c@c.com", password: "pass" }); });

    expect(ctx.user?.userName).toBe("carol");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("AuthProvider – logout", () => {
  test("clears user state after logout", async () => {
    api.getToken.mockReturnValue("tok");
    api.getUser.mockReturnValue({ userId: 1, userName: "alice", fullName: "Alice", role: "User" });
    api.authApi.logout.mockResolvedValue();

    let ctx;
    renderWithAuth((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => { await ctx.logout(); });

    expect(ctx.user).toBeNull();
    expect(ctx.token).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("AuthProvider – isAdmin", () => {
  test("isAdmin is true when role is Admin", async () => {
    api.getToken.mockReturnValue("tok");
    api.getUser.mockReturnValue({ userId: 1, userName: "admin", fullName: "Admin User", role: "Admin" });

    let ctx;
    renderWithAuth((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    expect(ctx.isAdmin).toBe(true);
  });

  test("isAdmin is false for regular User role", async () => {
    api.getToken.mockReturnValue("tok");
    api.getUser.mockReturnValue({ userId: 2, userName: "joe", fullName: "Joe", role: "User" });

    let ctx;
    renderWithAuth((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    expect(ctx.isAdmin).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("useAuth – outside provider guard", () => {
  test("throws when used outside AuthProvider", () => {
    // Suppress React's error boundary noise in test output
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer onRender={() => {}} />);
    }).toThrow("useAuth must be used inside <AuthProvider>");
    consoleSpy.mockRestore();
  });
});
