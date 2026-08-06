import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "../../i18n";

export function FAQ() {
  const { t } = useT();
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" data-testid="faq" className="py-20 md:py-28 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <SectionHead kicker={t.faq.kicker} title={t.faq.title} center />

        <div className="mt-12 divide-y divide-[#F5F1E8]/10 border-t border-b border-[#F5F1E8]/10">
          {t.faq.items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 0.04}>
                <div>
                  <button
                    data-testid={`faq-item-${i}`}
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-serif-display text-lg md:text-xl text-[#F5F1E8]">{item.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.3 }}>
                      <Plus size={20} className="text-[#C5A059] flex-shrink-0" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pr-8 text-sm md:text-[15px] text-[#F5F1E8]/65 leading-relaxed">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
