import React from "react";
import { Reveal, SectionHead } from "./Reveal";
import { useT } from "../../i18n";

export function Storyboard() {
  const { t } = useT();
  const frames = t.gallery.items;
  return (
    <section data-testid="storyboard-showcase" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <SectionHead kicker={t.storyboard.kicker} title={t.storyboard.title} center />
        <div className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {frames.map((f, i) => (
            <Reveal key={i} delay={(i % 6) * 0.05}>
              <div className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-[#F5F1E8]/10">
                <img src={f.img} alt="" className="img-zoom w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E]/80 to-transparent" />
                <span className="absolute top-2.5 left-2.5 text-[11px] font-serif-display text-[#F5F1E8]/70 bg-[#0C0C0E]/60 border border-[#F5F1E8]/10 rounded px-1.5 py-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
