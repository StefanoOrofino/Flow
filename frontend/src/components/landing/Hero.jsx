import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { FrameLogo } from "../FrameLogo";
import { useT } from "../../i18n";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/d69e6b34-addd-487b-b1dc-9fa79412b1f2/images/84d1f1a46cc58e67d2acd401c77dd5c9546519d6cf400b336e7b58cba24ae686.jpeg";

const line = {
  hidden: { y: "110%" },
  show: (i) => ({
    y: "0%",
    transition: { duration: 1, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function Hero({ onOpenDemo }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const yTile = useTransform(scrollY, [0, 600], [0, -60]);
  const yGlow = useTransform(scrollY, [0, 600], [0, 80]);

  return (
    <section data-testid="hero" className="relative pt-40 md:pt-48 pb-24 md:pb-32 overflow-hidden">
      {/* background layers */}
      <motion.div
        aria-hidden
        style={{ y: yGlow }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E]/60 via-[#0C0C0E]/85 to-[#0C0C0E]" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-[1.15fr_0.85fr] gap-14 lg:gap-8 items-center">
        {/* left copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/30 bg-[#C5A059]/[0.06] px-4 py-1.5 text-xs tracking-wide text-[#C5A059]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
            {t.hero.badge}
          </motion.div>

          <h1 className="font-serif-display mt-7 text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[0.98] text-[#F5F1E8]">
            {t.hero.titleLines.map((ln, i) => (
              <span key={i} className="block overflow-hidden">
                <motion.span
                  className="block"
                  variants={line}
                  custom={i}
                  initial="hidden"
                  animate="show"
                >
                  {i === 1 ? <span className="gold-gradient-text">{ln}</span> : ln}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-7 max-w-xl text-base md:text-lg text-[#F5F1E8]/70 leading-relaxed"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <button
              data-testid="hero-cta-primary"
              onClick={() => navigate("/signup")}
              className="btn-gold rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              {t.hero.ctaPrimary}
            </button>
            <button
              data-testid="hero-cta-demo"
              onClick={onOpenDemo}
              className="btn-ghost rounded-full px-7 py-3.5 text-sm font-medium inline-flex items-center gap-2"
            >
              <Play size={15} className="text-[#C5A059]" fill="currentColor" />
              {t.hero.ctaSecondary}
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-6 text-xs md:text-sm text-[#F5F1E8]/45"
          >
            {t.hero.trust}
          </motion.p>
        </div>

        {/* right: gold logo tile with glow */}
        <motion.div style={{ y: yTile }} className="flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute -inset-10 rounded-full bg-[#C5A059]/20 blur-3xl" />
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative rounded-[2rem] p-6 md:p-8 border border-[#C5A059]/25 bg-[#141416]/70 backdrop-blur-md gold-glow"
            >
              <FrameLogo size={220} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
