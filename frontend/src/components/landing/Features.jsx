import React from "react";
import {
  Clapperboard, FileInput, LayoutGrid, ScrollText, ListChecks,
  Camera, Users, CalendarClock, Wallet, MessagesSquare, FileDown,
} from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";
import { useT } from "../../i18n";

const icons = [
  Clapperboard, FileInput, LayoutGrid, ScrollText, ListChecks,
  Camera, Users, CalendarClock, Wallet, MessagesSquare, FileDown,
];

// bento spans for desktop (4-col dense grid)
const spans = [
  "lg:col-span-2 lg:row-span-2", // 0 AI Director (large)
  "", "", 
  "lg:row-span-2",               // 3 Screenplay (tall)
  "", "",
  "lg:col-span-2",               // 6 Crew (wide)
  "", "", "", "",
];

export function Features() {
  const { t } = useT();
  return (
    <section id="features" data-testid="features" className="py-20 md:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <SectionHead kicker={t.features.kicker} title={t.features.title} />

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[220px] gap-5 [grid-auto-flow:dense]">
          {t.features.items.map((f, i) => {
            const Icon = icons[i];
            const large = spans[i]?.includes("col-span-2") && spans[i]?.includes("row-span-2");
            return (
              <Reveal
                key={f.t}
                delay={(i % 4) * 0.05}
                className={`group relative overflow-hidden rounded-2xl border border-[#F5F1E8]/10 hover:border-[#C5A059]/40 transition-colors duration-500 ${spans[i]}`}
              >
                <img src={f.img} alt={f.t} className="img-zoom absolute inset-0 w-full h-full object-cover opacity-45 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E] via-[#0C0C0E]/70 to-[#0C0C0E]/20" />
                <div className="relative h-full flex flex-col justify-end p-6">
                  <span className="w-10 h-10 rounded-xl bg-[#C5A059]/12 border border-[#C5A059]/25 flex items-center justify-center mb-4">
                    <Icon size={18} className="text-[#C5A059]" />
                  </span>
                  <h3 className={`font-serif-display text-[#F5F1E8] ${large ? "text-2xl md:text-3xl" : "text-xl"}`}>
                    {f.t}
                  </h3>
                  <p className={`mt-2 text-[#F5F1E8]/65 leading-relaxed ${large ? "text-sm md:text-base max-w-md" : "text-sm"}`}>
                    {f.d}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
