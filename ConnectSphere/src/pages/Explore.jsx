import { useState, useEffect, useRef } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { postApi, followApi, userApi, likeApi, commentApi } from "../services/api";

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const GRADIENTS = ["linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", "linear-gradient(135deg,#0095F6,#1877F2)", "linear-gradient(135deg,#7C3AED,#EC4899)", "linear-gradient(135deg,#059669,#0891B2)", "linear-gradient(135deg,#F59E0B,#EF4444)"];
const getG = id => GRADIENTS[(id ?? 0) % GRADIENTS.length];

// User cache to show real names in search results
const userCache = {};
async function fetchUser(userId) {
  if (userCache[userId]) return userCache[userId];
  try { const u = await userApi.getById(userId); userCache[userId] = u; return u; } catch { return null; }
}

// Mini post card for search results with working like+comment
function SearchPostCard({ post, currentUser, onNavigate }) {
  const [liked, setLiked]         = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]   = useState([]);
  const [loadingCmts, setLoadingCmts] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingCmt, setPostingCmt]   = useState(false);
  const [author, setAuthor]       = useState(null);

  useEffect(() => { fetchUser(post.userId).then(u => setAuthor(u)); }, [post.userId]);

  useEffect(() => {
    if (!currentUser?.userId) return;
    likeApi.hasLiked(currentUser.userId, post.postId)
      .then(d => setLiked(d?.hasLiked ?? false)).catch(() => {});
  }, [post.postId, currentUser?.userId]);

  const handleLike = async () => {
    const was = liked;
    setLiked(!was); setLikeCount(p => was ? p - 1 : p + 1);
    try { await likeApi.toggle(currentUser.userId, post.postId, post.userId); }
    catch { setLiked(was); setLikeCount(p => was ? p + 1 : p - 1); }
  };

  const toggleComments = async () => {
    const opening = !showComments;
    setShowComments(opening);
    if (opening && comments.length === 0) {
      setLoadingCmts(true);
      try {
        const d = await commentApi.getByPost(post.postId);
        setComments(Array.isArray(d) ? d : []);
      } catch { setComments([]); }
      finally { setLoadingCmts(false); }
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setPostingCmt(true);
    try {
      const c = await commentApi.add(post.postId, { postId: post.postId, userId: currentUser.userId, content: commentText.trim(), postOwnerId: post.userId });
      setComments(p => [...p, c]);
      setCommentText("");
    } catch {} finally { setPostingCmt(false); }
  };

  const authorName = author?.fullName ?? author?.userName ?? `User ${post.userId}`;
  const authorHandle = author?.userName ? `@${author.userName}` : "";
  const initials = author?.fullName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="post-card animate-in" style={{ marginBottom: 8 }}>
      <div className="post-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
          onClick={() => onNavigate("profile", post.userId)}>
          {author?.avatarUrl
            ? <img src={author.avatarUrl} alt="" className="avatar avatar-md" style={{ objectFit: "cover" }} />
            : <div className="avatar avatar-md" style={{ background: getG(post.userId) }}>{initials}</div>}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{authorName}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{authorHandle} · {timeAgo(post.createdAt)}</div>
          </div>
        </div>
      </div>
      <div className="post-body">{post.content}</div>
      {post.hashtags && (
        <div className="post-tags">
          {post.hashtags.split(",").filter(Boolean).map(t => (
            <span key={t} className="tag">{t.startsWith("#") ? t : `#${t}`}</span>
          ))}
        </div>
      )}
      {post.mediaUrl && post.mediaType === "IMAGE" && (
        <img src={post.mediaUrl} alt="post media" style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }} />
      )}
      <div className="post-actions">
        <button className={`action-btn ${liked ? "liked" : ""}`} onClick={handleLike}>
          <span>{liked ? "❤️" : "🤍"}</span> {likeCount}
        </button>
        <button className="action-btn" onClick={toggleComments}>
          <span>💬</span> {post.commentCount ?? 0}
        </button>
      </div>
      {showComments && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
          {loadingCmts && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</p>}
          {comments.map(c => (
            <div key={c.commentId} style={{ display: "flex", gap: 8 }}>
              <div className="avatar avatar-xs" style={{ background: getG(c.userId) }}>U</div>
              <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "8px 12px", flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>User {c.userId}</span>
                <span style={{ fontSize: 13, marginLeft: 6 }}>{c.content}</span>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="avatar avatar-xs" style={{ background: getG(currentUser?.userId) }}>
              {currentUser?.userName?.[0]?.toUpperCase() ?? "A"}
            </div>
            <input
              style={{ flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
              placeholder="Add a comment…"
              value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()} />
            <button style={{ background: "none", border: "none", color: "var(--ig-blue)", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: commentText.trim() ? 1 : 0.4 }}
              onClick={handleComment} disabled={!commentText.trim() || postingCmt}>
              {postingCmt ? "…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// FIX: initialQuery prop add kiya — Topbar search se query receive karta hai
export default function Explore({ onNavigate, initialQuery = "" }) {
  const { user } = useAuth();
  const [trending, setTrending]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState(initialQuery);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [followMap, setFollowMap] = useState({});
  const [activeTab, setActiveTab] = useState("posts");
  const debounceRef = useRef(null);

  useEffect(() => {
    postApi.getTrending(48, 30)
      .then(async d => {
        const posts = Array.isArray(d) ? d : [];
        // Deleted users ki posts filter karo
        const valid = await Promise.all(
          posts.map(async p => {
            const exists = await userApi.exists(p.userId);
            return exists ? p : null;
          })
        );
        setTrending(valid.filter(Boolean));
      })
      .catch(() => setTrending([]))
      .finally(() => setLoading(false));
  }, []);

  // FIX: Agar initialQuery aaya (Topbar se) toh auto-search karo
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 2) {
      doSearch(initialQuery);
    }
  }, [initialQuery]);

  const doSearch = async (val) => {
    if (!val.trim() || val.trim().length < 2) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const q = val.trim();
      const isHashtag = q.startsWith("#");
      // FIX: # strip karke clean query bhejo backend ko
      const searchQ = isHashtag ? q.slice(1) : q;

      const [postsRes, usersRes] = await Promise.allSettled([
        postApi.search(searchQ),
        isHashtag ? Promise.resolve([]) : userApi.search(searchQ),
      ]);

      let posts = postsRes.status === "fulfilled" && Array.isArray(postsRes.value) ? postsRes.value : [];

      // FIX: Backend ab Content + Hashtags dono search karta hai
      // Lekin extra frontend filter bhi rakh lo agar koi edge case ho
      if (isHashtag) {
        posts = posts.filter(p =>
          p.hashtags?.toLowerCase().includes(searchQ.toLowerCase()) ||
          p.content?.toLowerCase().includes(searchQ.toLowerCase())
        );
      }

      setSearchResults({
        posts,
        users: usersRes.status === "fulfilled" && Array.isArray(usersRes.value) ? usersRes.value : [],
      });
    } catch { setSearchResults({ posts: [], users: [] }); }
    finally { setSearching(false); }
  };

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const handleFollow = async (targetId) => {
    if (!user?.userId) return;
    const isF = followMap[targetId];
    setFollowMap(p => ({ ...p, [targetId]: !isF }));
    try {
      if (isF) await followApi.unfollow(user.userId, targetId);
      else     await followApi.follow(user.userId, targetId);
    } catch { setFollowMap(p => ({ ...p, [targetId]: isF })); }
  };

  const displayPosts = searchResults ? searchResults.posts : trending;
  const displayUsers = searchResults ? searchResults.users : [];

  return (
    <div>
      <Topbar title="Explore" onNavigate={onNavigate} />
      <div className="page-content">



        {/* Tabs when searching */}
        {searchResults && (
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
            {["posts", "users"].map(t => (
              <div key={t}
                style={{ flex: 1, textAlign: "center", padding: "10px", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", borderBottom: activeTab === t ? "2px solid var(--text-primary)" : "2px solid transparent", color: activeTab === t ? "var(--text-primary)" : "var(--text-muted)" }}
                onClick={() => setActiveTab(t)}>
                {t} ({t === "posts" ? searchResults.posts.length : searchResults.users.length})
              </div>
            ))}
          </div>
        )}

        {/* Search: Users tab */}
        {searchResults && activeTab === "users" && (
          <div>
            {displayUsers.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>No users found for "{query}"</div>
            )}
            {displayUsers.map(u => {
              const initials = u.fullName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? u.userName?.[0]?.toUpperCase() ?? "?";
              const isF = followMap[u.userId];
              return (
                <div key={u.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flex: 1 }}
                    onClick={() => onNavigate("profile", u.userId)}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt="" className="avatar avatar-md" style={{ objectFit: "cover" }} />
                      : <div className="avatar avatar-md" style={{ background: getG(u.userId) }}>{initials}</div>}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.fullName}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>@{u.userName}</div>
                    </div>
                  </div>
                  {u.userId !== user?.userId && (
                    <button style={{ background: "none", border: "none", color: isF ? "var(--text-muted)" : "var(--ig-blue)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                      onClick={() => handleFollow(u.userId)}>
                      {isF ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Posts — Trending grid or Search results list */}
        {(!searchResults || activeTab === "posts") && (
          <>
            {!searchResults && <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🔥 Trending Posts</div>}

            {searchResults && activeTab === "posts" && displayPosts.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>
                No posts found for "{query}"<br />
                <span style={{ fontSize: 13 }}>Try without # or different keywords</span>
              </div>
            )}

            {loading && !searchResults && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading…</div>
            )}

            {/* Instagram grid for trending */}
            {!loading && !searchResults && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                {displayPosts.map(p => (
                  <div key={p.postId}
                    style={{ aspectRatio: "1", overflow: "hidden", cursor: "pointer", background: getG(p.userId), position: "relative" }}
                    onClick={() => onNavigate("profile", p.userId)}>
                    {p.mediaUrl && p.mediaType === "IMAGE"
                      ? <img src={p.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ padding: 10, fontSize: 12, color: "rgba(255,255,255,0.95)", lineHeight: 1.4, display: "flex", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", fontWeight: 500 }}>
                          {p.content?.slice(0, 60)}{p.content?.length > 60 ? "…" : ""}
                        </div>
                    }

                  </div>
                ))}
              </div>
            )}

            {/* FIX: Search results list — full PostCard with working like+comment */}
            {!loading && searchResults && displayPosts.map(p => (
              <SearchPostCard
                key={p.postId}
                post={p}
                currentUser={user}
                onNavigate={onNavigate}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}