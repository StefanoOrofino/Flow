import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API } from "../lib/api";
import { useAuth } from "./AuthContext";
import { FrameLogo } from "../components/FrameLogo";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    // Clear the fragment from the URL immediately
    window.history.replaceState(null, "", window.location.pathname);

    if (!sessionId) {
      navigate("/login");
      return;
    }

    (async () => {
      try {
        const { data } = await axios.post(
          `${API}/auth/session`,
          {},
          { headers: { "X-Session-ID": sessionId }, withCredentials: true }
        );
        setUser(data);
        navigate("/dashboard", { replace: true, state: { user: data } });
      } catch (e) {
        setError(true);
        setTimeout(() => navigate("/login"), 1500);
      }
    })();
  }, [location, navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#0C0C0E] flex flex-col items-center justify-center gap-6">
      <div className="animate-pulse">
        <FrameLogo size={64} withGlow />
      </div>
      <p className="text-sm text-[#F5F1E8]/60">
        {error ? "Accesso non riuscito. Reindirizzamento…" : "Accesso in corso…"}
      </p>
    </div>
  );
}
