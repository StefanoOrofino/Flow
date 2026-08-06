import React from "react";
import { Link } from "react-router-dom";
import { FrameLogo, Wordmark } from "../FrameLogo";
import { useT } from "../../i18n";

export function Footer() {
  const { t } = useT();
  return (
    <footer data-testid="site-footer" className="border-t border-[#F5F1E8]/10 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <FrameLogo size={40} />
              <Wordmark className="text-[#F5F1E8]" />
            </div>
            <p className="mt-5 text-sm text-[#F5F1E8]/55 max-w-xs leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>

          {t.footer.cols.map((col) => (
            <div key={col.h}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F5F1E8]/40">{col.h}</h4>
              <ul className="mt-5 space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link
                        data-testid={`footer-link-${label.toLowerCase()}`}
                        to={href}
                        className="text-sm text-[#F5F1E8]/65 hover:text-[#C5A059] transition-colors duration-300"
                      >
                        {label}
                      </Link>
                    ) : (
                      <a
                        data-testid={`footer-link-${label.toLowerCase()}`}
                        href={href}
                        className="text-sm text-[#F5F1E8]/65 hover:text-[#C5A059] transition-colors duration-300"
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-[#F5F1E8]/10 text-xs text-[#F5F1E8]/40">
          {t.footer.copyright}
        </div>
      </div>
    </footer>
  );
}
