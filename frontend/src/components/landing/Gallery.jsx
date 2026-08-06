import React from "react";
import { Reveal, SectionHead } from "./Reveal";
import { useT } from "../../i18n";

export function Gallery() {
  const { t } = useT();
  return (
    <section id="gallery" data-testid="gallery" className="py-20 md:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <SectionHead kicker={t.gallery.kicker} title={t.gallery.title} subtitle={t.gallery.subtitle} center />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.gallery.items.map((g, i) => (
            <Reveal key={i} delay={(i % 3) * 0.08}>
              <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#F5F1E8]/10">
                <img src={g.img} alt={g.t} className="img-zoom w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E] via-[#0C0C0E]/20 to-transparent" />
                <span className="absolute top-4 right-4 text-xs font-serif-display text-[#F5F1E8]/70 bg-[#0C0C0E]/50 backdrop-blur-sm border border-[#F5F1E8]/10 rounded-full w-8 h-8 flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="absolute left-0 bottom-0 p-5 flex items-stretch gap-3">
                  <span className="w-0.5 rounded-full gold-gradient-bg" />
                  <div>
                    <div className="font-serif-display text-lg text-[#F5F1E8] leading-tight">{g.t}</div>
                    <div className="text-[11px] tracking-[0.18em] text-[#C5A059] mt-1">{g.s}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
