# Kwentuhan Web → React Native (Android) Port Blueprint

**For Claude Code, running inside the kwentuhan native repo.**

This document is the implementation plan for porting 5 systems from the web app (source of truth) into the React Native Android app. It pairs with the shared substrate already in the web repo:

- [`design-tokens.json`](./design-tokens.json) — colors, type scale, spacing, level/cluster, export-card dimensions, reaction emoji order
- [`microcopy.ts`](./microcopy.ts) — every user-facing string (preserve Taglish exactly)
- [`api-contract.md`](./api-contract.md) — all 9 API endpoints with request/response shapes
- [`flows.md`](./flows.md) — every user flow step-by-step with state transitions
- [`METRICS.sql`](./METRICS.sql) — analyst queries for the telemetry layer

---

## How to use this document

**Option A — Full blueprint context:** paste sections A–E (this entire file before the `Stage Prompts` section) into your Claude Code session as one-shot context. Then issue Stage prompts in order.

**Option B — Stage-by-stage:** paste only the relevant Stage prompt below. Each is self-contained and references the substrate.

**Either way:** always attach the 4 substrate files (`design-tokens.json`, `microcopy.ts`, `api-contract.md`, `flows.md`) as context to every prompt. They're the contract.

---

## Operating rules for the implementing agent

These are non-negotiable. Stop and ask the user if anything below would be violated.

1. **Do not modify the web repo from the native repo session.** This document is *about* web behavior; the implementing agent only writes to the native repo.
2. **Substrate files are read-only references.** If you need to change a microcopy string or token value, raise it as an open question — don't fork it.
3. **No code outside the scope of the current stage.** Stage 1 doesn't touch contribute UI; Stage 3 doesn't touch telemetry. Discipline matters.
4. **Microcopy is sacred.** Especially Taglish (`Sagutin mo rin`, `Ikwento mo naman…`, `Walang nakakaalam, walang husga`, `Live na ang kwento mo!`). Never paraphrase. Never translate.
5. **Reaction emoji order is canonical:** `🤣 😱 💀 ❤️ 🔥`. Don't reorder; users have muscle memory.
6. **Telemetry must never break UX.** Every `track()` call is fire-and-forget with silent failure. If you can't guarantee this, don't fire it.
7. **PNG export from native (when built later) must be exactly 1080×1920.** Cross-platform users share these — they need to look identical.
8. **Each Stage must end with an acceptance check.** If the check fails, stop and report; don't push forward.

---

# A. Web Source Extraction

For each system: exactly where the truth lives in the web codebase, and what behavior counts as canonical.

### A1. Font System

| What | Where in web |
|---|---|
| Font loading | `app/layout.tsx` (`next/font/google` imports of `Playfair_Display`, `DM_Sans`, `Kalam`) |
| CSS variable names | `--font-playfair`, `--font-dm-sans`, `--font-kalam` |
| Type scale + usage rules | `docs/design-tokens.json` → `typography.scale` (9 named steps) |
| Component-level usage | grep `components/**/*.tsx` for `var(--font-*)` |
| Brand wordmark | Playfair 700–900 |
| Question hooks, headings | Playfair 700 |
| Body UI text | DM Sans 400–600 |
| Handwritten answer text | Kalam 400 cursive |

**Behavior of truth:** brand/serif → Playfair. Body/sans → DM Sans. User-written kwento → Kalam.

### A2. Contribute a Question

| What | Where in web |
|---|---|
| Modal UI + form | `components/AddQuestionModal.tsx` |
| Fields | hook, deepDive, level, category (filtered by mode), mode, cluster (derived from category), contributorUsername (optional, `@`-prefixed), language (default `en`) |
| Validation | hook 8–220 chars, deepDive 0–220, username 0–24 (UI) / 0–32 (API) |
| Quality nudges | `qualityNudge()` — yes/no, multi-question, vague-philosophical patterns |
| Vibe pill sublabels | `VIBE_HINTS` — `every day / real talk / edge it up` |
| Rotating placeholder | `PLACEHOLDER_EXAMPLES` (per-mode pool) + `pickPlaceholder(mode)` |
| API | `POST /api/contribute` — see `docs/api-contract.md` |
| Post-submit success | `PublishedSuccess` inside `AddQuestionModal.tsx` — mini card + Deep Dive follow-up + View/Answer/Done |
| Cache invalidation | `bustQuestionsCache()` (server) + `clearQuestionCache()` (client) |

**Behavior of truth:** publishing returns the row instantly; question is queryable on the next `GET /api/questions` (no moderation queue).

### A3. Scan to Play

| What | Where in web |
|---|---|
| Web role | Web is the QR *target*, not the scanner. No browser camera. |
| Inbound URL shape | `/q/{questionId}` → `app/q/[questionId]/page.tsx` |
| What happens on land | Renders question card + `KwentoForm` for User 2 to answer |
| Question resolution | `getQuestionById()` in `lib/questionsServer.ts` — checks static `data/questions.json` then `contributed_questions` table |
| ID formats | Static: `1..552` numeric. Community: `q_` + 16 hex chars. |

**Behavior of truth:** scan target = `kwentuhan.cards/q/{id}` URL → opens "now answer this" surface.

### A4. Scan to Reveal

| What | Where in web |
|---|---|
| Inbound URL shapes | `/q/{questionId}/k/{kwentoId}` (canonical) OR `/reveal/{kwentoId}?teaser=true` (legacy) |
| Pages | `app/q/[questionId]/k/[kwentoId]/page.tsx` (canonical), `app/reveal/[shareId]/page.tsx` (legacy redirect) |
| Kwento resolution | `getPersistedKwento(kwentoId)` returns `{kwentoId, questionId, questionText, answerText, isTeaser, createdAt}` |
| Reveal UI | `components/RevealAnswer.tsx` — Kalam answer, byline, 5-emoji reaction row, floating burst on tap |
| Empty state | `NoKwentoNote` — soft "we couldn't load this kwento" when ID unresolvable |
| Follow-up form | `KwentoForm.tsx` — "Sagutin mo rin" → `POST /api/kwento` → unified `KwentoExportPanel` success |

**Behavior of truth:** scan a reveal URL → instant kwento in handwritten font + react/answer/pass-it-on on one screen.

### A5. Impact Metrics

| What | Where in web |
|---|---|
| Event taxonomy | 5 types: `shown`, `skipped`, `answered`, `shared`, `reacted` |
| Client helper | `lib/telemetry.ts` — `track()`, `getSessionId()`, `flushTelemetry()` |
| session_id lifecycle | UUID v4, generated on first call, persisted forever in `localStorage["kw.sessionId"]` |
| Queue behavior | In-memory; auto-flushes every 2s OR at 10 events; drains via `navigator.sendBeacon` on page-hide |
| Server ingest | `POST /api/session-event` — single, `{events:[]}`, or bare array; max 100/batch; always 200 unless malformed |
| Where each event fires | `RevealAnswer` (shown, reacted); `KwentoForm` (answered with dwell/length); `KwentoExportPanel` (shared on PNG + 3 social handlers); `SessionScreen` (shown, skipped) |

**Behavior of truth:** every interaction with a question → one row in `session_events`, fire-and-forget, never blocks UX.

---

# B. React Native Implementation Plan (per system)

### B1. Font System Parity

**Files to create**
- `android/app/src/main/assets/fonts/PlayfairDisplay-Bold.ttf`, `-Black.ttf`, `-Italic.ttf`
- `android/app/src/main/assets/fonts/DMSans-Regular.ttf`, `-Medium.ttf`, `-SemiBold.ttf`, `-Bold.ttf`
- `android/app/src/main/assets/fonts/Kalam-Regular.ttf`
- `src/theme/fonts.ts` (semantic mapping)
- `src/theme/typography.ts` (the 9-step scale from substrate)

**Files to modify**
- `react-native.config.js` — register `assets: ['./src/assets/fonts/']`

**State / nav:** none.
**Deps:** none new (Expo: `expo-font`).

**Edge cases**
- Android references fonts by **filename**, not PostScript name or weight prop. `fontWeight: 'bold'` on `DMSans-Regular` won't make it bold — use `DMSans-Bold` explicitly.
- Restrict Kalam to `answerHandwritten` and `kwentoInputBody` only — never UI controls.
- Rebuild required after adding TTFs (`npx react-native run-android`). Metro reload alone won't pick them up.

### B2. Contribute a Question

**Files to create**
- `src/screens/ContributeQuestionScreen.tsx`
- `src/screens/ContributePublishedScreen.tsx` (success state — same screen swap, not new nav push)
- `src/hooks/useContribute.ts`
- `src/components/forms/VibePillRow.tsx`
- `src/components/forms/CategoryDropdown.tsx`
- `src/components/forms/HandleInput.tsx`
- `src/lib/qualityNudge.ts` (verbatim port of pure function)
- `src/lib/placeholders.ts` (verbatim port)
- `src/components/cards/FollowUpQuestionCard.tsx` (with 8s timeout)

**State**
- Form fields: local `useState`
- Submission state: `idle | submitting | done | error`
- `published` snapshot retained after submit
- Quality-nudge: derived from hook text

**Navigation**
- Add stack route `ContributeQuestion` reachable from Session screen "Add" button
- After publish, swap to `Published` view on same route
- View → push `QuestionDetail` with `id`
- Answer → push `QuestionDetail` with `focusAnswer: true`
- Done → `navigation.goBack()`

**Deps**
- `@gorhom/bottom-sheet` or `react-native-modal` (modal sheet)
- `expo-haptics` or `react-native-haptic-feedback`

**Edge cases**
- `KeyboardAvoidingView` with `behavior="padding"` — Publish button must stay visible above keyboard
- AI follow-up timeout: 8s AbortController, hide silently on 503 or timeout (matches web)
- Char counter visible only past 60% used (matches web)
- Vibe pill sublabel color shifts white-on-purple when active
- Quality nudge is non-blocking — Publish still works when shown

### B3. Scan to Play

**Files to create**
- `src/screens/ScanScreen.tsx`
- `src/lib/parseKwentuhanUrl.ts` — extracts `{questionId, kwentoId?}`; rejects non-kwentuhan URLs
- `src/hooks/useCameraPermission.ts`

**Files to modify**
- Root navigator — add `Scan` route + fan-out (`QuestionDetail` for play / `RevealScreen` for reveal)
- `android/app/src/main/AndroidManifest.xml` — `CAMERA` permission

**State**
- Permission: `granted | denied | unknown`
- Scan state: `idle | scanning | parsing | success | invalid`

**Deps**
- `react-native-vision-camera` + `vision-camera-code-scanner` (preferred), OR `expo-camera`
- `react-native-permissions` (bare RN)

**Expected scan payload**
- HTTPS URL to `kwentuhan.cards` (or `www.kwentuhan.cards`)
- Three valid shapes:
  - `https://kwentuhan.cards/q/{questionId}` → Play
  - `https://kwentuhan.cards/q/{questionId}/k/{kwentoId}` → Reveal
  - `https://kwentuhan.cards/reveal/{kwentoId}?teaser=true` → Reveal (legacy)
- `questionId`: numeric `1..552` OR `q_` + 16 hex
- `kwentoId`: `k_` + 16 hex
- **Strip UTM params before navigation** (they're for attribution, not routing)

**Edge cases**
- Permission denied → friendly retry sheet with link to Settings
- Non-Kwentuhan URL → soft "That's not a kwentuhan code" + reset scan; don't crash; don't open URL
- Low-light → torch toggle button on UI
- Front camera scans disabled
- 2-second scan-debounce per session
- App backgrounded mid-scan → reset, don't fire stale event

### B4. Scan to Reveal

**Files to create**
- `src/screens/RevealScreen.tsx`
- `src/components/RevealAnswer.tsx` — Kalam text, byline, 5-emoji row with haptics + floating burst
- `src/components/KwentoForm.tsx` — textarea + submit → `POST /api/kwento`
- `src/components/EmptyStateNotice.tsx` — `💭 We couldn't load this kwento…`
- `src/lib/kwentoApi.ts` — `GET /api/kwento/{id}` + `POST /api/kwento`

**State**
- Kwento fetch: `{status, data}` via `useEffect` on mount
- Reaction: single `Reaction | null`
- Burst queue: `Burst[]` auto-cleanup after 1100ms
- Form: `idle | submitting | success | error`

**Navigation**
- New `Reveal` route taking `{kwentoId, questionId?}`
- After submit, swap to unified post-publish state (same shape as Contribute success)
- Back from Reveal → previous logical screen, NOT a stale modal

**Deps**
- `react-native-reanimated` v3 (floating burst on UI thread)
- `expo-haptics` or `react-native-haptic-feedback`
- `react-native-share` (native share sheet) + `Linking.openURL(...)` for direct deep links

**Edge cases**
- 404 from kwento API → render `EmptyStateNotice`; do not show reveal card
- Use `questionText` from kwento response as fallback when question not separately resolvable
- Slow network → skeleton Kalam-sized gray bars in reveal area
- Multiple bursts can coexist
- UTM params on incoming deep links → pass to telemetry context, don't display

### B5. Impact Metrics

**Files to create**
- `src/lib/telemetry.ts` — port of web's `lib/telemetry.ts`:
  - `track({ questionId, eventType, answerLengthChars?, dwellMs?, userToken? })`
  - `getSessionId()` — UUID v4 in `AsyncStorage`
  - `flushTelemetry()`
  - Internal: queue, auto-flush timer, drain on `AppState background`
- `src/lib/uuid.ts` — `react-native-get-random-values` + `uuid`

**Files to modify**
- Question detail / session screen: fire `shown` on mount
- Next/Skip buttons (without share): fire `skipped`
- KwentoForm on submit success: fire `answered` with `answer_length_chars` + `dwell_ms`
- Share button(s): fire `shared`
- RevealAnswer emoji tap: fire `reacted`

**State**
- Module-level singleton — no React state

**Deps**
- `@react-native-async-storage/async-storage`
- `react-native-get-random-values` + `uuid`

**Edge cases**
- No `sendBeacon` on RN → drain on `AppState change → background` via plain `fetch` with short timeout
- Offline: cap queue at 100; drop oldest. Don't persist to storage.
- StrictMode-equivalent double-fire on `shown` → ref-guard (`shownFiredRef.current`)
- `dwell_ms`: pause clock on `AppState background`, resume on `active` (slight divergence from web — intentional)
- Privacy: mention telemetry in app's privacy disclosure for Play Store review

---

# C. Shared Logic Mapping

### Can be reused conceptually (port the logic, not the framework wrapping)

| Logic | Web file | What to port |
|---|---|---|
| Quality-nudge regex rules | `components/AddQuestionModal.tsx > qualityNudge()` | Pure function; lift verbatim |
| Placeholder example pool | `components/AddQuestionModal.tsx > PLACEHOLDER_EXAMPLES + pickPlaceholder` | Constants + 3-line helper; verbatim |
| Telemetry session-id generation | `lib/telemetry.ts > makeSessionId` | UUID v4 logic; swap `crypto.randomUUID` for RN polyfill |
| Telemetry queue + flush timer | `lib/telemetry.ts` | JS-runtime-neutral; only drain trigger differs |
| UTM tagging helper | `components/share/KwentoExportPanel.tsx > withUtm` | Pure function; verbatim |
| Vibe sublabels | `VIBE_HINTS` constant | Already in `docs/microcopy.ts > contribute.vibeHints` |
| Empty-state copy | `NoKwentoNote` in reveal page | Already in `docs/microcopy.ts > reveal.notFoundCopy` |
| Reveal animation curve | `RevealAnswer > deepReveal` keyframe | Translate `cubic-bezier(0.34,1.4,0.64,1)` to Reanimated spring with `dampingRatio≈0.55, stiffness≈170` |

### Must be reimplemented (web idioms don't translate)

| Web behavior | Why | Native equivalent |
|---|---|---|
| `next/font` CSS-variable injection | Web-only | TTFs in `assets/fonts/` |
| `localStorage` for session_id | Doesn't exist on RN | `AsyncStorage` |
| `navigator.sendBeacon` drain | Doesn't exist on RN | `AppState change` listener |
| `html-to-image` PNG export | Browser DOM-to-canvas | `react-native-view-shot` |
| `useSearchParams()` | React Router | RN route params |
| `revalidatePath()` | Next.js server | N/A — re-fetch on nav |
| `crypto.randomUUID()` | Not in Hermes | `react-native-get-random-values` + `uuid` |
| Web Share API | Inconsistent on Android Chrome | `react-native-share` |

---

# D. Execution Order (CRITICAL — safe rollout)

Execute in this order. Each stage is independently testable + reversible. Do not skip ahead.

| Stage | What | Why first/next |
|---|---|---|
| 0 | Pre-flight: substrate sync + baseline regression list | Establish what works today |
| 1 | Font System Parity | Touches every screen but breaks nothing if added inertly |
| 2 | Telemetry foundation | Cheaper to wire upfront than retrofit into new screens |
| 3 | Contribute a Question | Purely additive — breaks nothing if it fails |
| 4 | Scan to Play | Camera permission is the riskiest UX gate; isolate it |
| 5 | Scan to Reveal | Depends on Stages 2 + 4 |
| 6 | Cleanup + parity audit | Drift report; document intentional divergences |

---

# E. Risk Analysis

### UI inconsistencies

| Risk | Mitigation |
|---|---|
| Spacing drift (web px vs RN dp) | Use the `spacing` scale from substrate exclusively; never type raw numbers |
| Border radius mismatch | Pull `radii` from substrate; never hardcode |
| Shadow rendering differs (Android elevation vs web box-shadow) | Accept; document. Card=4dp, button=8dp, sheet=12dp |
| Color drift if hex codes retyped | Generate `src/theme/colors.ts` from substrate via a small Node script; reject hex strings in review |
| Kalam font weird on certain OEMs | Test on Pixel + Samsung One UI + MIUI; fall back to system cursive on load failure |

### Scan / camera limitations on Android

| Risk | Mitigation |
|---|---|
| Permission permanently denied | Detect `RESULTS.BLOCKED`; show settings deep-link |
| Vision Camera v3 incompatibility on Android 10 | Check min SDK; expo-camera fallback for older |
| Scan range short in low light | Surface torch toggle; default autofocus + macro |
| Multiple QRs in frame | First detected wins; 2s debounce |
| Vercel preview URLs scanned | Accept `(www\.)?kwentuhan\.cards` AND `startup-t-kwentuhan.*\.vercel\.app` |
| Legacy `/reveal/{shareId}` URL | Parser must support both URL shapes; both resolve server-side |
| OEM camera intent races | Use Vision Camera in-app preview, not system intent |

### Font rendering differences

| Risk | Mitigation |
|---|---|
| `fontWeight: 'bold'` ignored | Always reference filename (`PlayfairDisplay-Black`), never weight prop alone |
| Letter-spacing weird at small sizes | Test `caption` style (10–11px) on low-DPI Android |
| Playfair italics not loaded | Include `PlayfairDisplay-Italic.ttf` if you use italics anywhere |
| Kalam baseline shift on Android | Apply explicit `lineHeight ~ 1.5 * fontSize` |
| Emoji rendering differs by OEM | Test the 5 reaction emojis on Samsung + Pixel; accept divergence |

### Analytics duplication / missing events

| Risk | Mitigation |
|---|---|
| Same user double-counts web + native | Different devices = different session_ids; analyst queries handle it; document in METRICS.sql |
| `shown` fires twice on re-render | Ref-guard like web: `shownFiredRef.current` |
| `answer_length_chars` missing on slow submits | Capture before the network call, not after |
| `dwell_ms` inflated by backgrounding | Pause clock on `background`, resume on `active` |
| Telemetry fails silently → no one notices stale data | Server alert: 0 events in 60min during waking hours → page on-call (out of scope for this port; flag) |
| `shared` event doesn't capture which platform on native share sheet | Pick one: fire once on sheet-open OR use `react-native-share.shareSingle()` for the 3 platforms with UTM mediums. Don't half-implement both. |

---

# Stage Prompts (copy-pasteable for Claude Code in the native repo)

Each prompt is self-contained. Attach the 4 substrate files (`design-tokens.json`, `microcopy.ts`, `api-contract.md`, `flows.md`) as context to every one.

---

## 📋 Stage 0 prompt — Pre-flight

```
You are working in the kwentuhan React Native (Android) repository.

I'm attaching 4 substrate files from the web repo:
- design-tokens.json
- microcopy.ts
- api-contract.md
- flows.md

Plus the porting blueprint: native-port-blueprint.md.

Your job for Stage 0 (pre-flight) is read-only:

1. Confirm the native app currently builds + runs on an Android emulator
   (just verify the command + a smoke screenshot if you have screen access;
   if you can't run it, list what command the user would run).
2. Audit every screen and feature that currently exists in the native app.
3. For each web system from the blueprint (B1-B5), report:
   - Does an equivalent already exist in the native app?
   - If yes — what's drifted from the web behavior?
   - If no — confirm Stage N will be greenfield work.
4. Produce a "regression baseline" — a short checklist of what works today,
   so we can verify nothing breaks across Stages 1-5.

DO NOT IMPLEMENT ANYTHING IN THIS STAGE. Output: an audit report only.

Once I've reviewed the audit, I'll issue the Stage 1 prompt.
```

---

## 🔤 Stage 1 prompt — Font System Parity

```
Execute Stage 1 of the Kwentuhan native-port blueprint: Font System Parity.

References (attached):
- design-tokens.json (typography.fonts + typography.scale)
- microcopy.ts (no microcopy changes in this stage)
- native-port-blueprint.md (Section B1)

Scope:
1. Add 8 TTF files to android/app/src/main/assets/fonts/:
   - PlayfairDisplay-Bold.ttf, -Black.ttf, -Italic.ttf
   - DMSans-Regular.ttf, -Medium.ttf, -SemiBold.ttf, -Bold.ttf
   - Kalam-Regular.ttf
   (User will source these from Google Fonts if not in the repo.)
2. Register assets in react-native.config.js.
3. Create src/theme/fonts.ts — semantic font-family mapping.
4. Create src/theme/typography.ts — the 9-step scale from
   design-tokens.json.typography.scale (wordmark / h1 / h2 / questionHook /
   body / answer / small / caption / micro).
5. Create one debug screen (src/screens/_dev/FontPreviewScreen.tsx) that
   renders all 9 type styles using all 3 font families. Hide behind a
   __DEV__ check or feature flag.

CRITICAL constraints:
- Android references fonts by FILENAME, not weight prop. Never use
  fontWeight: 'bold' on a Regular variant.
- Do NOT modify any existing app screens yet. Just add fonts + theme +
  debug screen.
- Rebuild required: `npx react-native run-android` after asset add.

Acceptance check:
- App boots without errors.
- FontPreviewScreen renders all 3 families correctly on the Android
  emulator.
- All 9 type styles look distinct.
- Existing screens are visually unchanged (no accidental refactor).

Report back with:
- File list created
- Any rendering issues observed
- Whether all 3 fonts load successfully
```

---

## 📊 Stage 2 prompt — Telemetry Foundation

```
Execute Stage 2 of the Kwentuhan native-port blueprint: Impact Metrics
foundation.

References:
- api-contract.md (POST /api/session-event endpoint shape + event taxonomy)
- native-port-blueprint.md (Section B5 + E "Analytics" risks)

Scope:
1. Install deps: @react-native-async-storage/async-storage,
   react-native-get-random-values, uuid.
2. Create src/lib/uuid.ts — RN-safe v4 UUID using the polyfill.
3. Create src/lib/telemetry.ts — port of web's lib/telemetry.ts:
   - track({ questionId, eventType, answerLengthChars?, dwellMs?, userToken? })
   - getSessionId() — UUID v4 cached in AsyncStorage["kw.sessionId"]
   - flushTelemetry()
   - Internal queue (max 100, flush every 2s or at 10 events)
   - Drain on AppState change → 'background' using fetch with keepalive
4. Wire ONLY ONE call site initially: fire `shown` event on the current
   QuestionDetail / Session screen mount. Ref-guard to prevent
   StrictMode-style double-fire.
5. Verify events land in Postgres:
   - Run `node` against the production POSTGRES_URL (user can pull via
     `vercel env pull`) and SELECT * FROM session_events WHERE session_id
     LIKE 'native_%' (or use a probe session_id you can search for).

CRITICAL constraints:
- Silent failure throughout. Every error path inside track / flush / drain
  must be wrapped in try/catch. NEVER let telemetry surface to user UI.
- session_id format: v4 UUID (exactly like web).
- event_type strings: 'shown', 'skipped', 'answered', 'shared', 'reacted'
  (exact lowercase, never plural, never camelCase).

Acceptance check:
- Open the app, navigate to a question 3 times → see 3 rows in
  session_events with the same session_id, all event_type='shown'.
- Force-quit the app mid-session → confirm queued events drained
  (no telemetry-related crash logs).
- session_id persists across cold-starts (same UUID after force-quit
  + relaunch).

After this stage, the other 4 event types (skipped, answered, shared,
reacted) will be wired DURING Stages 3, 4, 5 as those features land.
Don't pre-wire them now.

Report back with:
- The session_id pattern you used during testing
- SQL query you ran to verify rows landed
- Any failure mode observed
```

---

## ✍️ Stage 3 prompt — Contribute a Question

```
Execute Stage 3 of the Kwentuhan native-port blueprint: Contribute a
Question.

References:
- microcopy.ts (contribute.*, followUp.*)
- design-tokens.json (level config, category metadata)
- api-contract.md (POST /api/contribute, POST /api/follow-up)
- flows.md > Flow 6 (Contribute a question)
- native-port-blueprint.md (Section B2)

Scope:
1. Install deps: @gorhom/bottom-sheet (or react-native-modal),
   and a haptics package.
2. Port pure-logic files verbatim:
   - src/lib/qualityNudge.ts (from web's qualityNudge function)
   - src/lib/placeholders.ts (from web's PLACEHOLDER_EXAMPLES + pickPlaceholder)
3. Build form components:
   - src/components/forms/VibePillRow.tsx (3 pills with sublabels from
     microcopy.contribute.vibeHints)
   - src/components/forms/CategoryDropdown.tsx (filters by mode)
   - src/components/forms/HandleInput.tsx (@-prefixed)
4. Build the screen:
   - src/screens/ContributeQuestionScreen.tsx (form + Publish)
   - src/screens/ContributePublishedScreen.tsx (success state — same
     route, swap content)
5. Add stack route + reach it from existing Session screen "Add" button.
6. Build the AI follow-up card:
   - src/components/cards/FollowUpQuestionCard.tsx
   - 8-second AbortController timeout — hide silently on 503 or timeout
   - Retry chip on other 5xx errors
7. Wire telemetry: no new event type fires from contribute itself
   (it's a contribute, not a session event).

CRITICAL constraints:
- Microcopy: every string from microcopy.ts.contribute.* exactly. Don't
  paraphrase the Taglish.
- Validation: hook 8–220 chars, deepDive 0–220, username 0–24.
- Quality nudge is NON-BLOCKING — Publish must still work when a nudge
  is showing.
- Char counter visible only past 60% used (matches web).
- KeyboardAvoidingView so Publish stays above keyboard.

Acceptance check:
- Submit a real question from the emulator → it appears in
  contributed_questions in Postgres within 2 seconds.
- View button navigates to QuestionDetail with the new id.
- Answer button navigates to QuestionDetail with focusAnswer=true (textarea
  auto-focused, scrolled into view).
- Done button closes back to Session screen.
- Type "Do you ever..." in the question field → yes/no nudge appears below.
- Type "ano paboritong food mo? saan?" → multi-question nudge appears.
- Follow-up card: with no AI_GATEWAY_API_KEY set, card hides silently
  after 8s. With key set, generates a follow-up question.

Report back with:
- Files created
- Any Material vs iOS-feeling drift
- Any microcopy you weren't sure about and inferred (so we can correct)
```

---

## 📷 Stage 4 prompt — Scan to Play

```
Execute Stage 4 of the Kwentuhan native-port blueprint: Scan to Play.

References:
- microcopy.ts (no new strings; reuse what's there)
- api-contract.md (reveal URL shapes section)
- flows.md (Flow 2 + Flow 5)
- native-port-blueprint.md (Section B3 + E "Scan/camera" risks)

Scope:
1. Install deps: react-native-vision-camera + vision-camera-code-scanner
   (or expo-camera if Expo).
   Also: react-native-permissions if bare RN.
2. Add CAMERA permission to AndroidManifest.xml.
3. Build src/screens/ScanScreen.tsx — camera + QR overlay + torch toggle.
4. Build src/hooks/useCameraPermission.ts — request + persist state +
   handle BLOCKED with settings deep-link.
5. Build src/lib/parseKwentuhanUrl.ts:
   - Accept: kwentuhan.cards, www.kwentuhan.cards,
     startup-t-kwentuhan.*.vercel.app (preview URLs)
   - Extract {questionId, kwentoId?} from /q/{id} or /q/{id}/k/{kid}
     or /reveal/{kid}
   - Strip all utm_* params before navigation
   - Reject everything else
6. Update root navigator:
   - Add Scan route
   - Add fan-out: scan success → push QuestionDetail (play) OR
     RevealScreen (reveal). Pop the scan screen (don't keep in back stack).
7. Feature-flag the Scan tab in user-facing nav until full pipeline
   is verified.

CRITICAL constraints:
- Permission denied → friendly retry sheet, never dead-end.
- Non-kwentuhan URL → soft "That's not a kwentuhan code" + reset scan;
  do NOT crash; do NOT open the URL.
- Front camera disabled.
- 2-second debounce per scan session.
- Background → reset state, no stale scan fires.

Acceptance check:
- Print a kwentuhan.cards QR code (or show on another device).
- Scan from emulator (use Android camera2 simulator) →
  QuestionDetail loads.
- Scan a reveal URL → RevealScreen loads (will be built in Stage 5;
  for now navigate to a stub or NotFound).
- Scan a google.com QR → soft error, no crash, no nav.
- Permission denied → settings deep-link works.

Report back with:
- Files created
- Permission UX flow you implemented
- Any device-specific scan issues observed
```

---

## ✨ Stage 5 prompt — Scan to Reveal

```
Execute Stage 5 of the Kwentuhan native-port blueprint: Scan to Reveal.

References:
- microcopy.ts (reveal.*, kwentoForm.*, exportPanel.*)
- design-tokens.json (reactions.order — STRICT)
- api-contract.md (GET /api/kwento/{id}, POST /api/kwento)
- flows.md > Flow 5 (Scan-to-Reveal) — read entirely before starting
- native-port-blueprint.md (Section B4)

Scope:
1. Install deps: react-native-reanimated v3, react-native-share.
2. Build src/lib/kwentoApi.ts — GET + POST wrappers.
3. Build src/components/RevealAnswer.tsx:
   - Kalam-styled answer text with 0.55s spring-overshoot entrance
   - "— someone, anonymously" byline (italic Playfair)
   - 5-emoji reaction row in EXACT order: 🤣 😱 💀 ❤️ 🔥
   - Tapped emoji: filled bg + outline, others desaturate to ~55%
   - Floating-burst animation on tap (Reanimated UI thread)
   - Haptic feedback on tap
   - Fire `reacted` telemetry on each tap
4. Build src/components/KwentoForm.tsx:
   - "Sagutin mo rin" heading + subhead "Pass it on. Walang nakakaalam,
     walang husga."
   - 3-row textarea, Kalam font, 500-char limit
   - Char counter only past 60% used
   - Primary CTA: "✨ Share your kwento"
   - On submit: POST /api/kwento → fire `answered` event with
     answer_length_chars + dwell_ms
5. Build src/components/EmptyStateNotice.tsx:
   - microcopy.reveal.notFoundCopy ("💭 We couldn't load this particular
     kwento…")
6. Build src/screens/RevealScreen.tsx:
   - Header (wordmark + level chip)
   - Question card
   - RevealAnswer OR EmptyStateNotice
   - KwentoForm
   - Tiny share row at bottom: WhatsApp / Messenger / X icon-only buttons
     - Each tap → react-native-share or Linking.openURL → fire `shared`
   - Fire `shown` on mount (ref-guarded)

CRITICAL constraints:
- Reaction emoji order is canonical: 🤣 😱 💀 ❤️ 🔥. Don't reorder.
- After successful answer submission, swap to the unified
  post-publish state (same component as Contribute's success — extract
  to src/screens/_shared/PublishedSuccessScreen.tsx).
- 404 from /api/kwento/{id} → render EmptyStateNotice, do not show
  reveal card at all. Form still rendered below.
- Slow network → skeleton Kalam-sized gray bars.
- Multiple bursts can coexist; each independent.

Acceptance check:
- Scan a real reveal URL → kwento appears with the spring animation.
- Tap each of the 5 emojis → see floating burst + haptic. Verify rows
  land in session_events with event_type='reacted'.
- Submit an answer → /api/kwento returns 200 with revealUrl, success
  state appears. Event 'answered' lands with non-null dwell_ms +
  answer_length_chars.
- Tap WhatsApp/Messenger/X → native share sheet OR direct deep link
  opens. Event 'shared' lands.
- Scan a 404 kwento ID → EmptyStateNotice renders, no crash.

Report back with:
- Files created
- Animation timing observations (does the spring feel right on Android?)
- Any divergences from web flow you had to make
```

---

## 🧹 Stage 6 prompt — Cleanup + parity audit

```
Execute Stage 6 of the Kwentuhan native-port blueprint: Cleanup + parity
audit.

References:
- All substrate files
- native-port-blueprint.md (full document)

Scope:
1. Run a drift report comparing the native app to the web spec:
   - Sweep all RN files for inline strings that should come from
     microcopy.ts. List every mismatch (file:line on each side).
   - Sweep for hardcoded colors / spacings / font names that should come
     from design-tokens.json.
   - Verify every API call hits the documented shape in api-contract.md.
2. Run a telemetry verification SQL query:
   SELECT event_type, COUNT(*) FROM session_events
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY event_type;
   Expect ALL 5 event types to appear with non-zero counts after a few
   minutes of native-app usage.
3. Document intentional divergences in
   docs/NATIVE_DIVERGENCES.md:
   - Native-only: camera scan, haptics, native share sheet, app lifecycle
     telemetry drain, AsyncStorage instead of localStorage
   - Web-only: desktop layout, html-to-image export, URL-based navigation
4. Remove feature flag on the Scan tab now that Stages 1-5 are verified.

CRITICAL constraints:
- Do not fix drift items found in step 1 unilaterally — list them, then
  ask user which to address. Some drift is intentional.
- Document, don't delete.

Acceptance check:
- Drift report has zero P0 items (microcopy + token violations).
- All 5 event types present in session_events.
- NATIVE_DIVERGENCES.md exists + lists every conscious deviation.
- Scan tab is live in production navigation.

Report back with:
- The drift report
- The telemetry verification result
- The NATIVE_DIVERGENCES.md content
```

---

## After all 6 stages

Run **Prompt #3** from the earlier parity discussion (monthly drift report) on a recurring cadence:

```
Run a drift report between the web (docs/ folder in the web repo) and
this native app. Focus on microcopy and API contract — those break brand
voice and data sync respectively. List every mismatch with file:line on
each side.
```

This is your long-term parity insurance.

---

## Quick reference: substrate file locations

If working from the web repo:
- `docs/design-tokens.json`
- `docs/microcopy.ts`
- `docs/api-contract.md`
- `docs/flows.md`
- `docs/METRICS.sql`
- `docs/native-port-blueprint.md` (this file)
- `docs/README.md` (substrate overview)

Sync these into the native repo via git submodule or a sync script. They are the contract.
