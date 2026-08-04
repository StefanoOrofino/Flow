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

## Sprint 6 (2026-06 / iteration 8) — Design System, Light/Dark/System theming & mobile responsiveness
- **theme.ts**: strongly-typed `ThemeTokens` (background/surface/card/border/primary/accent/success/warning/danger/text/muted) with `lightTokens` (warm off-white) + `darkTokens` (layered dark, no pure black). Fixed gold accent #C5A059 with per-theme AA variants. Flat semantic `Palette` projection (`toPalette`) keeps existing `createStyles(C)` screens tractable. S/R/F/MAX_W unchanged.
- **ThemeProvider.tsx** (new): `useTheme()` → {mode, resolvedTheme, tokens, C, setMode, toggleTheme, isDark, isSystem, density, setDensity, scale, reduceMotion, setReduceMotion, highContrast, setHighContrast, isPhone}. mode light|dark|system (system via useColorScheme), default **dark**. Persisted to AsyncStorage keys frameflow.theme.mode/.density/.a11y.*. Gates first render until hydrated (no flash). High-contrast strengthens borders/text; reduceMotion disables AnimIn entrance.
- **Live switching**: every screen converted from static color object to `useMemo(() => createStyles(C), [C])`. Editor project/[id].tsx uses a module-scoped active palette + root `key={resolvedTheme}` so memoized SceneCards remount and re-theme instantly. No reload, no white flash (verified).
- **Settings redesign** (settings.tsx): Profile, Appearance (Theme tiles System/Light/Dark, Workspace density radios — Compact disabled on phone, locked gold Accent), Accessibility (Reduce motion, High contrast switches), Notifications/AI/Export/Keyboard-shortcuts(web)/About + Log out.
- **Workspace density**: compact/comfortable/large scales shared H1/H2/Body/Label typography; compact auto-treated as comfortable on phones.
- **Mobile**: 44px min touch targets across ShotList/Settings controls; ShotList already card-based (not a wide table); AuthShell single-column on narrow with cinematic Hero (fixed-dark, intentional) hidden.
- Verified iteration_8: theme switch/persistence/density/a11y/editor both-theme correctness + no regressions on dashboard/projects/templates/wizard, desktop 1280 + mobile 390. Cosmetic web-only warnings only (shadow* deprecation, dep element.ref).
- Remaining (next): storyboard "one scene card per screen" swipe nav on phones; ShotList filters in a true bottom sheet; skeleton loaders vs spinners polish.

## Sprint 7 (2026-06 / iterations 9) — Internationalization (English + Italian)
- Stack: i18next@26 + react-i18next@17 + expo-localization@17. Config in src/i18n/index.ts (namespaced resources, fallbackLng 'en', fallbackNS 'common', ns:key separator ':', missing-key dev logging).
- LanguageProvider (src/LanguageProvider.tsx): exposes currentLanguage / setLanguage / availableLanguages. First launch detects device locale (it→Italian, else English); selected code persisted to AsyncStorage 'frameflow.language' (only 'en'|'it', validated). Instant switch (react-i18next) with no reload/logout. Gated first render to avoid flicker. Wrapped in _layout: ThemeProvider > LanguageProvider > AuthProvider.
- Translation files: src/i18n/en.json + it.json, namespaces: common (incl. time.* relative), navigation, auth, validation, errors, settings, dashboard, projects, templates. Plurals via i18next (projects.scenesCount_one/_other → scena/scene). Relative time + date/number formatting use active locale (it-IT / en-US).
- Project Language concept (separate from UI language) requested by user — NOT yet implemented (deferred; needs backend Project.language field + wizard + AI-gen wiring).
- COMPLETED & verified (iteration 9 + screenshot): Phase 1 (infra + shared), Phase 2 (Login/Signup/Reset + AuthShell tagline), navigation tabs, Settings (full + 🌐 Language selector lang-en/lang-it), and Phase 3 core screens Dashboard + Projects + Templates. Confirmed instant switch, persistence across reload, no raw keys, EN+IT.
- REMAINING (next i18n phases):
  - New Project wizard (app/(tabs)/new.tsx) — dozens of picker/field labels (options.ts values are data taxonomy — decide translate vs keep).
  - Editor app/project/[id].tsx tab bar + Overview/Script/Exports/Settings tab strings + confirm dialogs.
  - Storyboard field group labels, ShotList column/group labels + toolbar, AIDirector panel strings.
  - Project Language feature (backend + wizard + AI output language) per user's detailed spec.
  - Backend error-code → translated message mapping.

## Sprint 8 (2026-06 / iteration 12) — Editable Overview + Camera/Lighting Multi-Select (Run 1 of "Fully Editable Workspace")
- OVERVIEW tab now fully editable (was read-only). Inline EditableField brief fields (title/client/campaign/goal/target_audience/key_message/call_to_action/references/extra_notes) with debounced autosave via useProjectStore.mutate + undo/redo. Single-selects via Picker (duration/platform/aspect_ratio/language/crew_size/visual_style/mood/editing_style/music_style). AI concept/treatment kept as read-only reference cards below.
- NEW reusable `MultiSelect` component (src/components.tsx): removable chips, in-sheet search, Custom free-text, up-arrow reorder, bottom-sheet on phone / centered sheet on wide. Used for Camera Styles + Lighting Styles in Overview.
- options.ts: CAMERA_STYLES_MULTI, LIGHTING_STYLES_MULTI, LANGUAGES added.
- Data model: ProjectIn extended (camera_styles[], custom_camera_style, lighting_styles[], custom_lighting_style, key_message, call_to_action, references, notes). Overview edits go through PUT /projects/{id} (schema-free merge), so no strict-model blocking. Legacy single camera_style/lighting_style migrated ONCE into custom_* on first open (guarded by styles_migrated flag).
- AI: build_prompt uses _style_list() (arrays + custom, fallback legacy) and, when >1 style, adds a palette-distribution instruction (do not force every style into every scene).
- i18n: overview namespace + common.multiselect (EN + IT).
- Verified iteration_12: 9/9 acceptance (autosave+persist, focus retention while autosaving, pickers, both multiselects incl. search/custom/reorder/persist, undo/redo, no regressions in Storyboard/ShotList/AIDirector, EN+IT no raw keys, Light/Dark, mobile bottom-sheet no overflow). Applied post-test fix: migration guarded with styles_migrated flag.
- NEXT EPIC (approved for next run): "Create Project from Client Brief" — entry point, multi-file upload, PDF/DOCX/PPTX/TXT/RTF extraction, structured AI analysis w/ High/Med/Low confidence, editable Analysis Summary review (no project generation yet in that run).

## Sprint 9 (2026-06) — Logo Exploration board (Flow Forward)
- New standalone route `app/logo.tsx` + reusable SVG mark `src/brand/FrameFlowLogo.tsx` (react-native-svg). Six refined variations of ONE direction ("Flow Forward" — negative-space F built from cinematic frames + forward motion): 1 Aperture F, 2 Filmstrip F, 3 Motion F (trailing echoes), 4 Bracket F, 5 Forward F (slanted arms), 6 Play Frame F (app-icon hero w/ play notch).
- Each variation rendered across 8 contexts: dark bg, light bg, gold accent, monochrome, horizontal lockup (mark + FrameFlow/STUDIO wordmark), icon only, app-icon preview (rounded square), favicon preview (16/24/32). Fixed brand palette (GOLD #C5A059 / INK / CREAM), theme-token chrome via useTheme. Discoverable via Settings → About → "Logo Exploration".
- Purpose: choose final identity before production implementation. Verified rendering on mobile 390px.

## PAUSED — brief_service backend (inert, not wired)
- `brief_service.py` fully built (extract PDF/DOCX/PPTX/TXT/RTF + analyze_brief LLM call w/ confidence scores 0-100, conflict detection, map_brief_to_project) and `ai_config.py` (model-agnostic per-module config) added. `import brief_service` added to server.py but NO endpoints wired yet — safe/inert. Resume: add POST /api/briefs/analyze (multipart) + POST /api/briefs/generate, then frontend flow.

## Sprint 9b — OFFICIAL logo (Flow Forward, refined)
- Chosen = Concept 2 "Flow Forward", REFINED in `src/brand/FrameFlowLogo.tsx`: two overlapping cinematic rounded-rect FRAME OUTLINES offset diagonally up-right (frames flowing forward); removed the old play triangle. Single color, no gradient/shadow, rx12, scales 16→1024. Exports LogoMark/AppIcon(22.5% radius)/Wordmark/HorizontalLogo/VerticalLogo. BRAND gold #C5A059 / ink #232333 / light #F7F5EF.
- `app/logo.tsx` rebuilt as Brand Identity deliverables board (hero, H/V lockups dark+light full-width, app icon, color versions, favicon 16-48 + tab mock, scalability, clear-space, palette). SVG at `assets/brand/frameflow-mark.svg`. NOT yet wired into header/splash/favicon (awaiting approval).

## Sprint 10 — Auth & Subscriptions Run 1 (read-only Billing, NO Stripe)
- Backend `billing.py` (plans free/studio/agency + limits, build_summary). `server.py`: get_or_create_subscription (Free auto-assign, db.subscriptions), bump_usage (db.usage), GET /api/billing/summary (projects live; ai/image/export counters bumped in generate/frames-generate/exported). stripeEnabled:false.
- Frontend `app/billing.tsx` read-only: Current Plan + status badge, Usage bars (warn≥80/error≥100), Plan Limits, Upgrade placeholder (disabled), Available plans (Free=Current/Studio=Popular/Agency), pull-to-refresh, i18n billing ns EN+IT, useTheme. Linked from Settings → "Plan & Billing". api.billingSummary added.
- Verified backend curl + frontend screenshots. NEXT Run 2: Stripe Test checkout/webhooks/portal (test key in pod env).

## Sprint 11 (2026-06) — Create Project: full Run 1 (upload + vision) & dual entry (DONE)
- Backend brief_service.py: text extraction (PDF/DOCX/PPTX/TXT/RTF) + MULTIMODAL vision (OpenAI gpt-5.4 via Emergent key, ImageContent in UserMessage.file_contents). Returns fields (28 textual, confidence 0-100 + band + source + conflict) + visual (12 image-derived) + summary. ai_config.py = model-agnostic per-module config. map_brief_to_project(fields,visual) -> ProjectIn.
- Endpoints: POST /api/briefs/analyze (JSON base64 documents+images); POST /api/briefs/create-project (creates draft; generate:true runs BACKGROUND asyncio task, returns status 'generating' instantly — fixes prior 502 ingress timeout; frontend polls GET /projects/{id} until 'generated').
- Frontend NEW = CHOICE screen app/(tabs)/new.tsx (2 equal cards). Opt1 -> app/brief-upload.tsx (doc+image upload, thumbnails, reorder/remove, Analyze). Opt2 -> app/manual-project.tsx (multi-section form + optional AI-analyzed visual refs) -> Continue to Review. Both -> app/brief-review.tsx (summary banner, filter chips, editable fields w/ confidence/source/conflict/suggested; manual = 'User entered' no confidence) -> Confirm & Generate (bg + poll -> project editor). briefSession.ts handoff. i18n createProject/reviewAnalysis/manualProject EN+IT. expo-image-picker + app.json photo permission.
- Verified: curl (analyze 91%; create 0.0s -> generated 8 scenes ~60s) + testing_agent iteration_14 (7/7 backend; E2E both paths; 502 fixed). Post-test fixes: reviewAnalysis:userEntered i18n key + stray text-node in brief-upload.

## Sprint 12 (2026-06) — Pricing & Billing UI (DONE, no live Stripe)
- Backend billing.py plans renamed Free/Pro/Studio (was free/studio/agency); pro.recommended=true. limits: free{3,20,10,5} pro{25,500,300,unl} studio{unl,unl,1500,unl}. build_summary adds plan.recommended.
- Billing page (app/billing.tsx): added Next renewal row (placeholder 'No renewal (Free plan)' when Free), limit-reached banner (any metric>=100% -> /pricing), upgrade CTA + plan cards route to /pricing.
- NEW app/pricing.tsx: 3 comparison cards Free/Pro/Studio, 8-feature matrix (active_projects, ai_director, ai_images, brief_imports, pdf_exports, team, client_review, storage), Pro highlighted Recommended, Upgrade buttons show 'checkout coming soon (Stripe Run 2)' placeholder (NO live Stripe). Desktop-first responsive (row on >=900px), dark/light, i18n pricing ns EN+IT.
- Verified via screenshots (billing + pricing) + backend (plans free/pro/studio, recommended=pro). 
- NEXT SPRINT (approved, phased): FrameFlow Admin Console. Roles owner/admin/support/user, server-side authorization, idempotent Owner seed (owner email TBD from user — placeholder given as YOUR_EMAIL_HERE), audit log, in-app /admin route gated (403 for non-admins, hidden from users, Settings->Admin Console), lazy-loaded module. Phase 1 Foundation (auth+roles+dashboard+users+projects+read-only AI usage+billing placeholder 'Available after Stripe Run 2'+system health+audit log) -> Phase 2 Management -> Phase 3 Analytics -> Phase 4 Billing(after Stripe) -> Phase 5 Platform admin/feature flags. MUST call integration_expert for admin auth before coding. Then priorities: Stripe Checkout, Webhooks, Billing Portal.
