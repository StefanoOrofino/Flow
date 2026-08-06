import React, { useEffect, useState } from "react";
import { Upload, ScanLine, CheckCircle2, Clapperboard } from "lucide-react";
import { useT } from "../../i18n";

const icons = [Upload, ScanLine, CheckCircle2, Clapperboard];

export function DemoAnimation({ large = false }) {
  const { t } = useT();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      data-testid="demo-mockup"
      className="rounded-2xl overflow-hidden border border-[#F5F1E8]/10 bg-[#141416] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)]"
    >
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F5F1E8]/10 bg-[#0f0f11]">
        <span className="w-3 h-3 rounded-full bg-[#F5F1E8]/15" />
        <span className="w-3 h-3 rounded-full bg-[#F5F1E8]/15" />
        <span className="w-3 h-3 rounded-full bg-[#F5F1E8]/15" />
        <div className="mx-auto flex items-center gap-2 rounded-md bg-[#F5F1E8]/[0.04] px-4 py-1.5 text-xs text-[#F5F1E8]/55">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
          {t.demo.url}
        </div>
      </div>

      {/* body */}
      <div className={`relative grid ${large ? "md:grid-cols-2" : "md:grid-cols-2"} gap-0`}>
        {/* left: document with scanline */}
        <div className="relative p-6 md:p-8 border-b md:border-b-0 md:border-r border-[#F5F1E8]/10 min-h-[280px]">
          <div className="relative rounded-lg bg-[#0C0C0E] border border-[#F5F1E8]/10 p-5 overflow-hidden h-full">
            {step === 1 && (
              <span
                className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-[#C5A059]/25 to-transparent"
                style={{ animation: "scanline 2s ease-in-out infinite" }}
              />
            )}
            <div className="text-xs text-[#F5F1E8]/40 mb-4">{t.demo.steps[0].d}</div>
            <div className="space-y-2.5">
              {[100, 82, 90, 68, 94, 75, 60].map((w, i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-full bg-[#F5F1E8]/[0.07]"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* right: extracted data */}
        <div className="p-6 md:p-8 min-h-[280px]">
          <div className="flex items-center gap-2 mb-5">
            {icons.map((Icon, i) => {
              const Active = i === step;
              return (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-colors duration-500 ${
                    i <= step ? "bg-[#C5A059]" : "bg-[#F5F1E8]/10"
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-3 mb-6">
            {React.createElement(icons[step], { size: 20, className: "text-[#C5A059]" })}
            <div>
              <div className="text-[#F5F1E8] text-sm font-medium">{t.demo.steps[step].t}</div>
              <div className="text-[#F5F1E8]/50 text-xs">{t.demo.steps[step].d}</div>
            </div>
          </div>

          <div className="space-y-2.5">
            {t.demo.extracted.map((label, i) => {
              const shown = step >= 2;
              return (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-[#F5F1E8]/8 bg-[#F5F1E8]/[0.02] px-3.5 py-2.5"
                  style={{
                    opacity: shown ? 1 : 0.35,
                    transition: `opacity 0.5s ease ${i * 0.08}s`,
                  }}
                >
                  <span className="text-xs text-[#F5F1E8]/60">{label}</span>
                  {shown ? (
                    <CheckCircle2 size={16} className="text-[#C5A059]" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-[#F5F1E8]/20" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
