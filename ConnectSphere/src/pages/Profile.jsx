import { useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { userApi, postApi, followApi, likeApi, commentApi } from "../services/api";

function timeAgo(d) {
  const m=Math.floor((Date.now()-new Date(d))/60000);
  if(m<1) return "Just now"; if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

const GRADIENTS=["linear-gradient(135deg,#f09433,#bc1888)","linear-gradient(135deg,#0095F6,#1877F2)","linear-gradient(135deg,#7C3AED,#EC4899)","linear-gradient(135deg,#059669,#0891B2)","linear-gradient(135deg,#F59E0B,#EF4444)"];
const getG=id=>GRADIENTS[(id??0)%GRADIENTS.length];

// User info cache
const _uc = {};
async function fetchUser(id) {
  if(_uc[id]) return _uc[id];
  try { const u=await userApi.getById(id); _uc[id]=u; return u; } catch { return null; }
}


function InteractivePostCard({post,currentUser,onNavigate,onDelete}){
  const [liked,setLiked]     = useState(false);
  const [likeCount,setLikeCount] = useState(post.likeCount??0);
  const [cmtCount,setCmtCount]   = useState(post.commentCount??0);
  const [showCmts,setShowCmts]   = useState(false);
  const [cmts,setCmts]           = useState([]);
  const [cmtUsers,setCmtUsers]   = useState({});
  const [loadingCmts,setLoadingCmts] = useState(false);
  const [cmtText,setCmtText]     = useState("");
  const [postingCmt,setPostingCmt] = useState(false);
  const [likeLoading,setLikeLoading] = useState(false);

  useEffect(()=>{
    if(!currentUser?.userId) return;
    likeApi.hasLiked(currentUser.userId,post.postId)
      .then(d=>setLiked(d?.hasLiked??false)).catch(()=>{});
    // Real likeCount fetch karo
    likeApi.getLikeCount(post.postId)
      .then(d=>{ if(d?.count !== undefined) setLikeCount(d.count); })
      .catch(()=>{});
  },[post.postId,currentUser?.userId]);

  // Fetch real comment count on mount (post.commentCount may be stale/0)
  useEffect(()=>{
    commentApi.getByPost(post.postId)
      .then(d=>{ const list=Array.isArray(d)?d:[]; setCmtCount(list.length); })
      .catch(()=>{});
  },[post.postId]);

  const handleLike=async()=>{
    if(likeLoading||!currentUser?.userId) return;
    const was=liked;
    setLiked(!was); setLikeCount(p=>was?Math.max(0,p-1):p+1);
    setLikeLoading(true);
    try{
      const result = await likeApi.toggle(currentUser.userId, post.postId, post.userId);
      // Backend se sync karo
      if(result?.likeCount !== undefined) setLikeCount(result.likeCount);
      if(result?.liked !== undefined) setLiked(result.liked);
    }
    catch{setLiked(was);setLikeCount(p=>was?p+1:Math.max(0,p-1));}
    finally{setLikeLoading(false);}
  };

  const toggleCmts=async()=>{
    const opening=!showCmts;
    setShowCmts(opening);
    if(opening&&cmts.length===0){
      setLoadingCmts(true);
      try{
        const d=await commentApi.getByPost(post.postId);
        const list=Array.isArray(d)?d:[];
        setCmts(list);setCmtCount(list.length);
        const fetched={};
        await Promise.allSettled(list.map(async c=>{
          const u=await fetchUser(c.userId);
          if(u) fetched[c.userId]=u;
        }));
        setCmtUsers(fetched);
      }
      catch{setCmts([]);}
      finally{setLoadingCmts(false);}
    }
  };

  const handleComment=async()=>{
    if(!cmtText.trim()||postingCmt||!currentUser?.userId) return;
    setPostingCmt(true);
    try{
      const c=await commentApi.add(post.postId,{userId:currentUser.userId,content:cmtText.trim(),postOwnerId:post.userId});
      setCmts(p=>[...p,c]);setCmtText("");setCmtCount(p=>p+1);
      if(!cmtUsers[currentUser.userId]){
        const u=await fetchUser(currentUser.userId);
        if(u) setCmtUsers(prev=>({...prev,[currentUser.userId]:u}));
      }
    }catch{}finally{setPostingCmt(false);}
  };

  return(
    <div style={{background:"#fff",border:"1px solid #DBDBDB",borderRadius:12,overflow:"hidden",marginBottom:14,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      {/* post content */}
      {post.content&&<div style={{padding:"12px 14px 8px",fontSize:15,lineHeight:1.6,color:"#111"}}>{post.content}</div>}
      {post.hashtags&&(
        <div style={{padding:"0 14px 10px",display:"flex",gap:6,flexWrap:"wrap"}}>
          {post.hashtags.split(",").filter(Boolean).map(t=>(
            <span key={t} style={{fontSize:13,color:"#0095F6"}}>{t.startsWith("#")?t:`#${t}`}</span>
          ))}
        </div>
      )}
      {post.mediaUrl&&post.mediaType==="IMAGE"&&(
        <img src={post.mediaUrl} alt="post" style={{width:"100%",maxHeight:450,objectFit:"cover",display:"block"}}/>
      )}
      {/* actions */}
      <div style={{display:"flex",alignItems:"center",padding:"8px 10px 6px",gap:2,borderTop:"1px solid #F0F0F0",marginTop:4}}>
        <button onClick={handleLike} disabled={likeLoading}
          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:"none",border:"none",cursor:"pointer",borderRadius:8,color:liked?"#ED4956":"#262626",fontWeight:liked?700:400,fontSize:13}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked?"#ED4956":"none"} stroke={liked?"#ED4956":"#262626"} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {likeCount}
        </button>
        <button onClick={toggleCmts}
          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:"none",border:"none",cursor:"pointer",borderRadius:8,color:"#262626",fontSize:13}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {cmtCount}
        </button>
        <span style={{marginLeft:"auto",fontSize:12,color:"#A8A8A8"}}>{timeAgo(post.createdAt)}</span>
        {onDelete&&(
          <button onClick={()=>onDelete(post.postId)}
            style={{background:"none",border:"none",color:"#A8A8A8",cursor:"pointer",fontSize:15,padding:"4px 6px",borderRadius:6,marginLeft:4}}>🗑️</button>
        )}
      </div>
      {/* comments */}
      {showCmts&&(
        <div style={{borderTop:"1px solid #F0F0F0",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          {loadingCmts&&<p style={{fontSize:13,color:"#A8A8A8"}}>Loading…</p>}
          {!loadingCmts&&cmts.length===0&&<p style={{fontSize:13,color:"#A8A8A8",textAlign:"center"}}>No comments yet</p>}
          {cmts.map(c=>(
            <div key={c.commentId} style={{display:"flex",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:getG(c.userId),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0,cursor:"pointer"}}
                onClick={()=>onNavigate("profile",c.userId)}>U</div>
              <div style={{background:"#F5F5F5",borderRadius:10,padding:"8px 12px",flex:1}}>
                <span style={{fontSize:13,fontWeight:700}}>{cmtUsers[c.userId]?.userName ?? cmtUsers[c.userId]?.fullName ?? `User ${c.userId}`}</span>
                <span style={{fontSize:13,marginLeft:6}}>{c.content}</span>
                <div style={{fontSize:11,color:"#A8A8A8",marginTop:2}}>{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:getG(currentUser?.userId),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0}}>
              {currentUser?.userName?.[0]?.toUpperCase()??"A"}
            </div>
            <input style={{flex:1,background:"#F5F5F5",border:"1px solid #DBDBDB",borderRadius:20,padding:"7px 14px",fontSize:13,outline:"none",color:"#111"}}
              placeholder="Add a comment…" value={cmtText}
              onChange={e=>setCmtText(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleComment()}/>
            <button style={{background:"none",border:"none",color:cmtText.trim()?"#0095F6":"#A8A8A8",fontWeight:700,fontSize:13,cursor:cmtText.trim()?"pointer":"default"}}
              onClick={handleComment} disabled={!cmtText.trim()||postingCmt}>
              {postingCmt?"…":"Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Follow List Modal ──────────────────────────────────────────────
function FollowModal({ type, userId, onClose, onNavigate }) {
  const [list, setList]     = useState([]);
  const [users, setUsers]   = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = type==="followers" ? followApi.getFollowers : followApi.getFollowing;
    fn(userId)
      .then(async d => {
        const items = Array.isArray(d) ? d : [];
        const ids = items.map(f => type==="followers" ? f.followerId : f.followeeId);
        const fetched = {};
        await Promise.allSettled(ids.map(async id => {
          const u = await fetchUser(id);
          if(u) fetched[id] = u;
        }));
        // Sirf whi items dikhao jinke user exist karte hain (deleted users filter karo)
        const validItems = items.filter(f => {
          const uid = type==="followers" ? f.followerId : f.followeeId;
          return !!fetched[uid];
        });
        setList(validItems);
        setUsers(fetched);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [userId, type]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"#fff", border:"1px solid #DBDBDB", borderRadius:12, width:380, maxHeight:500, overflow:"hidden", display:"flex", flexDirection:"column" }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #DBDBDB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:700, fontSize:16 }}>{type==="followers"?"Followers":"Following"}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#737373" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {loading && <div style={{ padding:32, textAlign:"center", color:"#A8A8A8" }}>Loading…</div>}
          {!loading && list.length===0 && (
            <div style={{ padding:40, textAlign:"center", color:"#A8A8A8", fontSize:14 }}>No {type} yet</div>
          )}
          {list.map((f,i) => {
            const uid = type==="followers" ? f.followerId : f.followeeId;
            const u = users[uid];
            const name = u?.fullName ?? u?.userName ?? `User ${uid}`;
            const uname = u?.userName ?? "";
            const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
            return (
              <div key={f.followId??i}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid #DBDBDB", cursor:"pointer" }}
                onClick={() => { onClose(); onNavigate("profile", uid); }}>
                {u?.avatarUrl
                  ? <img src={u.avatarUrl} alt="" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover" }} />
                  : <div style={{ width:44, height:44, borderRadius:"50%", background:getG(uid), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:16 }}>{initials}</div>
                }
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{name}</div>
                  {uname && <div style={{ fontSize:12, color:"#737373" }}>@{uname}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Change Password Modal ──────────────────────────────────────────
function ChangePasswordModal({ userId, onClose }) {
  const [form, setForm] = useState({ currentPassword:"", newPassword:"", confirmPassword:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]   = useState("");
  const [err, setErr]   = useState("");

  const save = async () => {
    if(form.newPassword!==form.confirmPassword){ setErr("Passwords don't match"); return; }
    if(form.newPassword.length<6){ setErr("Min 6 characters"); return; }
    setSaving(true); setErr(""); setMsg("");
    try {
      await userApi.changePassword(userId, { currentPassword:form.currentPassword, newPassword:form.newPassword });
      setMsg("Password changed!"); setTimeout(onClose, 1500);
    } catch(e){ setErr(e.message||"Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"#fff", border:"1px solid #DBDBDB", borderRadius:12, width:360, padding:24 }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontWeight:700, fontSize:16 }}>Change Password</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#737373" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[["currentPassword","Current password"],["newPassword","New password"],["confirmPassword","Confirm new password"]].map(([k,ph]) => (
            <input key={k} type="password" placeholder={ph}
              style={{ background:"#FAFAFA", border:"1px solid #DBDBDB", borderRadius:6, padding:"10px 12px", fontSize:14, outline:"none", width:"100%", color:"#111" }}
              value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
          ))}
          {err && <div style={{ color:"#ED4956", fontSize:13 }}>⚠️ {err}</div>}
          {msg && <div style={{ color:"#58C322", fontSize:13 }}>✅ {msg}</div>}
          <button onClick={save} disabled={saving||!form.currentPassword||!form.newPassword}
            style={{ background:"#0095F6", color:"#fff", border:"none", borderRadius:8, padding:"10px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            {saving?"Saving…":"Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ─────────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({ fullName:profile.fullName??"", bio:profile.bio??"", avatarUrl:profile.avatarUrl??"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr]   = useState("");

  const save = async () => {
    setSaving(true); setErr("");
    try {
      await userApi.updateProfile(profile.userId, { fullName:form.fullName||null, bio:form.bio||null, avatarUrl:form.avatarUrl||null });
      onSave({...profile,...form}); onClose();
    } catch(e){ setErr(e.message||"Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"#fff", border:"1px solid #DBDBDB", borderRadius:12, width:380, padding:24 }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontWeight:700, fontSize:16 }}>Edit Profile</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#737373" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[["fullName","Full Name","text"],["bio","Bio","textarea"],["avatarUrl","Profile Picture URL","text"]].map(([k,label,type]) => (
            <div key={k}>
              <label style={{ fontSize:12, color:"#737373", display:"block", marginBottom:4, fontWeight:500 }}>{label}</label>
              {type==="textarea"
                ? <textarea style={{ width:"100%", background:"#FAFAFA", border:"1px solid #DBDBDB", borderRadius:6, padding:"10px 12px", fontSize:14, outline:"none", resize:"none", minHeight:72, color:"#111" }}
                    value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
                : <input type="text" style={{ width:"100%", background:"#FAFAFA", border:"1px solid #DBDBDB", borderRadius:6, padding:"10px 12px", fontSize:14, outline:"none", color:"#111" }}
                    value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
              }
            </div>
          ))}
          {form.avatarUrl && (
            <img src={form.avatarUrl} alt="" onError={e=>e.target.style.display="none"}
              style={{ width:60, height:60, borderRadius:"50%", objectFit:"cover", border:"2px solid #DBDBDB" }} />
          )}
          {err && <div style={{ color:"#ED4956", fontSize:13 }}>⚠️ {err}</div>}
          <button onClick={save} disabled={saving}
            style={{ background:"#0095F6", color:"#fff", border:"none", borderRadius:8, padding:"10px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            {saving?"Saving…":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Profile ───────────────────────────────────────────────────
export default function Profile({ onNavigate, viewUserId }) {
  const { user: authUser } = useAuth();
  const targetId = viewUserId ?? authUser?.userId;
  const isOwn    = !viewUserId || viewUserId===authUser?.userId;

  const [profile, setProfile]   = useState(null);
  const [posts, setPosts]       = useState([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState("posts");

  // Follow state
  const [isFollowing, setIsFollowing]   = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Modals
  const [showFollowers, setShowFollowers]   = useState(false);
  const [showFollowing, setShowFollowing]   = useState(false);
  const [showEdit, setShowEdit]             = useState(false);
  const [showPwd, setShowPwd]               = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    setLoadingP(true); setLoadingPosts(true); setError("");

    userApi.getById(targetId)
      .then(d => { setProfile(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoadingP(false));

    postApi.getByUser(targetId)
      .then(d => setPosts(Array.isArray(d)?d:[]))
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));

    followApi.getFollowerCount(targetId)
      .then(d => setFollowerCount(d?.followerCount ?? 0))
      .catch(() => setFollowerCount(0));

    // followingCount: actual valid users se calculate karo (deleted users exclude)
    followApi.getFollowing(targetId)
      .then(async d => {
        const items = Array.isArray(d) ? d : [];
        // Har followee ka user fetch karo — 404 wale deleted hain
        const validCounts = await Promise.all(
          items.map(f => userApi.exists(f.followeeId ?? f.FolloweeId))
        );
        const validCount = validCounts.filter(Boolean).length;
        setFollowingCount(validCount);
      })
      .catch(() => setFollowingCount(0));

    if (!isOwn && authUser?.userId) {
      followApi.isFollowing(authUser.userId, targetId)
        .then(d => setIsFollowing(d?.isFollowing ?? false))
        .catch(() => {});
    }
  }, [targetId, isOwn, authUser?.userId]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followApi.unfollow(authUser.userId, targetId);
        setIsFollowing(false);
        setFollowerCount(p => Math.max(0, p-1));
      } else {
        await followApi.follow(authUser.userId, targetId);
        setIsFollowing(true);
        setFollowerCount(p => p+1);
      }
    } catch(e) { alert("Follow failed: "+e.message); }
    finally { setFollowLoading(false); }
  };

  const handleTogglePrivacy = async () => {
    setPrivacyLoading(true);
    try { await userApi.togglePrivacy(profile.userId); setProfile(p=>p?{...p,isPrivate:!p.isPrivate}:p); }
    catch {}
    finally { setPrivacyLoading(false); }
  };

  if (loadingP) return (
    <div><Topbar title="Profile" onNavigate={onNavigate} />
      <div style={{ textAlign:"center", paddingTop:80, color:"#737373" }}>Loading profile…</div>
    </div>
  );
  if (error) return (
    <div><Topbar title="Profile" onNavigate={onNavigate} />
      <div style={{ textAlign:"center", paddingTop:80, color:"#ED4956" }}>⚠️ {error}</div>
    </div>
  );

  const initials = profile?.fullName?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() ?? "?";
  const canSeePosts = isOwn || !profile?.isPrivate || isFollowing;

  return (
    <div>
      <Topbar title="Profile" onNavigate={onNavigate} />
      <div style={{ padding:"24px 20px", maxWidth:740 }}>

        {/* Profile Header */}
        <div style={{ display:"flex", gap:48, alignItems:"center", marginBottom:24, padding:"8px 0" }}>
          {/* Avatar */}
          <div style={{ flexShrink:0 }}>
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar"
                  style={{ width:100, height:100, borderRadius:"50%", objectFit:"cover", border:"3px solid #DBDBDB" }} />
              : <div style={{ width:100, height:100, borderRadius:"50%", background:getG(targetId), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:36, border:"3px solid #DBDBDB" }}>
                  {initials}
                </div>
            }
          </div>

          {/* Info */}
          <div style={{ flex:1 }}>
            {/* Username row */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" }}>
              <span style={{ fontSize:22, fontWeight:300 }}>{profile?.userName}</span>
              {isOwn ? (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button onClick={() => setShowEdit(true)}
                    style={{ background:"#EFEFEF", border:"none", borderRadius:8, padding:"6px 14px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                    Edit profile
                  </button>
                  <button onClick={() => setShowPwd(true)}
                    style={{ background:"#EFEFEF", border:"none", borderRadius:8, padding:"6px 14px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                    🔒 Password
                  </button>
                  <button onClick={handleTogglePrivacy} disabled={privacyLoading}
                    style={{ background:"#EFEFEF", border:"none", borderRadius:8, padding:"6px 14px", fontWeight:600, fontSize:13, cursor:"pointer", color: profile?.isPrivate?"#0095F6":"#737373" }}>
                    {privacyLoading?"…": profile?.isPrivate?"🔒 Private":"🌐 Public"}
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={handleFollow} disabled={followLoading}
                    style={{ background: isFollowing?"#EFEFEF":"#0095F6", color: isFollowing?"#111":"#fff", border:"none", borderRadius:8, padding:"7px 18px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                    {followLoading?"…": isFollowing?"Following":"Follow"}
                  </button>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display:"flex", gap:32, marginBottom:14 }}>
              <div>
                <span style={{ fontWeight:700 }}>{posts.length}</span>
                <span style={{ color:"#737373", fontSize:14, marginLeft:4 }}>posts</span>
              </div>
              <div style={{ cursor:"pointer" }} onClick={() => setShowFollowers(true)}>
                <span style={{ fontWeight:700 }}>{followerCount}</span>
                <span style={{ color:"#737373", fontSize:14, marginLeft:4 }}>followers</span>
              </div>
              <div style={{ cursor:"pointer" }} onClick={() => setShowFollowing(true)}>
                <span style={{ fontWeight:700 }}>{followingCount}</span>
                <span style={{ color:"#737373", fontSize:14, marginLeft:4 }}>following</span>
              </div>
            </div>

            {/* Bio */}
            <div style={{ fontSize:14, fontWeight:600 }}>{profile?.fullName}</div>
            {profile?.bio && <div style={{ fontSize:14, marginTop:4, lineHeight:1.5 }}>{profile.bio}</div>}
            {!isOwn && profile?.isPrivate && !isFollowing && (
              <div style={{ fontSize:13, color:"#737373", marginTop:6 }}>🔒 This account is private.</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderTop:"1px solid #DBDBDB", display:"flex", justifyContent:"center", padding:"16px 0" }}>
          <div
            style={{ padding:"8px 32px", fontSize:13, fontWeight:700, letterSpacing:1, textTransform:"uppercase", cursor:"pointer", borderRadius:8, background:"var(--ig-blue)", color:"#fff", border:"none" }}>
            Posts
          </div>
        </div>

        {/* Posts */}
        {tab==="posts" && (
          <div style={{ marginTop:16 }}>
            {!canSeePosts ? (
              <div style={{ textAlign:"center", padding:"48px 0" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>This Account is Private</div>
                <div style={{ color:"#737373", fontSize:14 }}>Follow to see their posts</div>
              </div>
            ) : loadingPosts ? (
              <div style={{ textAlign:"center", padding:32, color:"#737373" }}>Loading posts…</div>
            ) : posts.length===0 ? (
              <div style={{ textAlign:"center", padding:"48px 0" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
                <div style={{ fontWeight:600 }}>No Posts Yet</div>
              </div>
            ) : (
              posts.map(post => (
                <InteractivePostCard key={post.postId} post={post} currentUser={authUser} onNavigate={onNavigate}
                  onDelete={isOwn ? async(id)=>{ try{await postApi.delete(id);setPosts(p=>p.filter(x=>x.postId!==id));}catch{} } : null} />
              ))
            )}
          </div>
        )}

        {/* Media grid */}
        {tab==="media" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:3, marginTop:4 }}>
            {!canSeePosts ? (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"48px 0" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
                <div style={{ fontWeight:700 }}>Private Account</div>
              </div>
            ) : posts.filter(p=>p.mediaUrl&&p.mediaType==="IMAGE").length===0 ? (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"48px 0", color:"#737373" }}>No media yet</div>
            ) : (
              posts.filter(p=>p.mediaUrl&&p.mediaType==="IMAGE").map(p => (
                <div key={p.postId} style={{ aspectRatio:"1", overflow:"hidden", cursor:"pointer" }}>
                  <img src={p.mediaUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showFollowers && <FollowModal type="followers" userId={targetId} onClose={()=>setShowFollowers(false)} onNavigate={onNavigate} />}
      {showFollowing && <FollowModal type="following" userId={targetId} onClose={()=>setShowFollowing(false)} onNavigate={onNavigate} />}
      {showEdit && profile && <EditProfileModal profile={profile} onClose={()=>setShowEdit(false)} onSave={p=>setProfile(p)} />}
      {showPwd && <ChangePasswordModal userId={targetId} onClose={()=>setShowPwd(false)} />}
    </div>
  );
}