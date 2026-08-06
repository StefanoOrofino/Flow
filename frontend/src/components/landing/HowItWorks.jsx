import React from "react";
import { Upload, ScanLine, ClipboardCheck, Wand2, Users, FileDown } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";
import { useT, IMG } from "../../i18n";

const icons = [Upload, ScanLine, ClipboardCheck, Wand2, Users, FileDown];
const covers = [IMG.filmSet, IMG.cameraSilhouette, IMG.storyboardSketch, IMG.filmSet2, IMG.crewOutdoor, IMG.watchSilk];

export function HowItWorks() {
  const { t } = useT();
  return (
    <section id="how" data-testid="how-it-works" className="py-20 md:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <SectionHead kicker={t.how.kicker} title={t.how.title} />

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.how.steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={s.t} delay={(i % 3) * 0.08}>
                <div className="group h-full rounded-2xl overflow-hidden border border-[#F5F1E8]/10 bg-[#141416]/60 hover:border-[#C5A059]/35 transition-colors duration-500">
                  <div className="relative h-40 overflow-hidden">
                    <img src={covers[i]} alt={s.t} className="img-zoom w-full h-full object-cover opacity-75" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-[#141416]/30 to-transparent" />
                    <span className="absolute top-4 left-4 font-serif-display text-sm text-[#0C0C0E] w-8 h-8 rounded-full gold-gradient-bg flex items-center justify-center font-semibold">
                      {i + 1}
                    </span>
                  </div>
                  <div className="p-6">
                    <Icon size={20} className="text-[#C5A059]" />
                    <h3 className="mt-4 font-serif-display text-xl text-[#F5F1E8]">{s.t}</h3>
                    <p className="mt-2.5 text-sm text-[#F5F1E8]/60 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
