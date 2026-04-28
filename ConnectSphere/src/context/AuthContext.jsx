import { createContext, useContext, useState, useEffect } from "react";
import { getToken, getUser, clearSession, authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(getUser);
  const [token, setToken]     = useState(getToken);
  const [loading, setLoading] = useState(true);

  // FIX: validateToken ka backend call hata diya — 401 loop aa raha tha
  // Token hai toh session chalu rakho, expire hone pe backend khud 401 dega
  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) {
      clearSession();
      setUser(null);
      setToken(null);
    }
    setLoading(false);
  }, []);

  const login = async (dto) => {
    const data = await authApi.login(dto);
    setUser({ userId: data.userId, userName: data.userName, fullName: data.fullName, role: data.role });
    setToken(data.token);
    return data;
  };

  const register = async (dto) => {
    const data = await authApi.register(dto);
    setUser({ userId: data.userId, userName: data.userName, fullName: data.fullName, role: data.role });
    setToken(data.token);
    return data;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.role === "Admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}