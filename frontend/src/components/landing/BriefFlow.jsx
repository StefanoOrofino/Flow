import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Check } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";
import { useT } from "../../i18n";

export function BriefFlow() {
  const { t } = useT();
  const navigate = useNavigate();
  const b = t.brief;

  return (
    <section data-testid="brief-flow" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <div>
          <SectionHead kicker={b.kicker} title={b.title} subtitle={b.body} />
          <ol className="mt-9 space-y-4">
            {b.list.map((item, i) => (
              <Reveal key={item} delay={i * 0.06}>
                <li className="flex items-center gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center text-sm font-serif-display">
                    {i + 1}
                  </span>
                  <span className="text-[15px] text-[#F5F1E8]/80">{item}</span>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal delay={0.3}>
            <button
              data-testid="brief-cta"
              onClick={() => navigate("/signup")}
              className="btn-gold rounded-full px-7 py-3.5 text-sm font-semibold mt-9"
            >
              {b.cta}
            </button>
          </Reveal>
        </div>

        {/* mock brief.pdf */}
        <Reveal delay={0.15}>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-[#C5A059]/10 blur-3xl" />
            <div className="relative rounded-2xl border border-[#F5F1E8]/10 bg-[#141416] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#F5F1E8]/10">
                <FileText size={18} className="text-[#C5A059]" />
                <span className="text-sm text-[#F5F1E8]/80">{b.fileName}</span>
                <span className="ml-auto text-[11px] rounded-full bg-[#C5A059]/12 text-[#C5A059] px-2.5 py-1">
                  100% source-verified
                </span>
              </div>
              <div className="p-6 space-y-3">
                {b.fields.map((f, i) => (
                  <div
                    key={f.k}
                    className="flex items-center justify-between rounded-xl border border-[#F5F1E8]/8 bg-[#F5F1E8]/[0.02] px-4 py-3.5"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-[#F5F1E8]/40">{f.k}</div>
                      <div className="text-sm text-[#F5F1E8] mt-0.5">{f.v}</div>
                    </div>
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C5A059]/15 flex items-center justify-center">
                      <Check size={13} className="text-[#C5A059]" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
