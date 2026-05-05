import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = "256106414119-mmscg4cq29qu5itfgkccs6g35ujnv0qq.apps.googleusercontent.com";

export default function Login({ onNavigate }) {
  const { login, googleLogin } = useAuth();
  const [form, setForm]         = useState({ email: "", password: "" });
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError]       = useState("");
  const [gsiReady, setGsiReady] = useState(false);
  const gsiInitialized          = useRef(false); // ek baar hi initialize hoga

  // Load Google GSI script & initialize ONCE
  useEffect(() => {
    const initGsi = () => {
      // Agar pehle se initialize ho chuka hai toh skip
      if (gsiInitialized.current) { setGsiReady(true); return; }
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        ux_mode: "popup",
        cancel_on_tap_outside: true,
      });
      gsiInitialized.current = true;
      setGsiReady(true);
    };

    if (window.google?.accounts) { initGsi(); return; }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener("load", initGsi); return; }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    script.onerror = () => setError("Google SDK load failed.");
    document.head.appendChild(script);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleResponse = async (response) => {
    if (!response?.credential) return;
    setGLoading(true); setError("");
    try {
      await googleLogin(response.credential);
      onNavigate("feed");
    } catch (err) {
      setError(err.message || "Google login failed.");
    } finally {
      setGLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!gsiReady || !window.google?.accounts?.id) {
      setError("Google SDK load ho raha hai, thoda wait karo.");
      return;
    }
    // prompt() call karo — FedCM supported browser mein kaam karega
    // Agar FedCM block ho toh renderButton fallback
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: hidden div mein button render karke click
        const tempDiv = document.createElement("div");
        tempDiv.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
        document.body.appendChild(tempDiv);
        window.google.accounts.id.renderButton(tempDiv, {
          type: "standard", theme: "outline", size: "large",
        });
        setTimeout(() => {
          const btn = tempDiv.querySelector("div[role='button'],button");
          if (btn) btn.click();
          document.body.removeChild(tempDiv);
        }, 200);
      }
    });
  };

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
      {/* FIX: Same fixed width as Register card */}
      <div className="auth-card animate-in" style={{ width: "100%", maxWidth: 440 }}>
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
        {/* FIX: Removed GitHub button — only Google remains */}
        <button
          className="btn btn-outline"
          style={{ justifyContent: "center", width: "100%", gap: 8, display: "flex", alignItems: "center", opacity: (!gsiReady || gLoading) ? 0.65 : 1, cursor: (!gsiReady || gLoading) ? "not-allowed" : "pointer" }}
          onClick={handleGoogle}
          disabled={!gsiReady || gLoading}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {gLoading ? "Signing in…" : !gsiReady ? "Loading Google…" : "Continue with Google"}
        </button>

        <p className="text-secondary text-sm" style={{ textAlign: "center", marginTop: 24 }}>
          Don't have an account?{" "}
          <span className="text-primary-color" style={{ cursor: "pointer", fontWeight: 600 }}
            onClick={() => onNavigate("register")}>Sign up free</span>
        </p>
      </div>
    </div>
  );
}