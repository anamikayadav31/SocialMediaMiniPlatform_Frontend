import { useState, useEffect } from "react";
import "./styles/main.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Explore from "./pages/Explore";
import AdminDashboard from "./pages/AdminDashboard";

function AppInner() {
  const { user, loading, logout, isAdmin } = useAuth();
  const [page, setPage]               = useState("login");
  const [profileUserId, setProfileUserId] = useState(null);
  const [exploreQuery, setExploreQuery]   = useState("");

  // Initial load complete hone pe page set karo (sirf ek baar)
  useEffect(() => {
    if (!loading) setPage(user ? "feed" : "login");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Agar user null ho jaaye (explicit logout) toh login pe bhejo
  // BUT: sirf tab jab loading complete ho aur page feed/app tha
  useEffect(() => {
    if (!loading && !user && page !== "login" && page !== "register") setPage("login");
  }, [user, loading]);

  const navigate = (p, userId = null, query = "") => {
    if (p === "logout") { logout().then(() => setPage("login")); return; }
    if (p === "profile") setProfileUserId(userId);
    if (p === "explore") setExploreQuery(query);
    setPage(p);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🌐</div>
        <p style={{ color: "var(--text-secondary)" }}>Loading ConnectSphere…</p>
      </div>
    );
  }

  if (!user) {
    if (page === "register") return <Register onNavigate={navigate} />;
    return <Login onNavigate={navigate} />;
  }

  const renderPage = () => {
    switch (page) {
      case "feed":          return <Feed onNavigate={navigate} />;
      case "explore":       return <Explore onNavigate={navigate} initialQuery={exploreQuery} />;
      case "notifications": return <Notifications onNavigate={navigate} />;
      case "profile":       return (
        <Profile
          onNavigate={navigate}
          viewUserId={profileUserId}
        />
      );
      case "admin":
      case "admin-users":
      case "admin-broadcast":
      case "admin-logs":    return <AdminDashboard onNavigate={navigate} />;
      default:
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 64 }}>🚧</div>
            <h2>Coming Soon</h2>
            <p style={{ color: "var(--text-secondary)" }}>This page is under construction</p>
            <button className="btn btn-primary" onClick={() => navigate("feed")}>← Go Home</button>
          </div>
        );
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={navigate} isAdmin={isAdmin} />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}