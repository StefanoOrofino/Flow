import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FrameLogo, Wordmark } from "../components/FrameLogo";
import { EmailForm } from "../components/landing/EmailForm";
import { useT } from "../i18n";

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

            <div className="mt-8 space-y-4 opacity-60 pointer-events-none select-none">
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
