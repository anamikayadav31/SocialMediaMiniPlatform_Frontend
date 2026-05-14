import { createContext, useContext, useState, useEffect, useRef } from "react";
import { getToken, getUser, clearSession, authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Track if we're in the middle of a login/register to suppress logout
  const isAuthInProgress = useRef(false);

  // On mount: restore session from localStorage
  useEffect(() => {
    const storedToken = getToken();
    const storedUser  = getUser();
    if (storedToken && storedUser) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Listen for auth:logout event from api.js (only when logged in)
  useEffect(() => {
    const handleLogout = () => {
      // Ignore if login/register is currently running
      if (isAuthInProgress.current) return;
      setUser(null);
      setToken(null);
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = async (dto) => {
    isAuthInProgress.current = true;
    try {
      const data = await authApi.login(dto);
      const u = {
        userId:   data.userId,
        userName: data.userName,
        fullName: data.fullName,
        role:     data.role,
      };
      setUser(u);
      setToken(data.token);
      return data;
    } finally {
      // Small delay so any queued auth:logout events fire BEFORE we reset the flag
      setTimeout(() => { isAuthInProgress.current = false; }, 2000);
    }
  };

  const register = async (dto) => {
    isAuthInProgress.current = true;
    try {
      const data = await authApi.register(dto);
      const u = {
        userId:   data.userId,
        userName: data.userName,
        fullName: data.fullName,
        role:     data.role,
      };
      setUser(u);
      setToken(data.token);
      return data;
    } finally {
      setTimeout(() => { isAuthInProgress.current = false; }, 2000);
    }
  };

  const googleLogin = async (idToken) => {
    isAuthInProgress.current = true;
    try {
      const data = await authApi.googleLogin(idToken);
      const u = {
        userId:   data.userId,
        userName: data.userName,
        fullName: data.fullName,
        role:     data.role,
      };
      setUser(u);
      setToken(data.token);
      return data;
    } finally {
      setTimeout(() => { isAuthInProgress.current = false; }, 2000);
    }
  };

  const logout = async () => {
    clearSession();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, googleLogin, logout,
      isAdmin: user?.role === "Admin",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}