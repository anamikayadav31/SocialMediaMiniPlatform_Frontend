/**
 * Sidebar – component tests
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Sidebar from "../components/Sidebar";
import * as api from "../services/api";

// ── Mock AuthContext ──────────────────────────────────────────────────────────
const mockUser = { userId: 1, userName: "alice", fullName: "Alice Wonder", role: "User" };
const mockLogout = jest.fn().mockResolvedValue();

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

// ── Mock api module ───────────────────────────────────────────────────────────
jest.mock("../services/api", () => ({
  notifApi: { getAll: jest.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
const defaultProps = { activePage: "feed", onNavigate: jest.fn(), isAdmin: false };

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════════
describe("Sidebar – rendering", () => {
  test("renders app brand name", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("ConnectSphere")).toBeInTheDocument();
  });

  test("renders all navigation items", async () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Home Feed")).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  test("does NOT render admin section when isAdmin=false", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText("Manage Users")).not.toBeInTheDocument();
  });

  test("renders admin section when isAdmin=true", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} isAdmin={true} />);
    expect(screen.getByText("Manage Users")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  test("shows user fullName and username in the sidebar footer", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Alice Wonder")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
  });

  test("displays initials avatar correctly (first letters of first+last name)", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} />);
    // "Alice Wonder" → "AW"
    expect(screen.getByText("AW")).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Sidebar – active page highlighting", () => {
  test("feed nav item gets active class when activePage=feed", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} activePage="feed" />);
    const feedItem = screen.getByText("Home Feed").closest(".nav-item");
    expect(feedItem).toHaveClass("active");
  });

  test("explore nav item gets active class when activePage=explore", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} activePage="explore" />);
    const exploreItem = screen.getByText("Explore").closest(".nav-item");
    expect(exploreItem).toHaveClass("active");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Sidebar – navigation clicks", () => {
  test("calls onNavigate('feed') when Home Feed is clicked", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    const onNavigate = jest.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Home Feed"));
    expect(onNavigate).toHaveBeenCalledWith("feed");
  });

  test("calls onNavigate('explore') when Explore is clicked", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    const onNavigate = jest.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Explore"));
    expect(onNavigate).toHaveBeenCalledWith("explore");
  });

  test("calls onNavigate('notifications') when Notifications is clicked", () => {
    api.notifApi.getAll.mockResolvedValue([]);
    const onNavigate = jest.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Notifications"));
    expect(onNavigate).toHaveBeenCalledWith("notifications");
  });

  test("logout calls logout() then navigates to login", async () => {
    api.notifApi.getAll.mockResolvedValue([]);
    const onNavigate = jest.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Logout"));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("login"));
    expect(mockLogout).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Sidebar – notification badge", () => {
  test("shows unread badge count from API", async () => {
    api.notifApi.getAll.mockResolvedValue([
      { notifId: 1, isRead: false },
      { notifId: 2, isRead: false },
      { notifId: 3, isRead: true },
    ]);
    render(<Sidebar {...defaultProps} />);
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });

  test("shows no badge when all notifications are read", async () => {
    api.notifApi.getAll.mockResolvedValue([
      { notifId: 1, isRead: true },
      { notifId: 2, isRead: true },
    ]);
    render(<Sidebar {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });
  });

  test("shows no badge when API returns empty array", async () => {
    api.notifApi.getAll.mockResolvedValue([]);
    render(<Sidebar {...defaultProps} />);
    // Wait a tick for the effect to settle
    await waitFor(() => {
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });

  test("shows no badge on API failure (silent fallback)", async () => {
    api.notifApi.getAll.mockRejectedValue(new Error("Network error"));
    render(<Sidebar {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });
});
