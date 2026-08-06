import React from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";
import { useT } from "../../i18n";

export function Pricing() {
  const { t } = useT();
  const navigate = useNavigate();
  const p = t.pricing;

  return (
    <section id="pricing" data-testid="pricing" className="py-20 md:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <SectionHead kicker={p.kicker} title={p.title} center />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {p.plans.map((plan, i) => {
            const popular = plan.popular;
            return (
              <Reveal key={plan.name} delay={i * 0.08}>
                <div
                  data-testid={`plan-${plan.name.toLowerCase()}`}
                  className={`relative h-full rounded-2xl p-7 border transition-colors duration-500 ${
                    popular
                      ? "border-[#C5A059]/50 bg-gradient-to-b from-[#C5A059]/[0.1] to-[#141416]/70 gold-glow"
                      : "border-[#F5F1E8]/10 bg-[#141416]/60 hover:border-[#C5A059]/30"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gold-gradient-bg text-[#0C0C0E] text-[10px] font-bold tracking-[0.15em] px-3 py-1">
                      {p.popular}
                    </span>
                  )}
                  <h3 className="font-serif-display text-xl text-[#F5F1E8]">{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-1.5">
                    <span className="font-serif-display text-4xl text-[#F5F1E8]">{plan.price}</span>
                    <span className="text-xs text-[#F5F1E8]/45 mb-1.5">
                      {plan.period === "forever" ? p.forever : p.perMonth}
                    </span>
                  </div>

                  <ul className="mt-7 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-[#F5F1E8]/70">
                        <Check size={15} className="text-[#C5A059] mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    data-testid={`plan-cta-${plan.name.toLowerCase()}`}
                    onClick={() => navigate("/signup")}
                    className={`mt-8 w-full rounded-full py-3 text-sm font-semibold transition-colors duration-300 ${
                      popular
                        ? "btn-gold"
                        : "btn-ghost"
                    }`}
                  >
                    {plan.name === "Free" ? p.ctaFree : `${p.ctaChoose} ${plan.name}`}
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
