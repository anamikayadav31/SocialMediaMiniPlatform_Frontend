import { useState, useEffect, useRef } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { notifApi, followApi, userApi } from "../services/api";

const TYPE_MAP = {
  "LIKE_POST":       { icon: "❤️",  bg: "rgba(237,73,86,0.1)",   label: "Like" },
  "LIKE_COMMENT":    { icon: "❤️",  bg: "rgba(237,73,86,0.1)",   label: "Like" },
  "NEW_COMMENT":     { icon: "💬",  bg: "rgba(0,149,246,0.1)",   label: "Comment" },
  "NEW_REPLY":       { icon: "↩️",  bg: "rgba(0,149,246,0.1)",   label: "Reply" },
  "NEW_FOLLOWER":    { icon: "👤",  bg: "rgba(88,195,34,0.1)",   label: "Follow" },
  "FOLLOW_REQUEST":  { icon: "🔔",  bg: "rgba(255,193,7,0.1)",   label: "Follow Request" },
  "FOLLOW_ACCEPTED": { icon: "✅",  bg: "rgba(88,195,34,0.1)",   label: "Follow Accepted" },
  "MENTION":         { icon: "🏷️", bg: "rgba(255,193,7,0.1)",   label: "Mention" },
  "PLATFORM":        { icon: "🎉",  bg: "rgba(139,92,246,0.1)",  label: "System" },
  "LIKE":            { icon: "❤️",  bg: "rgba(237,73,86,0.1)",   label: "Like" },
  "FOLLOW":          { icon: "👤",  bg: "rgba(88,195,34,0.1)",   label: "Follow" },
  "COMMENT":         { icon: "💬",  bg: "rgba(0,149,246,0.1)",   label: "Comment" },
  "SYSTEM":          { icon: "🎉",  bg: "rgba(139,92,246,0.1)",  label: "System" },
};

function timeAgo(d) {
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if(m<1) return "Just now"; if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

// "User 13 liked your post." → "john_doe liked your post."
function replaceUserIdWithName(message, actorId, userName) {
  if (!message || !actorId || !userName) return message;
  // Replace "User {actorId}" pattern with real username
  return message.replace(new RegExp(`User\\s+${actorId}`, "gi"), userName);
}

export default function Notifications({ onNavigate }) {
  const { user } = useAuth();
  const [notifs, setNotifs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");
  const [pendingMap, setPendingMap] = useState({});
  const [actioning, setActioning]   = useState({});
  // Cache: actorId → userName
  const userCache = useRef({});

  // Fetch username by userId, with caching
  const fetchUserName = async (actorId) => {
    if (!actorId) return null;
    if (userCache.current[actorId]) return userCache.current[actorId];
    try {
      const data = await userApi.getById(actorId);
      const name = data?.userName || data?.fullName || data?.username || null;
      if (name) userCache.current[actorId] = name;
      return name;
    } catch {
      return null;
    }
  };

  // After notifs load, fetch usernames for all unique actorIds and update messages
  const enrichWithUserNames = async (rawNotifs) => {
    const uniqueActorIds = [...new Set(rawNotifs.map(n => n.actorId).filter(Boolean))];
    // Fetch all in parallel
    await Promise.allSettled(uniqueActorIds.map(id => fetchUserName(id)));

    // Now replace "User {id}" in each message
    return rawNotifs.map(n => {
      if (!n.actorId) return n;
      const userName = userCache.current[n.actorId];
      if (!userName) return n;
      return {
        ...n,
        message: replaceUserIdWithName(n.message ?? n.content ?? "", n.actorId, userName),
      };
    });
  };

  useEffect(() => {
    if (!user?.userId) return;
    notifApi.getAll(user.userId)
      .then(async d => {
        const raw = Array.isArray(d) ? d : [];
        const enriched = await enrichWithUserNames(raw);
        setNotifs(enriched);
      })
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));

    followApi.getPending(user.userId)
      .then(pending => {
        if (!Array.isArray(pending)) return;
        const map = {};
        pending.forEach(f => { map[f.followerId] = f.followId; });
        setPendingMap(map);
      })
      .catch(() => {});
  }, [user?.userId]);

  const markRead = async (id) => {
    try {
      await notifApi.markRead(id);
      setNotifs(p => p.map(n => n.notificationId===id ? {...n, isRead:true} : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notifApi.markAllRead(user.userId);
      setNotifs(p => p.map(n => ({...n, isRead:true})));
    } catch {
      const unread = notifs.filter(n => !n.isRead);
      await Promise.allSettled(unread.map(n => notifApi.markRead(n.notificationId)));
      setNotifs(p => p.map(n => ({...n, isRead:true})));
    }
  };

  const handleAccept = async (n) => {
    const followId = pendingMap[n.actorId];
    if (!followId) return;
    setActioning(p => ({...p, [n.notificationId]: "accepting"}));
    try {
      await followApi.accept(followId);
      setNotifs(p => p.map(x => x.notificationId === n.notificationId
        ? {...x, type: "FOLLOW_ACCEPTED", message: x.message.replace("sent you a follow request", "is now following you"), isRead: true}
        : x));
      setPendingMap(p => { const c={...p}; delete c[n.actorId]; return c; });
    } catch {}
    finally { setActioning(p => ({...p, [n.notificationId]: null})); }
  };

  const handleReject = async (n) => {
    const followId = pendingMap[n.actorId];
    if (!followId) return;
    setActioning(p => ({...p, [n.notificationId]: "rejecting"}));
    try {
      await followApi.reject(followId);
      setNotifs(p => p.filter(x => x.notificationId !== n.notificationId));
      setPendingMap(p => { const c={...p}; delete c[n.actorId]; return c; });
      await notifApi.delete(n.notificationId).catch(()=>{});
    } catch {}
    finally { setActioning(p => ({...p, [n.notificationId]: null})); }
  };

  const filtered = filter === "unread"
    ? notifs.filter(n => !n.isRead)
    : filter === "mentions"
    ? notifs.filter(n => n.type === "MENTION")
    : filter === "system"
    ? notifs.filter(n => n.type === "PLATFORM" || n.type === "SYSTEM")
    : notifs;

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div>
      <Topbar title="Notifications" onNavigate={onNavigate} />
      <div className="page-content" style={{ maxWidth:640 }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <h1 style={{ fontSize:20, fontWeight:700 }}>Notifications</h1>
            {unreadCount > 0 && (
              <span style={{ background:"var(--ig-red)", color:"#fff", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999, minWidth:20, textAlign:"center" }}>
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button style={{ background:"none", border:"none", color:"var(--ig-blue)", fontSize:13, fontWeight:600, cursor:"pointer" }}
              onClick={markAllRead}>Mark all read</button>
          )}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {["all","unread","mentions","system"].map(f => (
            <button key={f}
              style={{ background: filter===f ? "var(--text-primary)" : "var(--bg-elevated)", color: filter===f ? "var(--bg)" : "var(--text-secondary)", border:"none", borderRadius:999, padding:"5px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}
              onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
          {loading && (
            <div style={{ padding:40, textAlign:"center", color:"var(--text-muted)" }}>Loading…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding:"48px 0", textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
              <div style={{ fontWeight:600, marginBottom:4 }}>No notifications</div>
              <div style={{ fontSize:13, color:"var(--text-muted)" }}>
                {filter !== "all" ? `No ${filter} notifications` : "You're all caught up!"}
              </div>
            </div>
          )}

          {!loading && filtered.map((n, i) => {
            const meta      = TYPE_MAP[n.type] ?? TYPE_MAP["SYSTEM"];
            const isRequest = n.type === "FOLLOW_REQUEST" && pendingMap[n.actorId];
            const acting    = actioning[n.notificationId];
            return (
              <div key={n.notificationId ?? i}
                style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"14px 16px",
                  borderBottom: i<filtered.length-1 ? "1px solid var(--border)" : "none",
                  background: !n.isRead ? "rgba(0,149,246,0.04)" : "transparent",
                  cursor: isRequest ? "default" : "pointer" }}
                onClick={() => !isRequest && markRead(n.notificationId)}>

                <div style={{ width:44, height:44, borderRadius:"50%", background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {meta.icon}
                </div>

                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, lineHeight:1.5 }}>{n.message ?? n.content ?? "New notification"}</div>
                  {n.createdAt && <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{timeAgo(n.createdAt)}</div>}

                  {isRequest && (
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <button
                        disabled={!!acting}
                        onClick={e => { e.stopPropagation(); handleAccept(n); }}
                        style={{ background:"var(--ig-blue)", color:"#fff", border:"none", borderRadius:8, padding:"5px 16px", fontSize:13, fontWeight:600, cursor:"pointer", opacity: acting ? 0.6 : 1 }}>
                        {acting === "accepting" ? "..." : "✓ Accept"}
                      </button>
                      <button
                        disabled={!!acting}
                        onClick={e => { e.stopPropagation(); handleReject(n); }}
                        style={{ background:"var(--bg-elevated)", color:"var(--text-primary)", border:"1px solid var(--border)", borderRadius:8, padding:"5px 16px", fontSize:13, fontWeight:600, cursor:"pointer", opacity: acting ? 0.6 : 1 }}>
                        {acting === "rejecting" ? "..." : "✕ Reject"}
                      </button>
                    </div>
                  )}
                </div>

                {!n.isRead && !isRequest && (
                  <div style={{ width:8, height:8, background:"var(--ig-blue)", borderRadius:"50%", flexShrink:0, marginTop:6 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}