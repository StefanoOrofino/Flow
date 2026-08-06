import React from "react";
import { Play } from "lucide-react";
import { Reveal } from "./Reveal";
import { DemoAnimation } from "./DemoAnimation";
import { useT } from "../../i18n";

export function DemoSection({ onOpenDemo }) {
  const { t } = useT();
  return (
    <section data-testid="demo-section" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <Reveal>
          <DemoAnimation />
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 flex justify-center">
            <button
              data-testid="demo-open-popup"
              onClick={onOpenDemo}
              className="btn-ghost rounded-full px-6 py-3 text-sm font-medium inline-flex items-center gap-2"
            >
              <Play size={14} className="text-[#C5A059]" fill="currentColor" />
              {t.demo.openDemo}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
