# FrameFlow Studio — PRD

## Original Problem Statement
Build a premium, production-ready AI-powered pre-production platform (originally "Storyboard AI", evolved into "FrameFlow Studio") for filmmakers, video production companies, agencies and creators. Transform a creative brief into a full production package: creative concept, director's treatment, script, scene-by-scene storyboard, technical shot list, and AI image-generation prompts. Feel like a creative operating system (Notion + Linear + Milanote + Boords), not an AI chatbot. Cinematic dark, minimal, Apple/Linear quality.

## Architecture
- **Frontend**: Expo (React Native, expo-router) on web + iOS + Android from one codebase. Reanimated for subtle animations (Framer Motion is web-DOM only, not usable in RN).
- **Backend**: FastAPI + MongoDB (motor). All routes under `/api`.
- **Auth**: Email/password JWT + Emergent-managed Google social login. Per-user data isolation enforced.
- **AI**: Modular provider service (env `AI_PROVIDER`/`AI_MODEL`, default OpenAI gpt-5.4) via EMERGENT_LLM_KEY. Strict JSON schema; clearly-labelled MOCK fallback on any AI failure (`mock_mode` flag + MOCK badge).
- **Design tokens**: `/app/design_guidelines.json` — charcoal/gold "Luxe DARK", Cormorant Garamond (display) + Geist (text), no blue/purple.

## User Personas
Filmmakers, DPs, directors, video production companies, ad agencies, social/content creators, corporate marketing teams.

## Core Requirements (static)
Auth + protected routes; Dashboard (stats, quick actions, continue working, recent, templates, favorites); 5-step New Project wizard; real AI structured generation; Project Editor with 8 tabs (Overview, Storyboard, Shot List, Script, Production, References, Exports, Settings); full scene editing (all fields), add/duplicate/delete/reorder/regenerate scene & image prompt, autosave; PDF/CSV/print export with cover + technical shot list; project management (search/filter/sort/favorite/archive/rename/duplicate/delete); 12 categorized templates.

## Implemented (2026-06 / iteration 2)
- Full auth (JWT + Google), ownership isolation — verified.
- Extended data model: brief (campaign/goal/brand/crew_size/budget/mood/camera/lighting/editing/music/refs/deliverables/restrictions), scenes (characters/color_palette/frame_rate/resolution/equipment/estimated_time/crew_notes/production_notes), favorite/archived/export_count.
- Redesigned Dashboard, 5-step wizard, tabbed Editor, categorized Templates, management on Projects screen.
- Real AI generation (concept/creative_summary/treatment/visual_direction/script/production_notes + rich scenes). Verified end-to-end.
- Redesigned PDF export (cover, sections, technical shot list), CSV, print. Autosave.
- Testing: 23/23 backend pytest PASS; full frontend E2E PASS.

## Backlog / Remaining
- **P1**: Real drag-and-drop reorder (currently move up/down buttons); storyboard thumbnails once image-gen is added.
- **P2**: True optimistic UI everywhere; lazy route loading; skeletons on more screens.
- **Deferred (do not build yet)**: Stripe/subscriptions, AI image generation, collaboration, notifications. Architecture prepared (modular AI service, export_count, per-user models).

## Next Tasks
1. Add AI image generation for storyboard frames (Gemini Nano Banana / GPT Image 1) to replace placeholders.
2. Real drag-and-drop scene reordering.
3. Billing/subscription tiers (Stripe) when monetization begins.

## Sprint 2 (2026-06 / iteration 5) — Storyboard depth
Implemented in strict priority order per user request:
- **P1 Storyboard Editor** — verified complete (inline edit, autosave, drag-drop, scene actions, regen, expandable cards). NOTE: previous fork left many referenced StyleSheet keys undefined (RN silently ignored → unstyled). Added ALL missing styles (efInput, group, statusRow, frameBig, toolbar, summary, etc.).
- **P2 Smart Shot List** — rewrote Shot List tab as a professional horizontal-scroll production table, auto-synced from `project.scenes` (single source of truth, zero duplication). `ShotListTab` in project/[id].tsx.
- **P3 Storyboard PDF** — rewrote `buildHtml` in src/exporter.ts to a Storyboard-focused package: Cover, Project Summary (Concept/Treatment/Audience/Video Specs), Script, Storyboard (one page per scene + large 16:9 frame using active generated frame or placeholder), Shot List table, Final Notes. Removed Equipment/Crew/Schedule/Budget. Comments excluded. Web = print-to-PDF (Save as PDF).
- **P4 Scene Comments** — full review system per scene: `scene.comment_list = [{id,text,author,created_at,updated_at,status}]`. Add/edit/delete own, Open/Resolved toggle, resolved collapsed by default. Owner-only for now. Persisted via autosave PUT. NOT in PDF. `CommentsPanel` component.
- **P5 Image Gen Architecture (no real provider)** — `backend/image_service.py` provider-agnostic (mock/none via env IMAGE_PROVIDER, default mock=simulated SVG frame, no external calls/credits). Scene fields `frames[]` (full version metadata) + `active_frame_id`. Endpoints: frames/generate, frames/{fid}/regenerate, frames/{fid}/active, DELETE frames/{fid}, frames/{fid}/status, GET /image-provider. `StoryboardFrame` component: 16:9 preview, status pill, version chips, meta, prompt editor, actions (Generate/Regenerate/Replace/Edit Prompt/Remove/Full Screen), fullscreen viewer modal.
- Backend smoke-tested (generate→v1/v2, delete, cleanup) OK. Frontend smoke screenshots OK.
