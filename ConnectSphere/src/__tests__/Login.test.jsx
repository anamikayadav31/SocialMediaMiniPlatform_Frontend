/**
 * Login page – component tests
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "../pages/Login";

// ── Mock AuthContext ───────────────────────────────────────────────────────────
const mockLogin = jest.fn();
const mockGoogleLogin = jest.fn();

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin, googleLogin: mockGoogleLogin }),
}));

// ─────────────────────────────────────────────────────────────────────────────
const onNavigate = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════════
describe("Login – rendering", () => {
  test("renders the email and password inputs", () => {
    render(<Login onNavigate={onNavigate} />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  test("renders Sign In button", () => {
    render(<Login onNavigate={onNavigate} />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  test("renders link to Register page", () => {
    render(<Login onNavigate={onNavigate} />);
    expect(screen.getByText("Sign up free")).toBeInTheDocument();
  });

  test("renders brand name ConnectSphere", () => {
    render(<Login onNavigate={onNavigate} />);
    expect(screen.getByText("ConnectSphere")).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Login – form interaction", () => {
  test("email input updates on change", () => {
    render(<Login onNavigate={onNavigate} />);
    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    expect(emailInput.value).toBe("test@test.com");
  });

  test("password input updates on change", () => {
    render(<Login onNavigate={onNavigate} />);
    const passInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(passInput, { target: { value: "secret123" } });
    expect(passInput.value).toBe("secret123");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Login – submit", () => {
  test("calls login() and navigates to feed on success", async () => {
    mockLogin.mockResolvedValue({});
    render(<Login onNavigate={onNavigate} />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form"));
    });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("feed"));
    expect(mockLogin).toHaveBeenCalledWith({ email: "user@test.com", password: "password" });
  });

  test("shows error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    render(<Login onNavigate={onNavigate} />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "bad@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrong" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form"));
    });

    await waitFor(() =>
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument(),
    );
    expect(onNavigate).not.toHaveBeenCalledWith("feed");
  });

  test("shows 'Signing in…' while request is in flight", async () => {
    let resolveLogin;
    mockLogin.mockReturnValue(new Promise((r) => { resolveLogin = r; }));
    render(<Login onNavigate={onNavigate} />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "pass" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form"));

    expect(await screen.findByText("Signing in…")).toBeInTheDocument();
    await act(async () => {
      resolveLogin({});
    });
  });

  test("button is disabled while loading", async () => {
    let resolveLogin;
    mockLogin.mockReturnValue(new Promise((r) => { resolveLogin = r; }));
    render(<Login onNavigate={onNavigate} />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "pass" },
    });

    const btn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.submit(btn.closest("form"));

    await waitFor(() => expect(btn).toBeDisabled());
    await act(async () => {
      resolveLogin({});
    });
    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Login – navigation", () => {
  test("clicking 'Sign up free' navigates to register", () => {
    render(<Login onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Sign up free"));
    expect(onNavigate).toHaveBeenCalledWith("register");
  });
});
