import { useState, useEffect, useRef } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { postApi, likeApi, commentApi, feedApi, userApi, followApi } from "../services/api";

// ─── Helpers ────────────────────────────────────────────────
function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const GRADIENTS = [
  "linear-gradient(135deg,#f09433,#bc1888)",
  "linear-gradient(135deg,#0095F6,#1877F2)",
  "linear-gradient(135deg,#7C3AED,#EC4899)",
  "linear-gradient(135deg,#059669,#0891B2)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
];
const getG = id => GRADIENTS[(id ?? 0) % GRADIENTS.length];

// Global user-info cache
const _uc = {};
async function getAuthor(id) {
  if (_uc[id]) return _uc[id];
  try {
    const u = await userApi.getById(id);
    _uc[id] = u;
    return u;
  } catch { return null; }
}

// ─── Emoji Picker ────────────────────────────────────────────
const EMOJIS = ["😀","😂","😍","🥰","😎","🤔","😢","😡","🎉","🔥","❤️","👍","👏","✨","🙏","💯","🥳","🤩","😇","🌟","💪","🎯","🚀","💡","🎵","🌈","🍕","☕","🌺","😴"];
function EmojiPicker({ onPick, onClose }) {
  return (
    <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:0, background:"#fff", border:"1px solid #DBDBDB", borderRadius:12, padding:10, display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:4, zIndex:200, boxShadow:"0 4px 20px rgba(0,0,0,0.15)", width:216 }}>
      {EMOJIS.map(e => (
        <button key={e} onClick={() => { onPick(e); onClose(); }}
          style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", padding:4, borderRadius:6, lineHeight:1 }}>
          {e}
        </button>
      ))}
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────
function PostCard({ post, currentUser, onDelete, onNavigate }) {
  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(post.likeCount ?? 0);
  const [cmtCount,    setCmtCount]    = useState(post.commentCount ?? 0);
  const [showCmts,    setShowCmts]    = useState(false);
  const [cmts,        setCmts]        = useState([]);
  const [loadingCmts, setLoadingCmts] = useState(false);
  const [cmtText,     setCmtText]     = useState("");
  const [postingCmt,  setPostingCmt]  = useState(false);
  const [author,      setAuthor]      = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeErr,     setLikeErr]     = useState("");
  const [cmtErr,      setCmtErr]      = useState("");

  useEffect(() => {
    getAuthor(post.userId).then(u => u && setAuthor(u));
  }, [post.userId]);

  // Fetch real comment count (backend field is often stale)
  useEffect(() => {
    commentApi.getByPost(post.postId)
      .then(d => { const list = Array.isArray(d) ? d : []; setCmtCount(list.length); })
      .catch(() => {});
  }, [post.postId]);

  // Fetch like status and real count
  useEffect(() => {
    if (!currentUser?.userId) return;
    likeApi.hasLiked(currentUser.userId, post.postId)
      .then(d => setLiked(d?.hasLiked ?? false)).catch(() => {});
    likeApi.getLikeCount(post.postId)
      .then(d => { if (d?.count !== undefined) setLikeCount(d.count); }).catch(() => {});
  }, [post.postId, currentUser?.userId]);

  const handleLike = async () => {
    if (likeLoading || !currentUser?.userId) return;
    const was = liked;
    setLiked(!was);
    setLikeCount(p => was ? Math.max(0, p - 1) : p + 1);
    setLikeLoading(true);
    setLikeErr("");
    try {
      const result = await likeApi.toggle(currentUser.userId, post.postId, post.userId);
      if (result?.likeCount !== undefined) setLikeCount(result.likeCount);
      if (result?.liked     !== undefined) setLiked(result.liked);
    } catch (e) {
      setLiked(was);
      setLikeCount(p => was ? p + 1 : Math.max(0, p - 1));
      setLikeErr(e.message);
    } finally { setLikeLoading(false); }
  };

  const toggleCmts = async () => {
    const opening = !showCmts;
    setShowCmts(opening);
    if (opening && cmts.length === 0) {
      setLoadingCmts(true);
      try {
        const d = await commentApi.getByPost(post.postId);
        const list = Array.isArray(d) ? d : [];
        setCmts(list); setCmtCount(list.length);
      } catch { setCmts([]); }
      finally { setLoadingCmts(false); }
    }
  };

  const handleComment = async () => {
    if (!cmtText.trim() || postingCmt || !currentUser?.userId) return;
    setPostingCmt(true); setCmtErr("");
    try {
      const c = await commentApi.add(post.postId, {
        userId:      currentUser.userId,
        content:     cmtText.trim(),
        postOwnerId: post.userId,
      });
      setCmts(p => [...p, c]);
      setCmtText("");
      setCmtCount(p => p + 1);
    } catch (e) {
      setCmtErr(e.message || "Comment failed");
    } finally { setPostingCmt(false); }
  };

  const authorName    = author?.fullName ?? author?.userName ?? `User ${post.userId}`;
  const authorHandle  = author?.userName ? `@${author.userName}` : "";
  const authorInitials = author?.fullName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  return (
    <div style={{ background:"#fff", border:"1px solid #DBDBDB", borderRadius:12, overflow:"hidden", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
      {/* Header */}
      <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, cursor:"pointer" }}
          onClick={() => onNavigate("profile", post.userId)}>
          {author?.avatarUrl
            ? <img src={author.avatarUrl} alt="" style={{ width:42, height:42, borderRadius:"50%", objectFit:"cover" }} />
            : <div style={{ width:42, height:42, borderRadius:"50%", background:getG(post.userId), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>{authorInitials}</div>
          }
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{authorName}</div>
            <div style={{ fontSize:12, color:"#A8A8A8" }}>
              {authorHandle}{authorHandle ? " · " : ""}{timeAgo(post.createdAt)}
            </div>
          </div>
        </div>
        {post.userId === currentUser?.userId && (
          <button onClick={() => onDelete(post.postId)}
            style={{ background:"none", border:"none", color:"#A8A8A8", cursor:"pointer", fontSize:16, padding:"4px 6px", borderRadius:6 }}
            title="Delete">🗑️</button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding:"0 14px 12px", fontSize:15, lineHeight:1.6, color:"#111" }}>{post.content}</div>

      {/* Hashtags */}
      {post.hashtags && (
        <div style={{ padding:"0 14px 10px", display:"flex", gap:6, flexWrap:"wrap" }}>
          {post.hashtags.split(",").filter(Boolean).map(t => (
            <span key={t} style={{ fontSize:13, color:"#0095F6", cursor:"pointer" }}>
              {t.startsWith("#") ? t : `#${t}`}
            </span>
          ))}
        </div>
      )}

      {/* Image */}
      {post.mediaUrl && post.mediaType === "IMAGE" && (
        <img src={post.mediaUrl} alt="post media"
          style={{ width:"100%", maxHeight:500, objectFit:"cover", display:"block" }} />
      )}

      {likeErr && (
        <div style={{ padding:"4px 14px", fontSize:12, color:"#ED4956" }}>⚠️ {likeErr}</div>
      )}

      {/* Action bar */}
      <div style={{ display:"flex", padding:"8px 10px 4px", gap:2, borderTop:"1px solid #DBDBDB", marginTop:4 }}>
        <button onClick={handleLike} disabled={likeLoading}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:8, color:liked?"#ED4956":"#262626", fontWeight:liked?700:400, fontSize:13 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={liked?"#ED4956":"none"} stroke={liked?"#ED4956":"#262626"} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {likeCount}
        </button>
        <button onClick={toggleCmts}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:8, color:"#262626", fontSize:13 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {cmtCount}
        </button>
        <button style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:8, color:"#262626", fontSize:13 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          {post.shareCount ?? 0}
        </button>
      </div>

      {/* Comments section */}
      {showCmts && (
        <div style={{ borderTop:"1px solid #F0F0F0", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
          {loadingCmts && <p style={{ fontSize:13, color:"#A8A8A8" }}>Loading…</p>}
          {!loadingCmts && cmts.length === 0 && (
            <p style={{ fontSize:13, color:"#A8A8A8", textAlign:"center" }}>No comments yet</p>
          )}
          {cmts.map(c => (
            <div key={c.commentId} style={{ display:"flex", gap:8 }}>
              <div
                style={{ width:28, height:28, borderRadius:"50%", background:getG(c.userId), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700, flexShrink:0, cursor:"pointer" }}
                onClick={() => onNavigate("profile", c.userId)}>
                {_uc[c.userId]?.fullName?.[0]?.toUpperCase() ?? _uc[c.userId]?.userName?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div style={{ background:"#F5F5F5", borderRadius:10, padding:"8px 12px", flex:1 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>
                  {_uc[c.userId]?.fullName ?? _uc[c.userId]?.userName ?? `User ${c.userId}`}
                </span>
                <span style={{ fontSize:13, marginLeft:6 }}>{c.content}</span>
                <div style={{ fontSize:11, color:"#A8A8A8", marginTop:2 }}>{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}

          {cmtErr && <div style={{ fontSize:12, color:"#ED4956" }}>⚠️ {cmtErr}</div>}

          {/* Comment input */}
          <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:4 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:getG(currentUser?.userId), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700, flexShrink:0 }}>
              {currentUser?.fullName?.[0]?.toUpperCase() ?? currentUser?.userName?.[0]?.toUpperCase() ?? "A"}
            </div>
            <input
              style={{ flex:1, background:"#F5F5F5", border:"1px solid #DBDBDB", borderRadius:20, padding:"7px 14px", fontSize:13, outline:"none", color:"#111" }}
              placeholder="Add a comment…"
              value={cmtText}
              onChange={e => setCmtText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
            />
            <button
              style={{ background:"none", border:"none", color:cmtText.trim()?"#0095F6":"#A8A8A8", fontWeight:700, fontSize:13, cursor:cmtText.trim()?"pointer":"default" }}
              onClick={handleComment}
              disabled={!cmtText.trim() || postingCmt}>
              {postingCmt ? "…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Feed Component ─────────────────────────────────────
export default function Feed({ onNavigate }) {
  const { user, loading: authLoading } = useAuth();
  const [posts,       setPosts]       = useState([]);
  const [postText,    setPostText]    = useState("");
  const [hashtags,    setHashtags]    = useState("");
  const [mediaPreview,setMediaPreview]= useState(null);
  const [mediaUrl,    setMediaUrl]    = useState("");
  const [mediaType,   setMediaType]   = useState("NONE");
  const [posting,     setPosting]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [showEmoji,   setShowEmoji]   = useState(false);
  const fileRef  = useRef();
  const emojiRef = useRef();

  // Load feed — only when auth is ready and user is set
  useEffect(() => {
    if (authLoading || !user?.userId) return;
    let cancelled = false;

    (async () => {
      try {
        let feedPosts = [];

        // 1. Try personal feed (following users' posts via FeedService)
        try {
          const feedItems = await feedApi.getForUser(user.userId, 1, 50);
          if (Array.isArray(feedItems) && feedItems.length > 0) {
            const uniquePostIds = [...new Set(feedItems.map(f => f.postId))];
            const postResults = await Promise.allSettled(
              uniquePostIds.map(pid => postApi.getById(pid))
            );
            feedPosts = postResults
              .filter(r => r.status === "fulfilled" && r.value && !r.value.isDeleted)
              .map(r => r.value);
          }
        } catch (feedErr) {
          console.warn("[Feed] feedApi failed, falling back to public:", feedErr.message);
        }

        // 2. BACKFILL: If the optimized FeedService is empty, fetch posts from followed/followers directly
        if (feedPosts.length === 0) {
          try {
            const [following, followers] = await Promise.all([
              followApi.getFollowingIds(user.userId),
              followApi.getFollowerIds(user.userId)
            ]);
            const allIds = [...new Set([...(following||[]), ...(followers||[])])];
            
            if (allIds.length > 0) {
              const directFeed = await postApi.getFeed(allIds, 1, 50);
              feedPosts = Array.isArray(directFeed) ? directFeed : [];
            }
          } catch (backfillErr) {
            console.error("[Feed] Backfill failed:", backfillErr.message);
          }
        }

        if (!cancelled) setPosts(feedPosts);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, user?.userId]);

  // Close emoji on outside click
  useEffect(() => {
    const h = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Only images supported."); return; }
    if (file.size > 5 * 1024 * 1024)    { setError("Image must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview(reader.result);
      setMediaUrl(reader.result);
      setMediaType("IMAGE");
      setError("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePost = async () => {
    if (!postText.trim()) { setError("Please write something before posting."); return; }
    setPosting(true); setError("");
    try {
      const newPost = await postApi.create({
        userId:     user.userId,
        content:    postText.trim(),
        mediaUrl:   mediaUrl || null,
        mediaType,
        hashtags:   hashtags.trim() || "",
        visibility: "PUBLIC",
      });
      setPosts(p => [newPost, ...p]);
      setPostText(""); setHashtags(""); setMediaPreview(null); setMediaUrl(""); setMediaType("NONE");
    } catch (err) {
      setError(err.message || "Failed to post.");
    } finally { setPosting(false); }
  };

  const userInitials = user?.fullName?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "A";
  const canPost = postText.trim().length > 0 && !posting;

  if (authLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"80vh" }}>
        <p style={{ color:"var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Home" onNavigate={onNavigate} />
      <div style={{ padding:"24px 20px", maxWidth:1100 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:32, alignItems:"start" }}>
          <div>
            {/* Create Post Box */}
            <div style={{ background:"#fff", border:"1px solid #DBDBDB", borderRadius:12, marginBottom:16, overflow:"visible" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"14px 14px 10px" }}>
                <div
                  style={{ width:42, height:42, borderRadius:"50%", background:getG(user?.userId), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0, cursor:"pointer" }}
                  onClick={() => onNavigate("profile", null)}>
                  {userInitials}
                </div>
                <textarea
                  style={{ flex:1, background:"transparent", border:"none", padding:"4px 0", fontSize:15, outline:"none", resize:"none", minHeight:64, lineHeight:1.5, color:"#111", fontFamily:"inherit" }}
                  placeholder={`What's on your mind, ${user?.fullName?.split(" ")[0] ?? ""}?`}
                  value={postText}
                  onChange={e => { setPostText(e.target.value); setError(""); }}
                />
              </div>

              <div style={{ padding:"0 14px 8px" }}>
                <input
                  style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid #DBDBDB", padding:"4px 0", color:"#737373", fontSize:13, outline:"none" }}
                  placeholder="Add hashtags e.g. #WebDev,#React"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                />
              </div>

              {mediaPreview && (
                <div style={{ position:"relative", margin:"0 14px 8px" }}>
                  <img src={mediaPreview} alt="preview"
                    style={{ width:"100%", maxHeight:280, objectFit:"cover", borderRadius:8 }} />
                  <button
                    onClick={() => { setMediaPreview(null); setMediaUrl(""); setMediaType("NONE"); }}
                    style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.65)", color:"#fff", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    ✕
                  </button>
                </div>
              )}

              {error && (
                <div style={{ margin:"0 14px 8px", padding:"8px 12px", background:"#FFF0F0", border:"1px solid #FFCDD2", borderRadius:8, color:"#ED4956", fontSize:13 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px 12px", borderTop:"1px solid #F0F0F0" }}>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile} />
                  <button onClick={() => fileRef.current.click()}
                    style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 8px", borderRadius:8, color:"#737373" }} title="Add Photo">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                  <button onClick={() => setHashtags(h => h ? h : "#")}
                    style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 10px", borderRadius:8, fontSize:15, fontWeight:700, color:"#737373" }} title="Hashtag">
                    #
                  </button>
                  <div ref={emojiRef} style={{ position:"relative" }}>
                    <button onClick={() => setShowEmoji(e => !e)}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 8px", borderRadius:8, fontSize:20 }} title="Emoji">
                      😊
                    </button>
                    {showEmoji && (
                      <EmojiPicker onPick={e => setPostText(t => t + e)} onClose={() => setShowEmoji(false)} />
                    )}
                  </div>
                </div>
                <button onClick={handlePost} disabled={!canPost}
                  style={{ background:canPost?"#0095F6":"#B2DFFC", color:"#fff", border:"none", borderRadius:8, padding:"8px 20px", fontSize:14, fontWeight:700, cursor:canPost?"pointer":"not-allowed" }}>
                  {posting ? "Posting…" : "Share Post"}
                </button>
              </div>
            </div>

            {/* Posts list */}
            {loading && (
              <div style={{ textAlign:"center", padding:40, color:"#737373" }}>Loading feed…</div>
            )}
            {!loading && posts.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🏠</div>
                <div style={{ fontWeight:700, marginBottom:6, fontSize:16 }}>Your feed is empty</div>
                <div style={{ fontSize:14, color:"#737373", marginBottom:16 }}>Follow people or create the first post!</div>
                <button onClick={() => onNavigate("explore")}
                  style={{ background:"#0095F6", color:"#fff", border:"none", borderRadius:8, padding:"8px 20px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  Explore Posts
                </button>
              </div>
            )}
            {!loading && posts.map(post => (
              <PostCard
                key={post.postId}
                post={post}
                currentUser={user}
                onDelete={async (id) => {
                  try { await postApi.delete(id); setPosts(p => p.filter(x => x.postId !== id)); }
                  catch (e) { setError(e.message); }
                }}
                onNavigate={onNavigate}
              />
            ))}
          </div>

          {/* Sidebar */}
          <div style={{ position:"sticky", top:80 }}>

          </div>
        </div>
      </div>
    </div>
  );
}
