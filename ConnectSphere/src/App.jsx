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
  const [page, setPage]           = useState("login");
  // profileUserId = null means own profile, otherwise visiting another user
  const [profileUserId, setProfileUserId] = useState(null);

  useEffect(() => {
    if (!loading) setPage(user ? "feed" : "login");
  }, [loading, user]);

  // navigate("profile") = own profile
  // navigate("profile", 42) = user 42's profile
  const navigate = (p, userId = null) => {
    if (p === "logout") { logout().then(() => setPage("login")); return; }
    if (p === "profile") setProfileUserId(userId);
    setPage(p);
  };

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16 }}>
        <div style={{ fontSize:48 }}>🌐</div>
        <p style={{ color:"var(--text-secondary)" }}>Loading ConnectSphere…</p>
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
      case "explore":       return <Explore onNavigate={navigate} />;
      case "notifications": return <Notifications onNavigate={navigate} />;
      case "profile":       return (
        <Profile
          onNavigate={navigate}
          viewUserId={profileUserId}   // null = own profile
        />
      );
      case "admin":
      case "admin-users":
      case "admin-broadcast":
      case "admin-logs":    return <AdminDashboard onNavigate={navigate} />;
      default:
        return (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"80vh", flexDirection:"column", gap:16 }}>
            <div style={{ fontSize:64 }}>🚧</div>
            <h2>Coming Soon</h2>
            <p style={{ color:"var(--text-secondary)" }}>This page is under construction</p>
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