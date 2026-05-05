import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { postApi, userApi } from "../services/api";

export default function Topbar({ title, onNavigate }) {
  const { user } = useAuth();
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const debounceRef = useRef(null);

  const doSearch = async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setShowDrop(false); return; }
    setSearching(true); setShowDrop(true);
    try {
      const isHashtag = q.startsWith("#");
      // FIX: Hashtag search karte waqt # hata do, backend ko clean string chahiye
      // Backend ab Content OR Hashtags dono me search karta hai
      const sq = isHashtag ? q.slice(1) : q;

      const [p, u] = await Promise.allSettled([
        postApi.search(sq),
        // FIX: Hashtag search me users mat dhundo
        isHashtag ? Promise.resolve([]) : userApi.search(sq),
      ]);

      const posts = p.status === "fulfilled" && Array.isArray(p.value)
        ? p.value.slice(0, 4).map(x => ({
            type: "post",
            label: x.content?.slice(0, 50) + (x.content?.length > 50 ? "…" : ""),
            sublabel: x.hashtags ? x.hashtags.split(",").slice(0,3).join(" ") : "",
            id: x.postId,
            userId: x.userId,
          }))
        : [];

      const users = u.status === "fulfilled" && Array.isArray(u.value)
        ? u.value.slice(0, 3).map(x => ({
            type: "user",
            label: x.fullName || x.userName,
            sublabel: `@${x.userName}`,
            id: x.userId,
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

  // Press Enter → go to Explore page with the query pre-filled
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      setShowDrop(false);
      onNavigate("explore", null, query.trim());
    }
  };

  const initials = user?.fullName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    ?? user?.userName?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="topbar">
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginRight: 8, whiteSpace: "nowrap" }}>{title}</div>

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
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 999, overflow: "hidden"
          }}>
            {searching && <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>Searching…</div>}
            {!searching && results.length === 0 && (
              <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>No results — try Enter to search in Explore</div>
            )}
            {results.map((r, i) => (
              <div key={i}
                style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                onMouseDown={() => {
                  setQuery(""); setShowDrop(false);
                  if (r.type === "user") onNavigate("profile", r.id);
                  // FIX: Post result click karne pe Explore pe jaao with query
                  else onNavigate("explore", null, query.trim());
                }}>
                <span style={{ fontSize: 16 }}>{r.type === "user" ? "👤" : "📝"}</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                  {r.sublabel && <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sublabel}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <div className="icon-btn" onClick={() => onNavigate("notifications")}>
          🔔 <span className="notif-dot" />
        </div>
        <div className="avatar avatar-sm"
          style={{ cursor: "pointer", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
          onClick={() => onNavigate("profile", null)}>
          {initials}
        </div>
      </div>
    </div>
  );
}