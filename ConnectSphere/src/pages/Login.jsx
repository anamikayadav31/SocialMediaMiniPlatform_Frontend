import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password });
      onNavigate("feed");
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effect" />
      <div className="auth-card animate-in">
        <div className="auth-logo"><span style={{ fontSize: 36 }}>🌐</span></div>
        <div className="logo-text" style={{ textAlign: "center", fontSize: 28, marginBottom: 4 }}>ConnectSphere</div>
        <p className="auth-subtitle">Share. Connect. Discover. Your World.</p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 8 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Email address</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              required autoComplete="email" />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              required autoComplete="current-password" />
          </div>
          <div className="flex justify-between items-center" style={{ fontSize: 13 }}>
            <label className="flex items-center gap-2 text-secondary" style={{ cursor: "pointer" }}>
              <input type="checkbox" /> Remember me
            </label>
            <span className="text-primary-color" style={{ cursor: "pointer" }}>Forgot password?</span>
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
            style={{ justifyContent: "center", width: "100%", marginTop: 4 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">or continue with</div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" style={{ justifyContent: "center" }}>🔵 Google</button>
          <button className="btn btn-outline flex-1" style={{ justifyContent: "center" }}>⚫ GitHub</button>
        </div>

        <p className="text-secondary text-sm" style={{ textAlign: "center", marginTop: 24 }}>
          Don't have an account?{" "}
          <span className="text-primary-color" style={{ cursor: "pointer", fontWeight: 600 }}
            onClick={() => onNavigate("register")}>Sign up free</span>
        </p>
      </div>
    </div>
  );
}