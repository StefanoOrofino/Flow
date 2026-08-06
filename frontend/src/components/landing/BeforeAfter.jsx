import React from "react";
import { X, Check, Clock, Sparkles } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";
import { useT } from "../../i18n";

export function BeforeAfter() {
  const { t } = useT();
  const b = t.beforeAfter;

  return (
    <section data-testid="before-after" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <SectionHead kicker={b.kicker} title={b.title} center />

        <div className="relative mt-16 grid md:grid-cols-2 gap-6 md:gap-8">
          {/* VS badge */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full gold-gradient-bg items-center justify-center font-serif-display text-[#0C0C0E] font-semibold text-lg shadow-[0_0_40px_-8px_rgba(197,160,89,0.7)]">
            {b.vs}
          </div>

          {/* Before */}
          <Reveal>
            <div className="h-full rounded-2xl border border-[#F5F1E8]/10 bg-[#141416]/60 p-8 md:p-9">
              <div className="flex items-center gap-2 text-[#F5F1E8]/50 text-xs font-semibold uppercase tracking-[0.18em]">
                <Clock size={15} />
                {b.before.head}
              </div>
              <ul className="mt-7 space-y-4">
                {b.before.items.map((it) => (
                  <li key={it} className="flex items-start gap-3 text-[#F5F1E8]/60">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#d15b5b]/12 flex items-center justify-center">
                      <X size={12} className="text-[#d15b5b]" />
                    </span>
                    <span className="text-sm md:text-[15px] leading-relaxed">{it}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-[#F5F1E8]/10 text-sm text-[#F5F1E8]/45 italic font-serif-display">
                {b.before.outcome}
              </div>
            </div>
          </Reveal>

          {/* After */}
          <Reveal delay={0.12}>
            <div className="relative h-full rounded-2xl border border-[#C5A059]/35 bg-gradient-to-b from-[#C5A059]/[0.08] to-[#141416]/60 p-8 md:p-9 gold-glow">
              <div className="flex items-center gap-2 text-[#C5A059] text-xs font-semibold uppercase tracking-[0.18em]">
                <Sparkles size={15} />
                {b.after.head}
              </div>
              <ul className="mt-7 space-y-4">
                {b.after.items.map((it) => (
                  <li key={it} className="flex items-start gap-3 text-[#F5F1E8]/90">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#C5A059]/15 flex items-center justify-center">
                      <Check size={12} className="text-[#C5A059]" />
                    </span>
                    <span className="text-sm md:text-[15px] leading-relaxed">{it}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-[#C5A059]/20 text-sm text-[#C5A059] font-serif-display italic">
                {b.after.outcome}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
