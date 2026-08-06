import React from "react";
import { Reveal } from "./Reveal";
import { EmailForm } from "./EmailForm";
import { FrameLogo } from "../FrameLogo";
import { useT } from "../../i18n";

export function FinalCTA() {
  const { t } = useT();
  return (
    <section data-testid="final-cta" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-[#C5A059]/25 bg-gradient-to-br from-[#1a160e] via-[#141416] to-[#0C0C0E] px-8 py-16 md:px-16 md:py-24 gold-glow">
            <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-[#C5A059]/15 blur-3xl" />
            <div className="relative flex flex-col items-center text-center">
              <FrameLogo size={64} withGlow />
              <h2 className="font-serif-display mt-8 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-[#F5F1E8]">
                {t.finalCta.title}
              </h2>
              <p className="mt-5 text-base md:text-lg text-[#F5F1E8]/70 max-w-lg">
                {t.finalCta.subtitle}
              </p>
              <div className="mt-9 flex justify-center">
                <EmailForm source="final-cta" testid="final-email-form" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
