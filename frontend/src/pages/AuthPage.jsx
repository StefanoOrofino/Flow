import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FrameLogo, Wordmark } from "../components/FrameLogo";
import { EmailForm } from "../components/landing/EmailForm";
import { loginWithGoogle } from "../auth/AuthContext";
import { useT } from "../i18n";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.6 26.7 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.9l-6.6 5.1C9.6 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.2 36.8 43.5 30.9 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export default function AuthPage({ mode = "signup" }) {
  const { t } = useT();
  const navigate = useNavigate();
  const a = t.auth;
  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen bg-[#0C0C0E] flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 py-8">
        <button
          data-testid="auth-logo"
          onClick={() => navigate("/")}
          className="flex items-center gap-3"
        >
          <FrameLogo size={38} />
          <Wordmark className="text-[#F5F1E8]" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#F5F1E8]/10 bg-[#141416]/60 p-8 md:p-10 gold-glow">
            <h1 className="font-serif-display text-3xl text-[#F5F1E8]">
              {isSignup ? a.signupTitle : a.loginTitle}
            </h1>
            <p className="mt-2 text-sm text-[#F5F1E8]/60">
              {isSignup ? a.signupSub : a.loginSub}
            </p>

            <button
              data-testid="google-signin"
              onClick={loginWithGoogle}
              className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-full bg-[#F5F1E8] text-[#0C0C0E] font-semibold text-sm py-3.5 hover:bg-white transition-colors duration-300"
            >
              <GoogleIcon />
              {a.google}
            </button>

            <div className="mt-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#F5F1E8]/10" />
              <span className="text-xs text-[#F5F1E8]/40 uppercase tracking-widest">{a.or}</span>
              <span className="h-px flex-1 bg-[#F5F1E8]/10" />
            </div>

            <div className="mt-6 space-y-4 opacity-60 pointer-events-none select-none">
              {isSignup && (
                <div>
                  <label className="text-xs text-[#F5F1E8]/50">{a.name}</label>
                  <div className="mt-1.5 h-11 rounded-full border border-[#F5F1E8]/12 bg-[#F5F1E8]/[0.03]" />
                </div>
              )}
              <div>
                <label className="text-xs text-[#F5F1E8]/50">{a.email}</label>
                <div className="mt-1.5 h-11 rounded-full border border-[#F5F1E8]/12 bg-[#F5F1E8]/[0.03]" />
              </div>
              <div>
                <label className="text-xs text-[#F5F1E8]/50">{a.password}</label>
                <div className="mt-1.5 h-11 rounded-full border border-[#F5F1E8]/12 bg-[#F5F1E8]/[0.03]" />
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.06] p-5">
              <p className="text-sm text-[#F5F1E8]/75 mb-4">{a.soon}</p>
              <EmailForm source={isSignup ? "signup" : "login"} testid="auth-email-form" />
            </div>
          </div>

          <button
            data-testid="auth-back"
            onClick={() => navigate("/")}
            className="mt-6 mx-auto flex items-center gap-2 text-sm text-[#F5F1E8]/55 hover:text-[#C5A059] transition-colors duration-300"
          >
            <ArrowLeft size={15} /> {a.back}
          </button>
        </div>
      </div>
    </div>
  );
}
