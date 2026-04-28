import { useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { notifApi } from "../services/api";

const ICON_MAP = {
  "LIKE":    { icon: "❤️", bg: "rgba(244,63,94,0.15)" },
  "FOLLOW":  { icon: "👤", bg: "rgba(108,63,245,0.15)" },
  "COMMENT": { icon: "💬", bg: "rgba(59,130,246,0.15)" },
  "SHARE":   { icon: "🔁", bg: "rgba(34,197,94,0.15)" },
  "MENTION": { icon: "🏷️", bg: "rgba(245,166,35,0.15)" },
  "SYSTEM":  { icon: "🎉", bg: "rgba(139,92,246,0.15)" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications({ onNavigate }) {
  const { user } = useAuth();
  const [notifs, setNotifs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  // FIX: Load real notifications from API — was 100% hardcoded mock data
  useEffect(() => {
    if (!user?.userId) return;
    notifApi.getAll(user.userId)
      .then(data => setNotifs(Array.isArray(data) ? data : []))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, [user?.userId]);

  const markRead = async (notifId) => {
    try {
      await notifApi.markRead(notifId);
      setNotifs(prev => prev.map(n =>
        n.notificationId === notifId ? { ...n, isRead: true } : n
      ));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    const unread = notifs.filter(n => !n.isRead);
    await Promise.allSettled(unread.map(n => notifApi.markRead(n.notificationId)));
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filtered = activeFilter === "unread"
    ? notifs.filter(n => !n.isRead)
    : activeFilter === "mentions"
    ? notifs.filter(n => n.type === "MENTION")
    : activeFilter === "system"
    ? notifs.filter(n => n.type === "SYSTEM")
    : notifs;

  const unreadCount = notifs.filter(n => !n.isRead).length;

  if (loading) return (
    <div>
      <Topbar title="Notifications" onNavigate={onNavigate} />
      <div className="page-content" style={{ textAlign: "center", paddingTop: 60 }}>
        <p className="text-secondary">Loading notifications…</p>
      </div>
    </div>
  );

  return (
    <div>
      <Topbar title="Notifications" onNavigate={onNavigate} />
      <div className="page-content" style={{ maxWidth: 680 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="page-title">Notifications</h1>
            {unreadCount > 0 && <span className="badge badge-primary">{unreadCount} new</span>}
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>✓ Mark all read</button>
          )}
        </div>

        <div className="tabs mb-4" style={{ width: "fit-content" }}>
          {["all", "unread", "mentions", "system"].map(f => (
            <div key={f} className={`tab ${activeFilter === f ? "active" : ""}`}
              onClick={() => setActiveFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: "0 24px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
              <div className="text-secondary">No notifications here</div>
            </div>
          ) : (
            filtered.map((n, i) => {
              const meta = ICON_MAP[n.type] ?? ICON_MAP["SYSTEM"];
              return (
                <div key={n.notificationId ?? i}
                  className={`notif-item ${!n.isRead ? "unread" : ""}`}
                  style={{ paddingLeft: !n.isRead ? 16 : 0 }}
                  onClick={() => markRead(n.notificationId)}>
                  <div className="notif-icon" style={{ background: meta.bg }}>{meta.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="notif-text">{n.message ?? n.content ?? "New notification"}</div>
                    <div className="notif-time">{n.createdAt ? timeAgo(n.createdAt) : ""}</div>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: 8, height: 8, background: "var(--primary)", borderRadius: "50%", flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}