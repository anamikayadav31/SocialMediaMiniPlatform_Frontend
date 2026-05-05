import { useState, useEffect } from "react";
import Topbar from "../components/Topbar";
import { userApi } from "../services/api";

function getInitials(fullName, userName) {
  if (fullName) return fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (userName?.[0] ?? "?").toUpperCase();
}

const GRADIENTS = [
  "linear-gradient(135deg,#7C3AED,#EC4899)",
  "linear-gradient(135deg,#059669,#0891B2)",
  "linear-gradient(135deg,#DC2626,#D97706)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#0EA5E9,#6366F1)",
];
function gradient(id) { return GRADIENTS[id % GRADIENTS.length]; }

export default function AdminDashboard({ onNavigate }) {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    setLoading(true);
    userApi.getAllUsers()
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setError("Users load nahi hue. Backend connected hai?"))
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 2500);
  };

  const handleSuspend = async (u) => {
    try {
      if (u.isActive) {
        await userApi.suspendUser(u.userId);
        setUsers(prev => prev.map(x => x.userId === u.userId ? { ...x, isActive: false } : x));
        showMsg(`@${u.userName} suspended.`);
      } else {
        await userApi.activateUser(u.userId);
        setUsers(prev => prev.map(x => x.userId === u.userId ? { ...x, isActive: true } : x));
        showMsg(`@${u.userName} activated.`);
      }
    } catch { showMsg("Action failed. Try again."); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`"${u.fullName || u.userName}" ko permanently delete karna chahte ho?`)) return;
    try {
      await userApi.adminDeleteUser(u.userId);
      setUsers(prev => prev.filter(x => x.userId !== u.userId));
      showMsg(`@${u.userName} deleted.`);
    } catch { showMsg("Delete failed. Try again."); }
  };

  const filtered = users.filter(u =>
    !search ||
    u.userName?.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Topbar title="Admin Panel" onNavigate={onNavigate} />
      <div className="page-content">

        <div className="broadcast-banner" style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontFamily: "var(--font-display)" }}>Manage Users</div>
            <div className="text-secondary text-sm">All registered users on ConnectSphere</div>
          </div>
          <span className="badge badge-warning" style={{ marginLeft: "auto" }}>Admin Access</span>
        </div>

        {actionMsg && (
          <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 8, padding: "10px 16px", color: "#4ade80", fontSize: 13, marginBottom: 16 }}>
            ✅ {actionMsg}
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "10px 16px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div className="widget-title" style={{ margin: 0 }}>
              All Users {!loading && `(${filtered.length})`}
            </div>
            <input
              className="input"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220, padding: "6px 12px" }}
            />
          </div>

          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              Loading users...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              {search ? "Koi user nahi mila." : "Koi user registered nahi hai."}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.userId}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-xs" style={{ background: gradient(u.userId) }}>
                            {getInitials(u.fullName, u.userName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName || u.userName}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>@{u.userName}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "Admin" ? "badge-warning" : "badge-gray"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? "badge-success" : "badge-danger"}`}>
                          {u.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td>
                        {u.role !== "Admin" ? (
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" style={{ padding: "3px 10px", fontSize: 12 }}
                              onClick={() => handleSuspend(u)}>
                              {u.isActive ? "🚫 Suspend" : "✅ Activate"}
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              style={{ padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer" }}>
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>— Admin —</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}