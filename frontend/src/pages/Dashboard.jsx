import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Plus, FolderOpen } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { FrameLogo, Wordmark } from "../components/FrameLogo";
import { useT } from "../i18n";

function ProtectedShell({ children }) {
  const { user, loading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.user) return; // came from AuthCallback
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, location.state, navigate]);

  useEffect(() => {
    if (!user && !location.state?.user) checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !location.state?.user) {
    return (
      <div className="min-h-screen bg-[#0C0C0E] flex items-center justify-center">
        <div className="animate-pulse"><FrameLogo size={56} withGlow /></div>
      </div>
    );
  }
  return children;
}

export default function Dashboard() {
  const { t } = useT();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const d = t.dashboard;

  const doLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <ProtectedShell>
      <div className="min-h-screen bg-[#0C0C0E]">
        <header className="border-b border-[#F5F1E8]/10">
          <div className="max-w-6xl mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-3" data-testid="dash-logo">
              <FrameLogo size={36} />
              <Wordmark className="text-[#F5F1E8]" />
            </button>
            <div className="flex items-center gap-4">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-9 h-9 rounded-full border border-[#C5A059]/40 object-cover" />
              ) : (
                <span className="w-9 h-9 rounded-full gold-gradient-bg flex items-center justify-center text-[#0C0C0E] font-serif-display text-sm">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              )}
              <button
                data-testid="dash-logout"
                onClick={doLogout}
                className="btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
              >
                <LogOut size={15} /> {d.logout}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 md:px-10 py-14">
          <div className="text-xs uppercase tracking-[0.22em] text-[#C5A059]">{d.welcome}</div>
          <h1 data-testid="dash-title" className="font-serif-display mt-3 text-4xl md:text-5xl font-light text-[#F5F1E8]">
            {user?.name}
          </h1>
          <p className="mt-4 text-[#F5F1E8]/65">{d.subtitle}</p>
          <div className="mt-3 text-sm text-[#F5F1E8]/50" data-testid="dash-email">
            {d.email}: {user?.email}
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            <button
              data-testid="dash-new-project"
              className="rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/[0.06] p-8 text-left hover:border-[#C5A059]/60 transition-colors duration-300 group"
            >
              <span className="w-11 h-11 rounded-xl gold-gradient-bg flex items-center justify-center">
                <Plus size={20} className="text-[#0C0C0E]" />
              </span>
              <h3 className="mt-5 font-serif-display text-xl text-[#F5F1E8]">{d.newProject}</h3>
              <span className="mt-2 inline-block text-xs text-[#C5A059]">{d.soon}</span>
            </button>

            <div className="md:col-span-2 rounded-2xl border border-[#F5F1E8]/10 bg-[#141416]/60 p-8 flex flex-col items-center justify-center text-center min-h-[180px]">
              <FolderOpen size={28} className="text-[#F5F1E8]/30" />
              <p className="mt-4 text-sm text-[#F5F1E8]/55 max-w-xs">{d.empty}</p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedShell>
  );
}
