# Storyboard AI — PRD

## Original Problem Statement
Production-ready responsive app "Storyboard AI": an AI-powered pre-production platform for filmmakers/agencies/creators that turns a creative brief into a Creative Concept, Director's Treatment, Visual Direction, Script, scene-by-scene Storyboard, Technical Shot List, and per-frame AI image prompts. Dark cinematic UI. Sections: Dashboard, New Project (multi-step wizard), My Projects, Templates, Account Settings. Auth (signup/login/logout/password reset), per-user data isolation. Project editor with Storyboard + Shot List views, scene CRUD + reorder + regenerate, autosave, PDF/CSV/print export, reusable templates. Modular AI service with strict JSON schema + error handling; mock only when key unavailable. No Stripe, no image generation yet.

## User Choices
- Expo app running on web + mobile (single codebase).
- Modular AI provider (default OpenAI gpt-5.4 via Emergent Universal LLM key, backend-only). Real AI now, labelled mock fallback on failure.
- Auth: email+password (JWT) + Emergent-managed Google login.
- Design: best judgment on top of cinematic dark + gold ("6 Glass / Luxe DARK", Cormorant Garamond + Geist).

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT + Google session auth. Modular LLM service via emergentintegrations (`AI_PROVIDER`/`AI_MODEL` env-switchable). Endpoints under `/api`.
- Frontend: Expo Router (web + native). Bottom tabs. AuthContext, api client with Bearer token in secure storage/localStorage.
- Data models: users, user_sessions, password_resets, projects (embeds settings, scenes[], generated outputs, favorite/archived/export_count, created_at/updated_at). Templates served from backend (12, categorized).

## Personas
Filmmakers, videographers, directors/DoPs, production companies, ad agencies, social creators, corporate marketing teams.

## Implemented (2026-06)
- Auth: register/login/logout/password-reset (JWT) + Google session; protected routes; per-user isolation (verified).
- Dashboard: hero (STORYBOARD AI), stat cards, quick actions, recent projects, empty state.
- New Project multi-step wizard (Project / Video / Creative / Advanced / Review) with sticky CTA + review-edit.
- Real AI generation → concept, creative summary, treatment, visual direction, script, scenes (all required fields incl. shot size/angle/movement/lens/lighting/audio/transition/image prompt). Full brief passed to the model.
- Editor: Overview/Storyboard/Shot List/Script; scene edit modal; add/duplicate/delete/move scenes; regenerate scene; regenerate image prompt; autosave; total duration; export PDF/CSV/print with export-count tracking.
- My Projects: search, filter, sort, favorite, rename, duplicate, archive, delete.
- Templates: 12 categorized templates that prefill the wizard.
- Account settings + logout.
- Rebranded "FrameFlow Studio" → "Storyboard AI" across app + PDF export.

## Validation
- iteration_1: backend 23/23 pass, frontend ~95% (ownership isolation, full happy path, editor, export all pass).
- Post-rebrand: curl-verified real AI generation with rich brief; 12 categorized templates; UI screenshots of login/dashboard/editor; lint clean; protected-route redirect confirmed.

## Backlog (P1/P2)
- P1: Drag-and-drop scene reorder (currently move up/down); inline overview editing; richer per-scene placeholder frames.
- P1: Server-side rate limiting; refresh-token rotation.
- P2: Image generation (Nano Banana / GPT Image) using stored prompts; team sharing/collaboration; PDF theming options.
- P2: Stripe billing (explicitly deferred).

## Next Tasks
- Re-run the testing_agent once its workflow slot frees (infra lock during this session) for a fresh full regression.
- Add drag-and-drop reordering; wire image generation from the stored prompts.
