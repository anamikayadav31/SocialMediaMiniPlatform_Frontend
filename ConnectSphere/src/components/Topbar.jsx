import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { postApi, userApi, notifApi } from "../services/api";

export default function Topbar({ title, onNavigate }) {
  const { user } = useAuth();
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [showDrop,    setShowDrop]    = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const debounceRef = useRef(null);
  const pollRef     = useRef(null);
  const mountedRef  = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Poll notification count — ONLY when user is fully logged in
  useEffect(() => {
    if (!user?.userId) {
      setUnreadCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const d = await notifApi.getUnreadCount(user.userId);
        if (mountedRef.current) setUnreadCount(d?.unreadCount ?? 0);
      } catch {
        // Silently ignore errors — never trigger logout from here
      }
    };

    // Wait 3 seconds before first fetch (let token settle after login)
    const delay = setTimeout(fetchCount, 3000);
    // Then poll every 60 seconds
    pollRef.current = setInterval(fetchCount, 60000);

    return () => {
      clearTimeout(delay);
      clearInterval(pollRef.current);
    };
  }, [user?.userId]);

  const doSearch = async (q) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]); setShowDrop(false); return;
    }
    setSearching(true); setShowDrop(true);
    try {
      const isHashtag = q.startsWith("#");
      const sq = isHashtag ? q.slice(1) : q;
      const [p, u] = await Promise.allSettled([
        postApi.search(sq),
        isHashtag ? Promise.resolve([]) : userApi.search(sq),
      ]);
      const posts = p.status === "fulfilled" && Array.isArray(p.value)
        ? p.value.slice(0, 4).map(x => ({
            type:     "post",
            label:    x.content?.slice(0, 50) + (x.content?.length > 50 ? "…" : ""),
            sublabel: x.hashtags ? x.hashtags.split(",").slice(0, 3).join(" ") : "",
            id:       x.postId,
          }))
        : [];
      const users = u.status === "fulfilled" && Array.isArray(u.value)
        ? u.value.slice(0, 3).map(x => ({
            type:     "user",
            label:    x.fullName || x.userName,
            sublabel: `@${x.userName}`,
            id:       x.userId,
          }))
        : [];
      setResults([...users, ...posts]);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 350);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      setShowDrop(false);
      onNavigate("explore", null, query.trim());
    }
  };

  const initials =
    user?.fullName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    ?? user?.userName?.[0]?.toUpperCase()
    ?? "?";

  return (
    <div className="topbar">
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginRight: 8, whiteSpace: "nowrap" }}>
        {title}
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="Search posts, #hashtags, people…"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 150)}
        />
        {showDrop && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 300,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 999, overflow: "hidden",
          }}>
            {searching && (
              <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>Searching…</div>
            )}
            {!searching && results.length === 0 && (
              <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>
                No results — press Enter to search in Explore
              </div>
            )}
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 14px", fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
                onMouseDown={() => {
                  setQuery(""); setShowDrop(false);
                  if (r.type === "user") onNavigate("profile", r.id);
                  else onNavigate("explore", null, query.trim());
                }}
              >
                <span style={{ fontSize: 16 }}>{r.type === "user" ? "👤" : "📝"}</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                  {r.sublabel && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.sublabel}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <div
          className="icon-btn"
          onClick={() => { setUnreadCount(0); onNavigate("notifications"); }}
          style={{ position: "relative" }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              background: "#ED4956", color: "#fff",
              fontSize: 10, fontWeight: 700,
              borderRadius: 999, minWidth: 16, height: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", pointerEvents: "none",
            }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div
          className="avatar avatar-sm"
          style={{ cursor: "pointer", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
          onClick={() => onNavigate("profile", null)}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}
