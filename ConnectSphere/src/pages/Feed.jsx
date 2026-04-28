import { useState, useEffect, useRef } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { postApi, likeApi, commentApi, followApi, feedApi } from "../services/api";

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

const GRADIENTS = [
  "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
  "linear-gradient(135deg,#0095F6,#1877F2)",
  "linear-gradient(135deg,#58C322,#0891B2)",
  "linear-gradient(135deg,#7C3AED,#EC4899)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
];
const getGradient = (id) => GRADIENTS[id % GRADIENTS.length];

function PostCard({ post, currentUser, onDelete, onNavigate, userMap }) {
  const [liked, setLiked]           = useState(false);
  const [likeCount, setLikeCount]   = useState(post.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]     = useState([]);
  const [loadingCmts, setLoadingCmts] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingCmt, setPostingCmt] = useState(false);

  useEffect(() => {
    if (!currentUser?.userId) return;
    likeApi.hasLiked(currentUser.userId, post.postId)
      .then(d => setLiked(d?.hasLiked ?? false)).catch(() => {});
  }, [post.postId, currentUser?.userId]);

  const handleLike = async () => {
    const was = liked;
    setLiked(!was); setLikeCount(p => was ? p-1 : p+1);
    try { await likeApi.toggle(currentUser.userId, post.postId); }
    catch { setLiked(was); setLikeCount(p => was ? p+1 : p-1); }
  };

  const toggleComments = async () => {
    const opening = !showComments;
    setShowComments(opening);
    if (opening && comments.length === 0) {
      setLoadingCmts(true);
      try {
        const d = await commentApi.getByPost(post.postId);
        const list = Array.isArray(d) ? d : [];
        setComments(list);
        setCommentCount(list.length);
      } catch { setComments([]); }
      finally { setLoadingCmts(false); }
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setPostingCmt(true);
    try {
      const c = await commentApi.add(post.postId, {
        postId: post.postId, userId: currentUser.userId, content: commentText.trim()
      });
      setComments(p => [...p, c]);
      setCommentText("");
      setCommentCount(p => p+1);
    } catch {}
    finally { setPostingCmt(false); }
  };

  const authorName = userMap?.[post.userId]?.fullName ?? userMap?.[post.userId]?.userName ?? `User ${post.userId}`;
  const authorInitials = userMap?.[post.userId]?.fullName?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    ?? `U${post.userId}`;
  const avatarUrl = userMap?.[post.userId]?.avatarUrl;

  return (
    <div className="post-card animate-in">
      <div className="post-header">
        {/* Clickable avatar + name → navigate to that user's profile */}
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", flex:1 }}
          onClick={() => onNavigate("profile", post.userId)}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="avatar avatar-md" style={{ objectFit:"cover" }} />
            : <div className="avatar avatar-md" style={{ background: getGradient(post.userId) }}>{authorInitials}</div>
          }
          <div className="post-meta">
            <div className="post-author">{authorName}</div>
            <span className="post-time">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        {post.userId === currentUser?.userId && (
          <button style={{ background:"none", border:"none", color:"#737373", cursor:"pointer", fontSize:18, padding:"4px 8px" }}
            onClick={() => onDelete(post.postId)}>🗑️</button>
        )}
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
        <img src={post.mediaUrl} alt="post media"
          style={{ width:"100%", maxHeight:400, objectFit:"cover", display:"block" }} />
      )}

      <div className="post-actions">
        <button className={`action-btn ${liked ? "liked" : ""}`} onClick={handleLike}>
          <span>{liked ? "❤️" : "🤍"}</span> {likeCount}
        </button>
        <button className="action-btn" onClick={toggleComments}>
          <span>💬</span> {commentCount}
        </button>
        <button className="action-btn"><span>🔁</span> {post.shareCount ?? 0}</button>
        <button className="action-btn" style={{ marginLeft:"auto" }}><span>🔗</span></button>
      </div>

      {showComments && (
        <div style={{ padding:"12px 14px", borderTop:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:10 }}>
          {loadingCmts && <p style={{ fontSize:13, color:"var(--text-muted)" }}>Loading…</p>}
          {comments.map(c => (
            <div key={c.commentId} style={{ display:"flex", gap:8 }}>
              <div className="avatar avatar-xs" style={{ background: getGradient(c.userId), cursor:"pointer" }}
                onClick={() => onNavigate("profile", c.userId)}>
                {`U${c.userId}`}
              </div>
              <div style={{ background:"var(--bg-elevated)", borderRadius:8, padding:"8px 12px", flex:1 }}>
                <span style={{ fontSize:13, fontWeight:600, cursor:"pointer" }}
                  onClick={() => onNavigate("profile", c.userId)}>
                  {userMap?.[c.userId]?.userName ?? `User ${c.userId}`}
                </span>
                <span style={{ fontSize:13, marginLeft:6, color:"var(--text-primary)" }}>{c.content}</span>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3 }}>{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div className="avatar avatar-xs"
              style={{ background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
              {currentUser?.userName?.[0]?.toUpperCase() ?? "A"}
            </div>
            <input style={{ flex:1, background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:20, padding:"7px 14px", color:"var(--text-primary)", fontSize:13, outline:"none" }}
              placeholder="Add a comment…"
              value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()} />
            <button style={{ background:"none", border:"none", color:"var(--ig-blue)", fontWeight:600, fontSize:13, cursor:"pointer", opacity: commentText.trim() ? 1 : 0.4 }}
              onClick={handleComment} disabled={!commentText.trim() || postingCmt}>
              {postingCmt ? "…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Feed({ onNavigate }) {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts]     = useState([]);
  const [userMap, setUserMap] = useState({});  // userId → user info
  const [postText, setPostText]   = useState("");
  const [hashtags, setHashtags]   = useState("");
  const [mediaUrl, setMediaUrl]   = useState("");
  const [mediaType, setMediaType] = useState("NONE");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const fileRef = useRef();

  // Load feed: own posts + followed users' posts via feedApi
  useEffect(() => {
    if (authLoading || !user) return;
    const loadFeed = async () => {
      try {
        // Try personalized feed first (own + following)
        let data = [];
        try {
          data = await feedApi.getForUser(user.userId, 1, 30);
        } catch {
          // Fallback to public posts if feed service down
          data = await postApi.getPublic(1, 30);
        }
        const list = Array.isArray(data) ? data : [];
        setPosts(list);
      } catch { setPosts([]); }
      finally { setLoading(false); }
    };
    loadFeed();
  }, [authLoading, user]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Only images supported."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setMediaPreview(reader.result); setMediaUrl(reader.result); setMediaType("IMAGE"); setError(""); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeMedia = () => { setMediaPreview(null); setMediaUrl(""); setMediaType("NONE"); };

  const handlePost = async () => {
    if (!postText.trim()) return;
    setPosting(true); setError("");
    try {
      const newPost = await postApi.create({
        userId: user.userId, content: postText.trim(),
        mediaUrl: mediaUrl || null, mediaType,
        hashtags: hashtags.trim() || null, visibility: "PUBLIC",
      });
      setPosts(p => [newPost, ...p]);
      setPostText(""); setHashtags(""); removeMedia();
    } catch (err) { setError(err.message || "Failed to post."); }
    finally { setPosting(false); }
  };

  const handleDelete = async (postId) => {
    try { await postApi.delete(postId); setPosts(p => p.filter(x => x.postId !== postId)); }
    catch { setError("Could not delete."); }
  };

  const userInitials = user?.fullName?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() ?? "A";

  return (
    <div>
      <Topbar title="Home" onNavigate={onNavigate} />
      <div className="page-content">
        <div className="feed-layout">
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

            {/* Create Post */}
            <div className="create-post">
              <div className="create-post-input">
                <div className="avatar avatar-md"
                  style={{ background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", cursor:"pointer" }}
                  onClick={() => onNavigate("profile", null)}>
                  {userInitials}
                </div>
                <textarea
                  placeholder={`What's on your mind, ${user?.fullName?.split(" ")[0] ?? ""}?`}
                  value={postText} onChange={e => setPostText(e.target.value)}
                />
              </div>

              {/* Hashtag input */}
              <div style={{ padding:"0 14px 8px" }}>
                <input
                  style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid var(--border)", padding:"4px 0", color:"var(--text-muted)", fontSize:13, outline:"none" }}
                  placeholder="Add hashtags e.g. #WebDev,#React"
                  value={hashtags} onChange={e => setHashtags(e.target.value)} />
              </div>

              {/* Image preview */}
              {mediaPreview && (
                <div style={{ position:"relative", margin:"0 14px 8px" }}>
                  <img src={mediaPreview} alt="preview"
                    style={{ width:"100%", maxHeight:280, objectFit:"cover", borderRadius:8 }} />
                  <button onClick={removeMedia}
                    style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.7)", color:"#fff", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:14 }}>✕</button>
                </div>
              )}

              {error && (
                <div style={{ margin:"0 14px 8px", padding:"8px 12px", background:"rgba(237,73,86,0.1)", border:"1px solid rgba(237,73,86,0.3)", borderRadius:8, color:"#ED4956", fontSize:13 }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="create-post-actions">
                <div className="create-post-tools">
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile} />
                  {/* Image upload button */}
                  <button className="btn btn-ghost btn-sm" title="Add Photo" onClick={() => fileRef.current.click()}>🖼️</button>
                  {/* Hashtag button */}
                  <button className="btn btn-ghost btn-sm" title="Add Hashtag"
                    onClick={() => setHashtags(h => h ? h : "#")}>🏷️</button>
                  <button className="btn btn-ghost btn-sm" title="Mood">😊</button>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handlePost}
                  disabled={!postText.trim() || posting}>
                  {posting ? "Posting…" : "Share Post ✨"}
                </button>
              </div>
            </div>

            {(authLoading || loading) && (
              <div style={{ textAlign:"center", padding:40, color:"var(--text-secondary)" }}>Loading feed…</div>
            )}
            {!authLoading && !loading && posts.length === 0 && (
              <div style={{ textAlign:"center", padding:40, color:"var(--text-secondary)" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏠</div>
                <div style={{ fontWeight:600, marginBottom:4 }}>Your feed is empty</div>
                <div style={{ fontSize:13 }}>Follow people to see their posts here</div>
              </div>
            )}
            {!authLoading && !loading && posts.map(post => (
              <PostCard key={post.postId} post={post} currentUser={user}
                onDelete={handleDelete} onNavigate={onNavigate} userMap={userMap} />
            ))}
          </div>

          {/* Right sidebar */}
          <div className="sidebar-right">
            <div className="card widget">
              <div className="widget-title">🔥 Trending</div>
              {["#ConnectSphere","#WebDev","#TechIndia","#CleanCode","#ReactJS"].map((t,i) => (
                <div key={t} className="trending-item">
                  <span className="trending-rank">#{i+1}</span>
                  <div className="trending-tag">{t}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.8, marginTop:8 }}>
              ConnectSphere · © 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}