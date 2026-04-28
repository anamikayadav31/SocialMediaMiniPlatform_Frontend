import { useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { userApi, postApi, followApi } from "../services/api";

function timeAgo(d) {
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if(m<1) return "Just now";
  if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60);
  if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

// ── Followers/Following Modal ────────────────────────────────────
function FollowModal({ type, userId, onClose, onNavigate }) {
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = type === "followers" ? followApi.getFollowers : followApi.getFollowing;
    fn(userId)
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [userId, type]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12, width:380, maxHeight:500, overflow:"hidden", display:"flex", flexDirection:"column" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:700, fontSize:15, textTransform:"capitalize" }}>{type}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"var(--text-muted)" }}>Loading…</div>}
          {!loading && list.length === 0 && (
            <div style={{ padding:32, textAlign:"center", color:"var(--text-muted)", fontSize:14 }}>No {type} yet</div>
          )}
          {list.map(u => {
            const uid = u.followerId ?? u.followingId ?? u.userId;
            const name = u.followerName ?? u.followingName ?? u.fullName ?? `User ${uid}`;
            const uname = u.followerUserName ?? u.followingUserName ?? u.userName ?? "";
            const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
            return (
              <div key={uid} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid var(--border)", cursor:"pointer" }}
                onClick={() => { onClose(); onNavigate("profile", uid); }}>
                <div className="avatar avatar-sm"
                  style={{ background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{name}</div>
                  {uname && <div style={{ fontSize:12, color:"var(--text-muted)" }}>@{uname}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Change Password Modal ────────────────────────────────────────
function ChangePasswordModal({ userId, onClose }) {
  const [form, setForm]   = useState({ currentPassword:"", newPassword:"", confirmPassword:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState("");
  const [err, setErr]     = useState("");

  const handleSave = async () => {
    if (form.newPassword !== form.confirmPassword) { setErr("Passwords don't match"); return; }
    if (form.newPassword.length < 6) { setErr("Password must be at least 6 characters"); return; }
    setSaving(true); setErr(""); setMsg("");
    try {
      await userApi.changePassword(userId, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMsg("Password changed successfully!");
      setTimeout(onClose, 1500);
    } catch(e) { setErr(e.message || "Failed to change password"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12, width:360, padding:24 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Change Password</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {["currentPassword","newPassword","confirmPassword"].map(k => (
            <input key={k} type="password"
              style={{ background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:6, padding:"9px 12px", color:"var(--text-primary)", fontSize:14, outline:"none", width:"100%" }}
              placeholder={k === "currentPassword" ? "Current password" : k === "newPassword" ? "New password" : "Confirm new password"}
              value={form[k]} onChange={e => setForm(f => ({...f, [k]:e.target.value}))} />
          ))}
          {err && <div style={{ color:"#ED4956", fontSize:13 }}>⚠️ {err}</div>}
          {msg && <div style={{ color:"#58C322", fontSize:13 }}>✅ {msg}</div>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.currentPassword || !form.newPassword}>
            {saving ? "Saving…" : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ───────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({
    fullName:  profile.fullName  ?? "",
    bio:       profile.bio       ?? "",
    avatarUrl: profile.avatarUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      await userApi.updateProfile(profile.userId, {
        fullName:  form.fullName  || null,
        bio:       form.bio       || null,
        avatarUrl: form.avatarUrl || null,
      });
      onSave({ ...profile, ...form });
      onClose();
    } catch(e) { setErr(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12, width:380, padding:24 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontWeight:700, fontSize:15 }}>Edit Profile</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Full Name</label>
            <input style={{ width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:6, padding:"9px 12px", color:"var(--text-primary)", fontSize:14, outline:"none" }}
              value={form.fullName} onChange={e => setForm(f=>({...f, fullName:e.target.value}))} />
          </div>
          <div>
            <label style={{ fontSize:12, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Bio</label>
            <textarea style={{ width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:6, padding:"9px 12px", color:"var(--text-primary)", fontSize:14, outline:"none", resize:"none", minHeight:80 }}
              value={form.bio} onChange={e => setForm(f=>({...f, bio:e.target.value}))} />
          </div>
          <div>
            <label style={{ fontSize:12, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Profile Picture URL</label>
            <input style={{ width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:6, padding:"9px 12px", color:"var(--text-primary)", fontSize:14, outline:"none" }}
              placeholder="https://..." value={form.avatarUrl}
              onChange={e => setForm(f=>({...f, avatarUrl:e.target.value}))} />
            {form.avatarUrl && (
              <img src={form.avatarUrl} alt="" onError={e => e.target.style.display="none"}
                style={{ width:60, height:60, borderRadius:"50%", objectFit:"cover", marginTop:8, border:"2px solid var(--border)" }} />
            )}
          </div>
          {err && <div style={{ color:"#ED4956", fontSize:13 }}>⚠️ {err}</div>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Profile Component ───────────────────────────────────────
export default function Profile({ onNavigate, viewUserId }) {
  const { user: authUser } = useAuth();

  // null viewUserId = own profile
  const targetUserId = viewUserId ?? authUser?.userId;
  const isOwn = !viewUserId || viewUserId === authUser?.userId;

  const [profile, setProfile]     = useState(null);
  const [posts, setPosts]         = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("posts");

  // Follow state
  const [isFollowing, setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Modals
  const [showFollowers, setShowFollowers]   = useState(false);
  const [showFollowing, setShowFollowing]   = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Privacy toggle
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    setLoadingProfile(true); setLoadingPosts(true);
    setError("");

    userApi.getById(targetUserId)
      .then(d => setProfile(d))
      .catch(e => setError(e.message))
      .finally(() => setLoadingProfile(false));

    postApi.getByUser(targetUserId)
      .then(d => setPosts(Array.isArray(d) ? d : []))
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));

    // Check if current user follows target
    if (!isOwn && authUser?.userId) {
      followApi.isFollowing(authUser.userId, targetUserId)
        .then(d => setIsFollowing(d?.isFollowing ?? false))
        .catch(() => {});
    }
  }, [targetUserId, isOwn, authUser?.userId]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followApi.unfollow(authUser.userId, targetUserId);
        setIsFollowing(false);
        setProfile(p => p ? {...p, followerCount: (p.followerCount ?? 1) - 1} : p);
      } else {
        await followApi.follow(authUser.userId, targetUserId);
        setIsFollowing(true);
        setProfile(p => p ? {...p, followerCount: (p.followerCount ?? 0) + 1} : p);
      }
    } catch {}
    finally { setFollowLoading(false); }
  };

  const handleTogglePrivacy = async () => {
    setPrivacyLoading(true);
    try {
      await userApi.togglePrivacy(profile.userId);
      setProfile(p => p ? {...p, isPrivate: !p.isPrivate} : p);
    } catch {}
    finally { setPrivacyLoading(false); }
  };

  if (loadingProfile) return (
    <div><Topbar title="Profile" onNavigate={onNavigate} />
      <div style={{ textAlign:"center", paddingTop:60, color:"var(--text-secondary)" }}>Loading…</div>
    </div>
  );
  if (error) return (
    <div><Topbar title="Profile" onNavigate={onNavigate} />
      <div style={{ textAlign:"center", paddingTop:60, color:"#ED4956" }}>⚠️ {error}</div>
    </div>
  );

  const initials = profile?.fullName?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() ?? "?";

  // For private accounts that we don't follow — hide posts
  const canSeePosts = isOwn || !profile?.isPrivate || isFollowing;

  return (
    <div>
      <Topbar title="Profile" onNavigate={onNavigate} />
      <div className="page-content">
        <div style={{ maxWidth:680 }}>

          {/* Avatar + actions row */}
          <div style={{ display:"flex", gap:32, alignItems:"center", marginBottom:20, padding:"20px 0" }}>
            {/* Profile picture */}
            <div style={{ position:"relative", flexShrink:0 }}>
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="avatar"
                    style={{ width:96, height:96, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--border)" }} />
                : <div className="avatar avatar-xl"
                    style={{ background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
                    {initials}
                  </div>
              }
            </div>

            {/* Info column */}
            <div style={{ flex:1 }}>
              {/* Name + username + buttons */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, flexWrap:"wrap" }}>
                <span style={{ fontSize:20, fontWeight:300, letterSpacing:-0.5 }}>{profile?.userName}</span>
                <span style={{ fontSize:13, color:"var(--text-muted)" }}>{profile?.fullName}</span>
                {isOwn ? (
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowEditProfile(true)}>Edit profile</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowChangePassword(true)}>🔒 Password</button>
                    {/* Privacy toggle — only own profile */}
                    <button className="btn btn-outline btn-sm" onClick={handleTogglePrivacy} disabled={privacyLoading}
                      style={{ color: profile?.isPrivate ? "#0095F6" : "var(--text-secondary)" }}>
                      {privacyLoading ? "…" : profile?.isPrivate ? "🔒 Private" : "🌐 Public"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleFollow} disabled={followLoading}>
                      {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                    </button>
                    {isFollowing && (
                      <button className="btn btn-outline btn-sm">Message</button>
                    )}
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display:"flex", gap:24, marginBottom:12 }}>
                <div style={{ textAlign:"center", cursor:"default" }}>
                  <span style={{ fontWeight:700 }}>{posts.length}</span>
                  <span style={{ color:"var(--text-secondary)", fontSize:14, marginLeft:4 }}>posts</span>
                </div>
                <div style={{ cursor:"pointer" }} onClick={() => setShowFollowers(true)}>
                  <span style={{ fontWeight:700 }}>{profile?.followerCount ?? 0}</span>
                  <span style={{ color:"var(--text-secondary)", fontSize:14, marginLeft:4 }}>followers</span>
                </div>
                <div style={{ cursor:"pointer" }} onClick={() => setShowFollowing(true)}>
                  <span style={{ fontWeight:700 }}>{profile?.followingCount ?? 0}</span>
                  <span style={{ color:"var(--text-secondary)", fontSize:14, marginLeft:4 }}>following</span>
                </div>
              </div>

              {/* Bio */}
              {profile?.bio && <div style={{ fontSize:14, lineHeight:1.5 }}>{profile.bio}</div>}
              {!isOwn && profile?.isPrivate && !isFollowing && (
                <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:8 }}>🔒 This account is private. Follow to see their posts.</div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderTop:"1px solid var(--border)", display:"flex", justifyContent:"center", gap:0, marginBottom:0 }}>
            {["posts","media"].map(t => (
              <div key={t} className={`tab ${activeTab===t?"active":""}`}
                style={{ flex:1, textAlign:"center", letterSpacing:1, fontSize:12, fontWeight:600 }}
                onClick={() => setActiveTab(t)}>
                {t === "posts" ? "📝 POSTS" : "🖼️ MEDIA"}
              </div>
            ))}
          </div>

          {/* Posts tab */}
          {activeTab === "posts" && (
            <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:1 }}>
              {!canSeePosts ? (
                <div style={{ textAlign:"center", padding:"48px 0" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>This Account is Private</div>
                  <div style={{ color:"var(--text-secondary)", fontSize:14 }}>Follow to see their photos and posts</div>
                </div>
              ) : loadingPosts ? (
                <div style={{ textAlign:"center", padding:32, color:"var(--text-secondary)" }}>Loading posts…</div>
              ) : posts.length === 0 ? (
                <div style={{ textAlign:"center", padding:"48px 0" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
                  <div style={{ fontWeight:600 }}>No Posts Yet</div>
                </div>
              ) : (
                posts.map(post => (
                  <div key={post.postId} className="post-card" style={{ borderRadius:0, border:"none", borderBottom:"1px solid var(--border)" }}>
                    <div className="post-body">{post.content}</div>
                    {post.hashtags && (
                      <div className="post-tags">
                        {post.hashtags.split(",").filter(Boolean).map(t => (
                          <span key={t} className="tag">{t.startsWith("#") ? t : `#${t}`}</span>
                        ))}
                      </div>
                    )}
                    {post.mediaUrl && post.mediaType === "IMAGE" && (
                      <img src={post.mediaUrl} alt="post"
                        style={{ width:"100%", maxHeight:360, objectFit:"cover", display:"block" }} />
                    )}
                    <div className="post-actions">
                      <button className="action-btn"><span>🤍</span> {post.likeCount ?? 0}</button>
                      <button className="action-btn"><span>💬</span> {post.commentCount ?? 0}</button>
                      <span style={{ marginLeft:"auto", fontSize:12, color:"var(--text-muted)" }}>{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Media tab */}
          {activeTab === "media" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, marginTop:2 }}>
              {!canSeePosts ? (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"48px 0" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
                  <div style={{ fontWeight:600 }}>Private Account</div>
                </div>
              ) : posts.filter(p => p.mediaUrl && p.mediaType === "IMAGE").length === 0 ? (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"48px 0", color:"var(--text-secondary)" }}>
                  No media posts yet
                </div>
              ) : (
                posts.filter(p => p.mediaUrl && p.mediaType === "IMAGE").map(p => (
                  <div key={p.postId} style={{ aspectRatio:"1", overflow:"hidden", cursor:"pointer" }}>
                    <img src={p.mediaUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showFollowers && <FollowModal type="followers" userId={targetUserId} onClose={() => setShowFollowers(false)} onNavigate={onNavigate} />}
      {showFollowing && <FollowModal type="following" userId={targetUserId} onClose={() => setShowFollowing(false)} onNavigate={onNavigate} />}
      {showEditProfile && profile && <EditProfileModal profile={profile} onClose={() => setShowEditProfile(false)} onSave={p => setProfile(p)} />}
      {showChangePassword && <ChangePasswordModal userId={targetUserId} onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}