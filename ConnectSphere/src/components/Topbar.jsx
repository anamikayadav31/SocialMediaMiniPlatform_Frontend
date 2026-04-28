import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { postApi, userApi } from "../services/api";

export default function Topbar({ title, onNavigate }) {
  // FIX: useAuth se real user lo — was hardcoded "A"
  const { user } = useAuth();
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);

  // FIX: Search actually calls API now — was just a dead input
  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);

    if (!val.trim() || val.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    setShowResults(true);
    try {
      // Search both posts and users in parallel
      const [posts, users] = await Promise.allSettled([
        postApi.search(val.trim()),
        userApi.search(val.trim()),
      ]);

      const postResults = (posts.status === "fulfilled" && Array.isArray(posts.value))
        ? posts.value.slice(0, 3).map(p => ({ type: "post", id: p.postId, label: p.content?.slice(0, 60) + "…" }))
        : [];

      const userResults = (users.status === "fulfilled" && Array.isArray(users.value))
        ? users.value.slice(0, 3).map(u => ({ type: "user", id: u.userId, label: `@${u.userName} — ${u.fullName}` }))
        : [];

      setResults([...userResults, ...postResults]);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleBlur = () => {
    // Small delay so click on result registers before blur hides it
    setTimeout(() => setShowResults(false), 150);
  };

  // Avatar initials from real user
  const initials = user?.userName?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="topbar">
      <div className="page-title" style={{ fontSize: 18, marginRight: 8 }}>{title}</div>

      {/* FIX: Search now calls postApi.search + userApi.search */}
      <div className="search-bar" style={{ position: "relative" }}>
        <span className="search-icon">🔍</span>
        <input
          placeholder="Search posts, people, hashtags..."
          value={query}
          onChange={handleSearch}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={handleBlur}
        />

        {/* Search results dropdown */}
        {showResults && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-elevated, var(--color-background-secondary))",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 999,
            overflow: "hidden",
            minWidth: 280,
          }}>
            {searching && (
              <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)" }}>
                Searching…
              </div>
            )}
            {!searching && results.length === 0 && (
              <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)" }}>
                No results found
              </div>
            )}
            {!searching && results.map((r, i) => (
              <div key={i}
                style={{
                  padding: "9px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseDown={() => {
                  setQuery("");
                  setShowResults(false);
                  if (r.type === "user") onNavigate("profile");
                  else onNavigate("explore");
                }}>
                <span style={{ fontSize: 14 }}>{r.type === "user" ? "👤" : "📝"}</span>
                <span className="truncate">{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <div className="icon-btn tooltip" data-tip="Notifications"
          onClick={() => onNavigate("notifications")}>
          🔔
          <span className="notif-dot" />
        </div>
        <div className="icon-btn tooltip" data-tip="Messages">💬</div>

        {/* FIX: Real user initial instead of hardcoded "A" */}
        <div className="avatar avatar-sm"
          style={{ cursor: "pointer", background: "linear-gradient(135deg,#6C3FF5,#F5A623)" }}
          onClick={() => onNavigate("profile")}>
          {initials}
        </div>
      </div>
    </div>
  );
}