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
  // FIX: Topbar search se Explore pe query pass karne ke liye
  const [exploreQuery, setExploreQuery]   = useState("");

  useEffect(() => {
    if (!loading) setPage(user ? "feed" : "login");
  }, [loading, user]);

  // FIX: navigate ab 3rd param accept karta hai — exploreQuery
  // navigate("explore", null, "#sun")  →  Explore khulega aur #sun search ho jaayega
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
      // FIX: exploreQuery pass kar do Explore ko — Topbar search se aaya query
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