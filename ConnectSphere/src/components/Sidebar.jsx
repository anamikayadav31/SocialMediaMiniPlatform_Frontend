import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { notifApi } from "../services/api";

export default function Sidebar({ activePage, onNavigate, isAdmin = false }) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchedRef = useRef(false);
  const retryRef   = useRef(null);

  useEffect(() => {
    if (!user?.userId) {
      setUnreadCount(0);
      fetchedRef.current = false;
      return;
    }

    // FIX: Small delay to ensure token is fully persisted in localStorage
    // before the first API call fires (avoids race condition on login)
    const doFetch = async (attempt = 1) => {
      try {
        const d = await notifApi.getAll(user.userId);
        const list = Array.isArray(d) ? d : [];
        setUnreadCount(list.filter(n => !n.isRead).length);
        fetchedRef.current = true;
      } catch (err) {
        // 401 on first attempt — retry once after 1.5s (token might not be propagated yet)
        if (!fetchedRef.current && attempt === 1 && err.message?.includes("401")) {
          retryRef.current = setTimeout(() => doFetch(2), 1500);
        } else {
          // Silently ignore — don't show error badge, just show 0
          setUnreadCount(0);
        }
      }
    };

    // Small initial delay (100ms) for token to settle after login
    const initTimer = setTimeout(() => doFetch(), 100);
    return () => {
      clearTimeout(initTimer);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [user?.userId]);

  const navItems = [
    { icon: "🏠", label: "Home Feed",     page: "feed" },
    { icon: "🔍", label: "Explore",       page: "explore" },
    { icon: "🔔", label: "Notifications", page: "notifications", badge: unreadCount },
    { icon: "👤", label: "My Profile",    page: "profile" },
  ];

  const adminItems = [
    { icon: "👥", label: "Manage Users", page: "admin" },
  ];

  const initials = user?.fullName
    ? user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.userName?.[0]?.toUpperCase() ?? "?";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">ConnectSphere</div>
        <div className="logo-tagline">Share. Connect. Discover.</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div key={item.page}
            className={`nav-item ${activePage === item.page ? "active" : ""}`}
            onClick={() => onNavigate(item.page)}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </div>
        ))}

        {isAdmin && (
          <>
            <div className="nav-section-label" style={{ marginTop: 8 }}>Admin</div>
            {adminItems.map(item => (
              <div key={item.page}
                className={`nav-item admin-item ${activePage === item.page ? "active" : ""}`}
                onClick={() => onNavigate(item.page)}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </>
        )}

        <div className="nav-item" style={{ marginTop: 16, color: "#ED4956" }}
          onClick={() => logout().then(() => onNavigate("login"))}>
          <span className="nav-icon">🚪</span>
          <span>Logout</span>
        </div>
      </nav>

      <div className="sidebar-user" onClick={() => onNavigate("profile", null)}>
        <div className="avatar avatar-sm"
          style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">{user?.fullName ?? "—"}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{user?.userName ?? "—"}</div>
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: 18 }}>⋯</span>
      </div>
    </aside>
  );
}