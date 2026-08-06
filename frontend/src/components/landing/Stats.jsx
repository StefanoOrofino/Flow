import React from "react";
import { Reveal } from "./Reveal";
import { useT } from "../../i18n";

export function Stats() {
  const { t } = useT();
  return (
    <section data-testid="stats-bar" className="py-16 border-y border-[#F5F1E8]/10 bg-[#141416]/40">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-2 lg:grid-cols-4 gap-10">
        {t.stats.map((s, i) => (
          <Reveal key={i} delay={i * 0.08} className="text-center lg:text-left">
            <div className="font-serif-display text-4xl md:text-5xl gold-gradient-text">{s.v}</div>
            <div className="mt-3 text-sm text-[#F5F1E8]/55 leading-snug">{s.d}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
