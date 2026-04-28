import { useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { postApi, followApi, userApi } from "../services/api";

function timeAgo(d) {
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if(m<1) return "Just now"; if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

const GRADIENTS = [
  "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
  "linear-gradient(135deg,#0095F6,#1877F2)",
  "linear-gradient(135deg,#7C3AED,#EC4899)",
  "linear-gradient(135deg,#059669,#0891B2)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
];
const getG = id => GRADIENTS[id % GRADIENTS.length];

export default function Explore({ onNavigate }) {
  const { user } = useAuth();
  const [posts, setPosts]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searched
  const [searching, setSearching] = useState(false);
  const [followMap, setFollowMap] = useState({});
  const [layout, setLayout]     = useState("grid");
  const [activeTab, setActiveTab] = useState("posts"); // posts | users

  // Load trending public posts
  useEffect(() => {
    postApi.getTrending(48, 30)
      .then(d => setPosts(Array.isArray(d) ? d : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  // Partial search — posts by hashtag/content + users by name
  const handleSearch = async (val) => {
    setQuery(val);
    if (!val.trim() || val.trim().length < 2) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const [postsRes, usersRes] = await Promise.allSettled([
        postApi.search(val.trim()),
        userApi.search(val.trim()),
      ]);
      setSearchResults({
        posts: postsRes.status === "fulfilled" && Array.isArray(postsRes.value) ? postsRes.value : [],
        users: usersRes.status === "fulfilled" && Array.isArray(usersRes.value) ? usersRes.value : [],
      });
    } catch { setSearchResults({ posts:[], users:[] }); }
    finally { setSearching(false); }
  };

  const handleFollow = async (targetId) => {
    if (!user?.userId) return;
    const isF = followMap[targetId];
    setFollowMap(p => ({...p, [targetId]: !isF}));
    try {
      if (isF) await followApi.unfollow(user.userId, targetId);
      else     await followApi.follow(user.userId, targetId);
    } catch { setFollowMap(p => ({...p, [targetId]: isF})); }
  };

  const displayPosts = searchResults ? searchResults.posts : posts;
  const displayUsers = searchResults ? searchResults.users : [];

  return (
    <div>
      <Topbar title="Explore" onNavigate={onNavigate} />
      <div className="page-content">

        {/* Search bar */}
        <div style={{ position:"relative", marginBottom:20 }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)", fontSize:16 }}>🔍</span>
          <input
            style={{ width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 14px 10px 38px", color:"var(--text-primary)", fontSize:14, outline:"none" }}
            placeholder="Search posts, hashtags, people…"
            value={query} onChange={e => handleSearch(e.target.value)} />
          {searching && (
            <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"var(--text-muted)" }}>Searching…</span>
          )}
        </div>

        {/* Tabs when searching */}
        {searchResults && (
          <div style={{ display:"flex", gap:0, borderBottom:"1px solid var(--border)", marginBottom:16 }}>
            {["posts","users"].map(t => (
              <div key={t} className={`tab ${activeTab===t?"active":""}`}
                style={{ flex:1, textAlign:"center", textTransform:"uppercase", fontSize:12, letterSpacing:1, fontWeight:600 }}
                onClick={() => setActiveTab(t)}>
                {t} {t === "posts" ? `(${searchResults.posts.length})` : `(${searchResults.users.length})`}
              </div>
            ))}
          </div>
        )}

        {/* Search: Users */}
        {searchResults && activeTab === "users" && (
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            {displayUsers.length === 0 && (
              <div style={{ textAlign:"center", padding:32, color:"var(--text-secondary)" }}>No users found</div>
            )}
            {displayUsers.map(u => {
              const initials = u.fullName?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() ?? u.userName?.[0]?.toUpperCase() ?? "?";
              const isF = followMap[u.userId];
              return (
                <div key={u.userId} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:12, flex:1 }}
                    onClick={() => onNavigate("profile", u.userId)}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt="" className="avatar avatar-md" style={{ objectFit:"cover" }} />
                      : <div className="avatar avatar-md" style={{ background: getG(u.userId) }}>{initials}</div>
                    }
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{u.fullName}</div>
                      <div style={{ fontSize:12, color:"var(--text-muted)" }}>@{u.userName}</div>
                    </div>
                  </div>
                  {u.userId !== user?.userId && (
                    <button style={{ background:"none", border:"none", color: isF ? "var(--text-muted)" : "var(--ig-blue)", fontWeight:600, fontSize:13, cursor:"pointer" }}
                      onClick={() => handleFollow(u.userId)}>
                      {isF ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Posts grid/list */}
        {(!searchResults || activeTab === "posts") && (
          <>
            {!searchResults && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:15 }}>Trending Posts</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button className={`btn btn-ghost btn-sm ${layout==="grid"?"btn-outline":""}`} onClick={() => setLayout("grid")}>⊞</button>
                  <button className={`btn btn-ghost btn-sm ${layout==="list"?"btn-outline":""}`} onClick={() => setLayout("list")}>☰</button>
                </div>
              </div>
            )}

            {loading && <div style={{ textAlign:"center", padding:40, color:"var(--text-secondary)" }}>Loading…</div>}

            {!loading && displayPosts.length === 0 && (
              <div style={{ textAlign:"center", padding:32, color:"var(--text-secondary)" }}>No posts found</div>
            )}

            {!loading && layout === "grid" && !searchResults && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
                {displayPosts.map(p => (
                  <div key={p.postId} style={{ aspectRatio:"1", overflow:"hidden", cursor:"pointer", background: getG(p.userId), display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                    {p.mediaUrl && p.mediaType === "IMAGE"
                      ? <img src={p.mediaUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ padding:12, fontSize:12, color:"rgba(255,255,255,0.9)", textAlign:"center", lineHeight:1.4 }}>{p.content?.slice(0,80)}</div>
                    }
                  </div>
                ))}
              </div>
            )}

            {!loading && (layout === "list" || searchResults) && (
              <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                {displayPosts.map(p => {
                  const initials = `U${p.userId}`;
                  const isF = followMap[p.userId];
                  return (
                    <div key={p.postId} className="post-card" style={{ borderRadius:0, border:"none", borderBottom:"1px solid var(--border)" }}>
                      <div className="post-header">
                        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, cursor:"pointer" }}
                          onClick={() => onNavigate("profile", p.userId)}>
                          <div className="avatar avatar-md" style={{ background: getG(p.userId) }}>{initials}</div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:14 }}>User {p.userId}</div>
                            <div style={{ fontSize:12, color:"var(--text-muted)" }}>{timeAgo(p.createdAt)}</div>
                          </div>
                        </div>
                        {p.userId !== user?.userId && (
                          <button style={{ background:"none", border:"none", color: isF ? "var(--text-muted)" : "var(--ig-blue)", fontWeight:600, fontSize:13, cursor:"pointer" }}
                            onClick={() => handleFollow(p.userId)}>
                            {isF ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                      <div className="post-body">{p.content}</div>
                      {p.hashtags && (
                        <div className="post-tags">
                          {p.hashtags.split(",").filter(Boolean).map(t => (
                            <span key={t} className="tag">{t.startsWith("#") ? t : `#${t}`}</span>
                          ))}
                        </div>
                      )}
                      {p.mediaUrl && p.mediaType === "IMAGE" && (
                        <img src={p.mediaUrl} alt="" style={{ width:"100%", maxHeight:300, objectFit:"cover", display:"block" }} />
                      )}
                      <div className="post-actions">
                        <button className="action-btn"><span>🤍</span> {p.likeCount??0}</button>
                        <button className="action-btn"><span>💬</span> {p.commentCount??0}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}