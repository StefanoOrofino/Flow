#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: "Design System & Light/Dark Mode sprint + first-class mobile responsiveness. Refactor theme.ts into semantic light/dark tokens, add ThemeProvider/useTheme (light/dark/system) with AsyncStorage persistence (key frameflow.theme.mode, default dark), convert all screens to live createStyles(tokens) so theme switches instantly with no reload, add Workspace Density (compact/comfortable/large; compact disabled on phones) + Accessibility (reduce motion, high contrast), and a fully redesigned Settings screen. Fixed gold #C5A059 accent."

frontend:
  - task: "Dynamic theme engine (light/dark/system) with instant live switching"
    implemented: true
    working: "NA"
    file: "src/theme.ts, src/ThemeProvider.tsx, app/_layout.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added ThemeTokens interface + lightTokens/darkTokens + flat Palette projection. ThemeProvider persists mode to AsyncStorage (frameflow.theme.mode), resolves system via useColorScheme, default dark. All screens converted to createStyles(C) via useTheme."
  - task: "Redesigned Settings screen (Theme, Workspace Density, Accessibility, sections)"
    implemented: true
    working: "NA"
    file: "app/(tabs)/settings.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Theme tiles (System/Light/Dark), Workspace density radios (Compact disabled on phone), Accessibility switches (Reduce motion, High contrast), Accent (fixed gold, locked), plus Notifications/AI/Export/Keyboard shortcuts/About sections + Log out."
  - task: "Editor project/[id].tsx themed live (Overview, Storyboard, Shot List, Script, AI Director, dialogs)"
    implemented: true
    working: "NA"
    file: "app/project/[id].tsx, src/ShotList.tsx, src/AIDirector.tsx, src/components.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Editor uses module-scoped active palette + createStyles(C); root View keyed by resolvedTheme so memoized SceneCards remount and re-theme on toggle. ShotList/AIDirector/shared components converted to useTheme."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 8
  run_ui: true

test_plan:
  current_focus:
    - "Dynamic theme engine (light/dark/system) with instant live switching"
    - "Redesigned Settings screen (Theme, Workspace Density, Accessibility, sections)"
    - "Editor project/[id].tsx themed live (Overview, Storyboard, Shot List, Script, AI Director, dialogs)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Frontend-only regression for the Design System sprint. Login with seeded account (see /app/memory/test_credentials.md: sb_1785767871@studio.com / secret123). Verify: (1) Settings > Appearance > Theme tiles switch the WHOLE app instantly between Dark and Light with no reload/flash and persist across navigation; System follows device. (2) Workspace density radios change readability (Large bigger); Compact is disabled on phone width. (3) Accessibility Reduce motion + High contrast toggles work. (4) Open seeded project c73286507b42 editor and confirm Overview, Storyboard scene cards, Shot List cards, Script and the AI Director panel all render correctly in BOTH light and dark (no dark residual in light, no white flashes in dark). (5) No regressions to existing flows (dashboard, projects, templates, new project wizard). Do NOT trigger real AI image generation (uses credits) — just confirm the confirm-modal + panels theme correctly. Test at mobile width (390) and desktop width."

  - task: "i18n Phase 1+2: framework, LanguageProvider, device detect, persistence, Settings language switcher, translated navigation + auth + settings"
    implemented: true
    working: "NA"
    file: "src/i18n/index.ts, src/i18n/en.json, src/i18n/it.json, src/LanguageProvider.tsx, app/_layout.tsx, app/(tabs)/_layout.tsx, app/(tabs)/settings.tsx, app/login.tsx, app/signup.tsx, app/reset.tsx, src/AuthShell.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "i18next + react-i18next + expo-localization. LanguageProvider exposes currentLanguage/setLanguage/availableLanguages; persists frameflow.language in AsyncStorage; first launch detects device locale (it->Italian else English); default fallback en. Settings > Language selector (lang-en / lang-it) switches whole UI instantly. Namespaced en.json/it.json (common/auth/navigation/settings/errors/validation/dashboard/projects/templates + stubs). Phase 3/4 (dashboard/projects/templates/wizard/editor body strings) still English - to be wired next."

agent_communication:
    - agent: "main"
      message: "i18n Phase 1+2 regression (frontend only). Seeded login: sb_1785767871@studio.com / secret123. Verify: (1) App loads in English by default with NO raw i18n keys (no 'auth:...' or 'settings:...' visible). (2) Login/Signup/Reset screens fully translated. (3) Bottom tab labels translated. (4) Settings > 🌐 Language shows English + Italiano (testIDs lang-en, lang-it). Tapping Italiano instantly switches Settings + tab labels to Italian with NO reload/logout/navigation reset (e.g. title becomes 'Impostazioni', tabs 'Progetti/Modelli/Nuovo', logout 'Esci'). Tapping English switches back. (5) Selection persists after full page reload (AsyncStorage frameflow.language). (6) Theme/density/accessibility from previous sprint still work. NOTE: Dashboard/Projects/Templates/New-wizard/Editor body content is intentionally still English in this phase (Phase 3/4 pending) - do NOT fail the run for those; only confirm the translated surfaces above and that no raw keys appear on translated screens. Test at desktop 1280 and mobile 390 (Compact density disabled on mobile)."

  - task: "Bottom tab bar iOS safe-area redesign (labels clipped near bottom edge)"
    implemented: true
    working: "NA"
    file: "app/(tabs)/_layout.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Tab bar now respects useSafeAreaInsets bottom (min 10 iOS / 12 Android); height=56+bottomInset, paddingBottom=bottomInset, paddingTop=8. Icons 25px (add 31px), labels 12px medium with reduced icon-label gap, tabBarItemStyle minHeight 44. Fixes clipped labels / labels too close to bottom edge on iPhones with home indicator."

agent_communication:
    - agent: "main"
      message: "BUG FIX regression: Bottom tab bar labels were clipped and too close to the bottom edge on iPhone (safe-area not respected). Fixed in app/(tabs)/_layout.tsx. Please verify (frontend only, seeded login sb_1785767871@studio.com / secret123): (1) All 5 tab labels (Dashboard/Projects/New/Templates/Account, or IT equivalents) are FULLY visible and not clipped; (2) tab bar sits above the home-indicator area with comfortable bottom padding; (3) icons ~25px and labels legible ~12px medium with a small icon-label gap; (4) tapping each tab navigates correctly and touch targets feel >=44pt. Test primarily at mobile widths simulating iPhone SE (375x667), iPhone 13/14/15 (390x844), iPhone Pro Max (430x932) and an Android width. It's a web preview so exact home-indicator inset may be 0 there — confirm no clipping and correct layout/spacing; note that on-device iOS inset padding is driven by useSafeAreaInsets."

  - task: "Editable Overview + Camera/Lighting multi-select (Run 1)"
    implemented: true
    working: "NA"
    file: "app/project/[id].tsx (Overview), src/components.tsx (MultiSelect), src/options.ts, backend/server.py (ProjectIn + build_prompt _style_list), i18n en/it (overview + common.multiselect)"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Overview tab now fully editable: brief fields (title/client/campaign/objective(goal)/target_audience/key_message/call_to_action/references/extra_notes) via inline EditableField with debounced autosave through useProjectStore.mutate (undo/redo supported); creative direction single-selects via Picker (duration/platform/aspect_ratio/language/crew_size/visual_style/mood/editing_style/music_style); Camera Styles + Lighting Styles now MultiSelect (removable chips, in-sheet search, Custom free-text, reorder via up-arrow, bottom-sheet on phone). Legacy single camera_style/lighting_style migrated once into custom_* on first open. Backend build_prompt uses _style_list() to combine arrays+custom (fallback to legacy) and adds a 'distribute styles across scenes, not every style in every scene' instruction. AI concept/treatment kept as read-only reference below. EN/IT complete; render verified via screenshot (dark)."

agent_communication:
    - agent: "main"
      message: "RUN 1 regression (frontend focus, backend optional). Seeded login sb_1785767871@studio.com / secret123; open project 'Solstice Perfume' editor (Overview tab). VERIFY: (1) Every Overview brief field is editable and AUTOSAVES — type in title/client/campaign/objective/audience/key message/CTA/references/notes; header shows Unsaved changes -> Saved; reopen project (navigate away and back) and confirm the edit persisted. (2) Single-select Pickers (duration/platform/aspect ratio/language/production level/visual style/mood/editing style/music style) open, change value, persist. (3) Camera Styles + Lighting Styles MultiSelect (testIDs ov-camera / ov-lighting): open selector, SEARCH filters options (ov-camera-search), tap multiple options to add removable chips, remove a chip (ov-camera-remove-<val>), add a Custom value (ov-camera-custom + ov-camera-custom-add) shows a custom chip, reorder selected via up-arrow, Done closes; selections persist after reopening. (4) Undo/redo buttons in header still work for Overview edits. (5) NO regressions: Storyboard scene editing, Shot List editing/sync, and AI Director still work. (6) EN + IT: switch Settings language to Italiano and confirm Overview labels translate (Titolo del progetto, Stili di ripresa, etc.) with no raw keys. (7) Light + Dark themes render Overview + the MultiSelect sheet correctly. Test desktop 1280 and mobile 390 (MultiSelect must open as a bottom sheet on mobile, chips must not overflow horizontally). Do NOT click regenerate/AI generate (uses credits) beyond opening the AI Director panel."
