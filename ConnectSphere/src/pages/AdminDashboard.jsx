import { useState } from "react";
import Topbar from "../components/Topbar";

const USERS = [
  { id: 1, name: "Priya Sharma", handle: "@priya_s", email: "priya@email.com", role: "User", status: "Active", posts: 142, joined: "Jan 2026", initials: "PS", gradient: "linear-gradient(135deg,#7C3AED,#EC4899)" },
  { id: 2, name: "Rahul Dev", handle: "@rahuldev", email: "rahul@email.com", role: "User", status: "Active", posts: 89, joined: "Feb 2026", initials: "RD", gradient: "linear-gradient(135deg,#059669,#0891B2)" },
  { id: 3, name: "Sneha Patel", handle: "@sneha_p", email: "sneha@email.com", role: "Moderator", status: "Active", posts: 203, joined: "Mar 2026", initials: "SP", gradient: "linear-gradient(135deg,#DC2626,#D97706)" },
  { id: 4, name: "Arjun Mehta", handle: "@arjun_m", email: "arjun@email.com", role: "User", status: "Suspended", posts: 45, joined: "Mar 2026", initials: "AM", gradient: "linear-gradient(135deg,#F59E0B,#EF4444)" },
  { id: 5, name: "Kavya Reddy", handle: "@kavya_r", email: "kavya@email.com", role: "User", status: "Active", posts: 67, joined: "Apr 2026", initials: "KR", gradient: "linear-gradient(135deg,#8B5CF6,#EC4899)" },
];

const AUDIT_LOGS = [
  { id: 1, action: "User Suspended", target: "@arjun_m", admin: "Admin", time: "10 min ago", type: "warning" },
  { id: 2, action: "Post Deleted", target: "Post #1042", admin: "Admin", time: "1h ago", type: "danger" },
  { id: 3, action: "Broadcast Sent", target: "All Users", admin: "Admin", time: "2h ago", type: "info" },
  { id: 4, action: "User Role Changed", target: "@sneha_p → Moderator", admin: "Admin", time: "3h ago", type: "success" },
  { id: 5, action: "Comment Deleted", target: "Comment #892", admin: "Admin", time: "5h ago", type: "danger" },
];

const STATS = [
  { icon: "👥", value: "2,841", label: "Total Users", change: "+12%", up: true },
  { icon: "📝", value: "18,492", label: "Total Posts", change: "+8%", up: true },
  { icon: "🔥", value: "1,203", label: "Daily Active", change: "+5%", up: true },
  { icon: "🚨", value: "23", label: "Reports Pending", change: "+3", up: false },
];

export default function AdminDashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState(USERS);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSent, setBroadcastSent] = useState(false);

  const toggleSuspend = (id) => {
    setUsers(users.map(u => u.id === id
      ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" }
      : u));
  };

  const deleteUser = (id) => setUsers(users.filter(u => u.id !== id));

  const sendBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => { setBroadcastSent(false); setBroadcastMsg(""); }, 2000);
  };

  return (
    <div>
      <Topbar title="Admin Panel" onNavigate={onNavigate} />
      <div className="page-content">
        {/* Header */}
        <div className="broadcast-banner">
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontFamily: "var(--font-display)" }}>Admin Control Center</div>
            <div className="text-secondary text-sm">Manage users, posts, and platform health</div>
          </div>
          <span className="badge badge-warning" style={{ marginLeft: "auto" }}>Admin Access</span>
        </div>

        {/* Stats */}
        <div className="stats-grid mb-6">
          {STATS.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-change ${s.up ? "stat-up" : "stat-down"}`}>
                {s.up ? "↑" : "↓"} {s.change} this week
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs mb-6">
          {["overview", "users", "broadcast", "audit"].map(t => (
            <div key={t} className={`tab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}>
              {{ overview: "📊 Overview", users: "👥 Users", broadcast: "📢 Broadcast", audit: "📋 Audit Logs" }[t]}
            </div>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card">
              <div className="widget-title">🔥 Trending Hashtags</div>
              {["#ConnectSphere", "#WebDev", "#TechIndia", "#CleanCode", "#ReactJS"].map((tag, i) => (
                <div key={tag} className="flex items-center justify-between" style={{ padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                  <span className="text-sm font-medium">{tag}</span>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 80, height: 4, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(5 - i) * 20}%`, background: "var(--primary)", borderRadius: 4 }} />
                    </div>
                    <span className="text-xs text-muted">{[12400, 8900, 6200, 4800, 3100][i]}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="widget-title">📊 Platform Analytics</div>
              {[
                { label: "Most Liked Post", value: "Post by @sneha_p (521 likes)" },
                { label: "New Users Today", value: "47 users" },
                { label: "Posts Today", value: "892 posts" },
                { label: "Comments Today", value: "2,341 comments" },
                { label: "Active Sessions", value: "234 users online" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm text-secondary">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div className="widget-title" style={{ margin: 0 }}>All Users ({users.length})</div>
              <div className="flex gap-2">
                <input className="input" placeholder="Search users..." style={{ width: 200, padding: "6px 12px" }} />
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Posts</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-xs" style={{ background: u.gradient }}>{u.initials}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.handle}</div>
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td><span className={`badge ${u.role === "Moderator" ? "badge-primary" : "badge-gray"}`}>{u.role}</span></td>
                      <td>{u.posts}</td>
                      <td>{u.joined}</td>
                      <td><span className={`badge ${u.status === "Active" ? "badge-success" : "badge-danger"}`}>{u.status}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 12 }}
                            onClick={() => toggleSuspend(u.id)}>
                            {u.status === "Active" ? "🚫 Suspend" : "✅ Activate"}
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ padding: "3px 8px", fontSize: 12 }}
                            onClick={() => deleteUser(u.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Broadcast Tab */}
        {activeTab === "broadcast" && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="widget-title">📢 Send Broadcast Notification</div>
            <p className="text-secondary text-sm mb-4">Send a message to all platform users instantly.</p>
            <div className="input-group mb-4">
              <label className="input-label">Notification Title</label>
              <input className="input" placeholder="e.g. Platform Maintenance Notice" />
            </div>
            <div className="input-group mb-4">
              <label className="input-label">Message</label>
              <textarea className="input" placeholder="Write your broadcast message here..."
                value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                style={{ minHeight: 120 }} />
            </div>
            <div className="input-group mb-6">
              <label className="input-label">Target Audience</label>
              <select className="input">
                <option>All Users (2,841)</option>
                <option>Active Users Only (1,203)</option>
                <option>New Users (last 7 days)</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={sendBroadcast} disabled={!broadcastMsg.trim()}>
              {broadcastSent ? "✅ Broadcast Sent!" : "📢 Send Broadcast"}
            </button>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "audit" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div className="widget-title" style={{ margin: 0 }}>📋 Audit Logs</div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Performed By</th>
                  <th>Time</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_LOGS.map(log => (
                  <tr key={log.id}>
                    <td className="text-muted">#{log.id}</td>
                    <td style={{ fontWeight: 600 }}>{log.action}</td>
                    <td>{log.target}</td>
                    <td>{log.admin}</td>
                    <td className="text-muted">{log.time}</td>
                    <td><span className={`badge badge-${log.type === "warning" ? "warning" : log.type === "danger" ? "danger" : log.type === "success" ? "success" : "primary"}`}>{log.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}