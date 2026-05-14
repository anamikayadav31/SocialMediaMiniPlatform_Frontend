import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

export default function Register({ onNavigate }) {
  const { register, googleLogin } = useAuth();
  const [form, setForm]       = useState({ username: "", fullName: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleGoogleCredential = async (response) => {
    if (!response?.credential) {
      clearLoading();
      return;
    }
    try {
      await googleLogin(response.credential);
      onNavigate("feed");
    } catch (err) {
      setError(err.message || "Google sign-up failed.");
    } finally {
      clearLoading();
    }
  };

  const {
    gsiReady,
    gLoading,
    gError,
    handleGoogleClick,
    clearLoading,
  } = useGoogleAuth(handleGoogleCredential);

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

  const displayError = error || gError;

  return (
    <div className="auth-page">
      <div className="auth-bg-effect" />
      <div className="auth-card animate-in" style={{ width: "100%", maxWidth: 440 }}>
        <div className="auth-logo"><span style={{ fontSize: 36 }}>🌐</span></div>
        <div className="logo-text" style={{ textAlign: "center", fontSize: 28, marginBottom: 4 }}>Join ConnectSphere</div>
        <p className="auth-subtitle">Create your account and start connecting</p>

        {displayError && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 8 }}>
            ⚠️ {displayError}
          </div>
        )}

        <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {field("username", "Username",         "text",     "cooluser123")}
          {field("fullName", "Full Name",         "text",     "Your full name")}
          {field("email",    "Email address",     "email",    "you@example.com")}
          {field("password", "Password",          "password", "Min. 6 characters")}
          {field("confirm",  "Confirm Password",  "password", "Repeat password")}

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

          <div className="auth-divider">or continue with</div>

          <button
            type="button"
            className="btn btn-outline"
            style={{
              justifyContent: "center", width: "100%", gap: 8,
              display: "flex", alignItems: "center",
              opacity: (!gsiReady || gLoading) ? 0.65 : 1,
              cursor: (!gsiReady || gLoading) ? "not-allowed" : "pointer",
            }}
            onClick={handleGoogleClick}
            disabled={!gsiReady || gLoading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {gLoading ? "Opening Google…" : !gsiReady ? "Loading Google…" : "Continue with Google"}
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