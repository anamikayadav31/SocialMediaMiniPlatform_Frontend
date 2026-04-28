import { useAuth } from "../context/AuthContext";

export default function Sidebar({ activePage, onNavigate, isAdmin = false }) {
  const { user, logout } = useAuth();

  const navItems = [
    { icon: "🏠", label: "Home Feed",     page: "feed" },
    { icon: "🔍", label: "Explore",       page: "explore" },
    { icon: "🔔", label: "Notifications", page: "notifications", badge: true },
    { icon: "👤", label: "My Profile",    page: "profile" },
  ];

  const adminItems = [
    { icon: "📊", label: "Dashboard",    page: "admin" },
    { icon: "👥", label: "Manage Users", page: "admin-users" },
    { icon: "📢", label: "Broadcast",    page: "admin-broadcast" },
    { icon: "📋", label: "Audit Logs",   page: "admin-logs" },
  ];

  const initials = user?.fullName
    ? user.fullName.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
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
            {item.badge && <span className="nav-badge">3</span>}
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
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600 }} className="truncate">{user?.fullName ?? "—"}</div>
          <div style={{ fontSize:12, color:"var(--text-muted)" }}>@{user?.userName ?? "—"}</div>
        </div>
        <span style={{ color:"var(--text-muted)", fontSize:18 }}>⋯</span>
      </div>
    </aside>
  );
}