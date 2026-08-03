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

## Sprint 5 (2026-06 / iteration 8) — AI Director (iterative revision engine)
- **Not a chatbot**: `ai_director.py` (provider-agnostic; AI_PROVIDER/AI_MODEL, EMERGENT_LLM_KEY) loads FULL project context (brief, concept, treatment, script, scenes, style, client, notes, scene comments) and returns STRICT JSON: summary + Change Plan + project_patch + scene_patches (never chats).
- **Preview → Apply**: `POST /director/revise` returns {summary, runtime_delta, plan, diff (old→new), preview} WITHOUT saving. `POST /director/apply` snapshots current as a Version, then persists the preview. Scope-enforced patching (`_apply_patches`) + field-level diff (`_diff`).
- **Selective scope**: project / storyboard / script / dialogue / shotlist / camera / lighting / prompts (narrow scopes only touch their fields; project_patch ignored for narrow scopes).
- **Version history** (`db.versions`, snapshots exclude nothing): list / restore (auto-snapshots current first) / rename / delete. Endpoints under `/projects/{pid}/versions`.
- **Frontend** `AIDirector.tsx`: collapsible right sidebar (wand button in editor header), scope chips, instruction input, 12 quick actions (Improve Story/Dialogue/Visual Style/Pacing/Cinematography, Simplify Script, Increase Emotion, Luxury/Apple/Nike/Documentary/Premium), Change Plan, Old→New diff toggle, Apply/Discard, Version History with restore/rename/delete. Applied revisions go through `store.applyServer` (undo-aware). api.ts: directorRevise/Apply, list/restore/rename/deleteVersion.
- Verified: revise (dialogue scope → 7 diffs), apply (VO changed + version created), restore (reverted), rename, delete — backend + UI. Seed project c73286507b42 kept clean.

## Sprint 4 (2026-06 / iteration 7) — Real Gemini Nano Banana image generation (LIVE)
- **Provider**: `GeminiProvider` in image_service.py (`gemini-3.1-flash-image-preview`) via Emergent Universal Key, server-side only. Abstraction intact; `mock` + `none` kept for dev/fallback. `IMAGE_PROVIDER=gemini` in backend/.env. get_provider() reads env lazily (load_dotenv runs after import).
- **Cost/safety controls**: DEV_IMAGE_LIMIT=3 real gens per project (`project.image_gen_count`, 429 when exceeded); 1 active generation per project (in-memory `_active_generations` lock → 409); frontend single-active lock (frameBusy) + disabled buttons; confirmation modal "Generate this storyboard frame? This action uses AI credits." before every generate/regenerate/new-version.
- **Manual only**: no auto-generation on project create. "Generate All Frames" is a DISABLED 'SOON' toolbar action.
- **Error handling**: failures never persist a broken version (raise 502, keep prompt, surface error in frame panel, allow retry).
- **Prompt construction**: `_build_frame_prompt()` combines base description/edited prompt + scene technical fields (shot/angle/lens/movement/lighting/palette/time/location/characters) + project treatment visual style + aspect ratio. Respects real settings, no forced generic style.
- **Versions**: each success = new version (chips to compare/set-primary/delete; regenerate from edited prompt). SIMULATED label only for mock; gemini frames show "gemini".
- Verified E2E on scene 1: confirm → real JPEG generated (Completed) → version 1 → active → reload persists; 429 dev-limit; concurrency; cleanup. Seed project restored (0 frames, count 0). Keys never exposed/logged in frontend.
- **Single source of truth**: Storyboard & Shot List are two views of the same `scene` data. Primary shot shares fields with the scene (two-way sync verified both directions); secondary shots store overrides in `shot.data` and stay isolated.
- **useProjectStore.ts** (new): centralizes persistence. `mutate()` = local edit → history push + debounced autosave; `applyServer()` = AI/frame responses (already persisted) + history snapshot; `normalizeProject()` auto-repairs on every transition (sequential scene_number, unique scene/shot ids, single primary shot, arrays present → no dup numbers / no orphans).
- **Autosave state machine**: idle/unsaved/saving/saved/offline/recovering with exponential-backoff retry on failure + `online`/`offline` listeners (never loses work). Header shows all states.
- **Undo/Redo**: 100-deep history + Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z shortcuts (ignored inside inputs) + header buttons (disabled when empty).
- **SceneCard refactor**: reads straight from `scene` prop (removed stale local mirror) so undo/redo & sync reflect live; `EditableField`/ShotList `Field` are focus-aware + idempotent-commit (no duplicate history entries).
- **Statistics** always live: Storyboard SummaryPanel (Total Scenes/Shots, Runtime, Shooting Time, Locations, Characters, Lenses, Movements, Completion) + Shot List Production Summary.
- Verified: iteration_6 — frontend 100% in-scope pass, backend 29/34 (5 failures are known Cloudflare-edge 502 on real-AI /generate, not regressions). Seed project c73286507b42 restored to 8 real scenes.

## Sprint 2/3 (iteration 5) — Storyboard depth
Implemented in strict priority order per user request:
- **P1 Storyboard Editor** — verified complete (inline edit, autosave, drag-drop, scene actions, regen, expandable cards). NOTE: previous fork left many referenced StyleSheet keys undefined (RN silently ignored → unstyled). Added ALL missing styles (efInput, group, statusRow, frameBig, toolbar, summary, etc.).
- **P2 Smart Shot List** — rewrote Shot List tab as a professional horizontal-scroll production table, auto-synced from `project.scenes` (single source of truth, zero duplication). `ShotListTab` in project/[id].tsx.
- **P3 Storyboard PDF** — rewrote `buildHtml` in src/exporter.ts to a Storyboard-focused package: Cover, Project Summary (Concept/Treatment/Audience/Video Specs), Script, Storyboard (one page per scene + large 16:9 frame using active generated frame or placeholder), Shot List table, Final Notes. Removed Equipment/Crew/Schedule/Budget. Comments excluded. Web = print-to-PDF (Save as PDF).
- **P4 Scene Comments** — full review system per scene: `scene.comment_list = [{id,text,author,created_at,updated_at,status}]`. Add/edit/delete own, Open/Resolved toggle, resolved collapsed by default. Owner-only for now. Persisted via autosave PUT. NOT in PDF. `CommentsPanel` component.
- **P5 Image Gen Architecture (no real provider)** — `backend/image_service.py` provider-agnostic (mock/none via env IMAGE_PROVIDER, default mock=simulated SVG frame, no external calls/credits). Scene fields `frames[]` (full version metadata) + `active_frame_id`. Endpoints: frames/generate, frames/{fid}/regenerate, frames/{fid}/active, DELETE frames/{fid}, frames/{fid}/status, GET /image-provider. `StoryboardFrame` component: 16:9 preview, status pill, version chips, meta, prompt editor, actions (Generate/Regenerate/Replace/Edit Prompt/Remove/Full Screen), fullscreen viewer modal.
- Backend smoke-tested (generate→v1/v2, delete, cleanup) OK. Frontend smoke screenshots OK.
