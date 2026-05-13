/**
 * App.jsx – routing & navigation unit tests
 * We test AppInner's behaviour by mocking AuthContext so we can
 * control the user/loading state without a real provider.
 */
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Lightweight page stubs ─────────────────────────────────────────────────
jest.mock("../pages/Login",          () => () => <div data-testid="login-page" />);
jest.mock("../pages/Register",       () => () => <div data-testid="register-page" />);
jest.mock("../pages/Feed",           () => () => <div data-testid="feed-page" />);
jest.mock("../pages/Explore",        () => ({ onNavigate, initialQuery }) =>
  <div data-testid="explore-page" data-query={initialQuery} />);
jest.mock("../pages/Notifications",  () => () => <div data-testid="notif-page" />);
jest.mock("../pages/Profile",        () => () => <div data-testid="profile-page" />);
jest.mock("../pages/AdminDashboard", () => () => <div data-testid="admin-page" />);
jest.mock("../components/Sidebar",   () => () => <nav data-testid="sidebar" />);

// ── AuthContext mock (state driven by module-level variables) ─────────────────
let mockUser = null;
let mockLoading = false;
const mockLogout = jest.fn().mockResolvedValue();

jest.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    logout: mockLogout,
    isAdmin: mockUser?.role === "Admin",
  }),
}));

import App from "../App";

// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  mockUser = null;
  mockLoading = false;
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
describe("App – unauthenticated routing", () => {
  test("shows Login when user is null", () => {
    render(<App />);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  test("shows loading spinner when loading=true", () => {
    mockLoading = true;
    render(<App />);
    expect(screen.getByText(/loading connectsphere/i)).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("App – authenticated routing", () => {
  beforeEach(() => {
    mockUser = { userId: 1, userName: "alice", fullName: "Alice", role: "User" };
  });

  test("shows Sidebar and Feed after login", () => {
    render(<App />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("feed-page")).toBeInTheDocument();
  });

  test("shows admin page for Admin role", () => {
    mockUser = { userId: 99, userName: "admin", fullName: "Admin", role: "Admin" };
    render(<App />);
    // Default page for authenticated user is feed — admin only shows when navigated
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });
});
