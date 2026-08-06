import React from "react";
import { useT } from "../../i18n";

export function TrustChips() {
  const { t } = useT();
  const chips = [...t.trust.chips, ...t.trust.chips, ...t.trust.chips];
  return (
    <section data-testid="trust-chips" className="py-16 border-y border-[#F5F1E8]/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#F5F1E8]/40">
          {t.trust.label}
        </p>
      </div>
      <div className="relative mt-9 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <div className="marquee-track flex w-max items-center gap-5">
          {chips.map((c, i) => (
            <span
              key={i}
              className="whitespace-nowrap rounded-full border border-[#F5F1E8]/12 bg-[#F5F1E8]/[0.02] px-6 py-2.5 text-sm text-[#F5F1E8]/75 font-serif-display"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
