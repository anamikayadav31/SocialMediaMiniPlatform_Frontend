import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Register({ onNavigate }) {
  const { register } = useAuth();
  const [form, setForm]       = useState({ username: "", fullName: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 6)       { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      await register({ userName: form.username.trim(), fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
      onNavigate("feed");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = "text", placeholder = "") => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input className="input" type={type} placeholder={placeholder}
        value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required />
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-bg-effect" />
      <div className="auth-card animate-in">
        <div className="auth-logo"><span style={{ fontSize: 36 }}>🌐</span></div>
        <div className="logo-text" style={{ textAlign: "center", fontSize: 28, marginBottom: 4 }}>Join ConnectSphere</div>
        <p className="auth-subtitle">Create your account and start connecting</p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 8 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {field("username", "Username",       "text",     "cooluser123")}
          {field("fullName", "Full Name",      "text",     "Your full name")}
          {field("email",    "Email address",  "email",    "you@example.com")}
          {field("password", "Password",       "password", "Min. 6 characters")}
          {field("confirm",  "Confirm Password","password", "Repeat password")}

          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            By signing up, you agree to our{" "}
            <span className="text-primary-color" style={{ cursor: "pointer" }}>Terms of Service</span>
            {" "}and{" "}
            <span className="text-primary-color" style={{ cursor: "pointer" }}>Privacy Policy</span>.
          </p>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
            style={{ justifyContent: "center", width: "100%", marginTop: 4 }}>
            {loading ? "Creating account…" : "Create Account 🚀"}
          </button>
        </form>

        <p className="text-secondary text-sm" style={{ textAlign: "center", marginTop: 24 }}>
          Already have an account?{" "}
          <span className="text-primary-color" style={{ cursor: "pointer", fontWeight: 600 }}
            onClick={() => onNavigate("login")}>Sign in</span>
        </p>
      </div>
    </div>
  );
}