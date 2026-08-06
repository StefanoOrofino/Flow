# FrameFlow Studio — PRD

## Original Problem Statement
Premium, responsive bilingual (IT default / EN toggle) marketing landing page for **FrameFlow Studio**, an AI pre-production suite that turns a client brief into a complete production package (concept, screenplay, storyboard, shot list, budget). Locked cinematic dark theme (ink #0C0C0E, cream #F5F1E8, gold #C5A059), Fraunces + Inter fonts, SVG "Frame F" film-strip logo. Award-worthy motion (framer-motion + lenis).

## User Choices
- Images: mix — AI-generated OG/hero background, stock (Unsplash/Pexels) for gallery & covers.
- Buttons: placeholder /signup /login pages that also capture email.
- Backend: save waitlist emails/leads to MongoDB.
- Logo: built in code as SVG.
- Language: IT/EN instant toggle, default Italian.

## Architecture
- **Frontend**: React 19 + Tailwind, framer-motion (reveals, masked hero, parallax), lenis (smooth scroll), lucide-react icons, sonner toasts. i18n via LanguageProvider context (`src/i18n.js`).
- **Backend**: FastAPI + MongoDB (motor). Routes: `POST/GET /api/leads`, `POST /api/contact`. BaseDocument/PyObjectId pattern.
- **Routes**: `/` landing, `/signup`, `/login`, `/privacy`, `/termini`, `/cookie`.

## Implemented (2026-06)
- All 15 sections: sticky nav (glass on scroll), kinetic hero (masked line reveal + parallax gold logo tile), auto-playing demo mockup + popup dialog, trust-chips marquee, before/after VS, 6-step How It Works, stats bar, client brief flow mock, 11-card bento Features, storyboard showcase, cinematic gallery (mobile-first placement), 4-plan pricing (Pro highlighted), FAQ accordion, final CTA with working email capture, footer.
- Bilingual IT/EN toggle across entire site.
- Email capture persists to MongoDB (`leads`), verified end-to-end.
- SVG Frame-F film-strip logo, gold gradient system, grain/glow, SEO + Open Graph meta with AI-generated OG image.
- GDPR-template legal pages (Privacy/Termini/Cookie) with lawyer-review disclaimer.
- Tested: backend 100% (5/5 pytest), frontend 100% (all flows).

## Backlog
- P1: Real auth + user accounts (currently placeholder + waitlist capture).
- P1: Working app at app.frameflowai.net (dashboard/brief upload).
- P2: Stripe checkout on pricing plans.
- P2: Contact form UI (endpoint exists), blog/guides pages.
- P2: Persist chosen language in localStorage; add hreflang tags.

## Next Tasks
- Connect pricing CTAs to real checkout when payments are added.
- Build the actual product app behind /signup.
