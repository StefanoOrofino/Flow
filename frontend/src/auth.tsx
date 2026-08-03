import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { api, setToken, getToken } from "./api";

if (Platform.OS !== "web") WebBrowser.maybeCompleteAuthSession();

type User = { user_id: string; email: string; name: string; picture?: string } | null;

type Ctx = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthContext);

const sentSessions = new Set<string>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const exchange = useCallback(async (sessionId: string) => {
    if (!sessionId || sentSessions.has(sessionId)) return;
    sentSessions.add(sessionId);
    try {
      const res = await api.googleSession(sessionId);
      await setToken(res.token);
      setUser(res.user);
      router.replace("/dashboard");
    } catch (e) {
      console.log("google exchange failed", e);
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      // Web: check for session_id in URL first
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        const m = (hash + search).match(/session_id=([^&#]+)/);
        if (m) {
          await exchange(decodeURIComponent(m[1]));
          try {
            window.history.replaceState(window.history.state, "",
              window.location.pathname);
          } catch {}
          setLoading(false);
          return;
        }
      } else {
        const initial = await Linking.getInitialURL();
        const m = initial && initial.match(/session_id=([^&#]+)/);
        if (m) await exchange(decodeURIComponent(m[1]));
      }
      // existing token
      const t = await getToken();
      if (t) {
        try {
          const res = await api.me();
          setUser(res.user);
        } catch {
          await setToken(null);
        }
      }
      setLoading(false);
    })();
  }, [exchange]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    await setToken(res.token);
    setUser(res.user);
  };
  const register = async (email: string, password: string, name: string) => {
    const res = await api.register({ email, password, name });
    await setToken(res.token);
    setUser(res.user);
  };
  const loginWithGoogle = async () => {
    const redirect = Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin + "/"
      : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
    } else {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
      if (result.type === "success" && result.url) {
        const m = result.url.match(/session_id=([^&#]+)/);
        if (m) await exchange(decodeURIComponent(m[1]));
      }
    }
  };
  const logout = async () => {
    await setToken(null);
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
