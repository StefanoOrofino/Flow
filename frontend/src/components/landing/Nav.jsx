import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Globe } from "lucide-react";
import { FrameLogo, Wordmark } from "../FrameLogo";
import { useT } from "../../i18n";
import { useAuth } from "../../auth/AuthContext";

const links = [
  ["features", "#features"],
  ["how", "#how"],
  ["pricing", "#pricing"],
  ["faq", "#faq"],
];

export function Nav() {
  const { t, lang, toggle } = useT();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (hash) => {
    setOpen(false);
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      data-testid="site-nav"
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,box-shadow,border-color] duration-500 ${
        scrolled
          ? "bg-[#0C0C0E]/80 backdrop-blur-xl border-b border-[#F5F1E8]/10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-[72px] flex items-center justify-between">
        <button
          data-testid="nav-logo"
          onClick={() => navigate("/")}
          className="flex items-center gap-3 group"
        >
          <FrameLogo size={38} />
          <Wordmark className="text-[#F5F1E8]" />
        </button>

        <nav className="hidden lg:flex items-center gap-9">
          {links.map(([key, hash]) => (
            <button
              key={key}
              data-testid={`nav-link-${key}`}
              onClick={() => go(hash)}
              className="text-sm text-[#F5F1E8]/70 hover:text-[#F5F1E8] transition-colors duration-300 relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-[#C5A059] after:transition-[width] after:duration-300 hover:after:w-full"
            >
              {t.nav[key]}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            data-testid="lang-toggle"
            onClick={toggle}
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#F5F1E8]/80 hover:text-[#C5A059] border border-[#F5F1E8]/12 rounded-full px-3 py-2 transition-colors duration-300"
          >
            <Globe size={14} />
            <span className={lang === "it" ? "text-[#C5A059]" : ""}>IT</span>
            <span className="text-[#F5F1E8]/30">/</span>
            <span className={lang === "en" ? "text-[#C5A059]" : ""}>EN</span>
          </button>

          {user ? (
            <>
              <button
                data-testid="nav-dashboard"
                onClick={() => navigate("/dashboard")}
                className="hidden sm:inline-flex items-center gap-2 text-sm text-[#F5F1E8]/85 hover:text-[#F5F1E8] px-3 py-2 transition-colors duration-300"
              >
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-6 h-6 rounded-full border border-[#C5A059]/40 object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full gold-gradient-bg flex items-center justify-center text-[#0C0C0E] text-xs font-semibold">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>
                )}
                {t.nav.dashboard}
              </button>
              <button
                data-testid="nav-logout"
                onClick={doLogout}
                className="btn-ghost hidden sm:inline-flex rounded-full px-5 py-2.5 text-sm font-medium"
              >
                {t.nav.logout}
              </button>
            </>
          ) : (
            <>
              <button
                data-testid="nav-login"
                onClick={() => navigate("/login")}
                className="hidden sm:inline-flex text-sm text-[#F5F1E8]/85 hover:text-[#F5F1E8] px-3 py-2 transition-colors duration-300"
              >
                {t.nav.login}
              </button>

              <button
                data-testid="nav-cta"
                onClick={() => navigate("/signup")}
                className="btn-gold hidden sm:inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                {t.nav.cta}
              </button>
            </>
          )}

          <button
            data-testid="nav-mobile-toggle"
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden text-[#F5F1E8] p-2"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-[#0C0C0E]/95 backdrop-blur-xl border-t border-[#F5F1E8]/10 px-6 py-6 flex flex-col gap-4">
          {links.map(([key, hash]) => (
            <button
              key={key}
              data-testid={`nav-mobile-${key}`}
              onClick={() => go(hash)}
              className="text-left text-base text-[#F5F1E8]/80 py-1"
            >
              {t.nav[key]}
            </button>
          ))}
          <div className="flex gap-3 pt-2">
            {user ? (
              <>
                <button data-testid="nav-mobile-dashboard" onClick={() => { setOpen(false); navigate("/dashboard"); }} className="btn-ghost rounded-full px-5 py-2.5 text-sm flex-1">
                  {t.nav.dashboard}
                </button>
                <button data-testid="nav-mobile-logout" onClick={() => { setOpen(false); doLogout(); }} className="btn-gold rounded-full px-5 py-2.5 text-sm font-semibold flex-1">
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/login")} className="btn-ghost rounded-full px-5 py-2.5 text-sm flex-1">
                  {t.nav.login}
                </button>
                <button onClick={() => navigate("/signup")} className="btn-gold rounded-full px-5 py-2.5 text-sm font-semibold flex-1">
                  {t.nav.cta}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
