import React from "react";
import { motion } from "framer-motion";

// Scroll-reveal wrapper: fade-in + slight translate-y
export function Reveal({ children, delay = 0, y = 28, className = "", as = "div" }) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

// Section header with gold overline kicker + serif title
export function SectionHead({ kicker, title, subtitle, center = false, className = "" }) {
  return (
    <div className={`${center ? "text-center mx-auto max-w-2xl" : "max-w-3xl"} ${className}`}>
      <Reveal>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">{kicker}</div>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="font-serif-display mt-4 text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-[#F5F1E8]">
          {title}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.14}>
          <p className="mt-5 text-base md:text-lg text-[#F5F1E8]/70 leading-relaxed">{subtitle}</p>
        </Reveal>
      )}
    </div>
  );
}
