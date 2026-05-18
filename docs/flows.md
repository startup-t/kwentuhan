# Kwentuhan User Flows

This file is the **flow spec** — every screen sequence, every state transition,
every trigger. Web implements it one way (Next.js routes + React state).
Native should implement the same logic with native idioms (Compose nav,
native sheets, native haptics).

If a behavior differs across platforms intentionally, it's documented inline.
If it differs unintentionally, fix the platform that's wrong.

---

## Flow index

1. [Cold open → first session](#1-cold-open--first-session)
2. [Solo play](#2-solo-play)
3. [Group play](#3-group-play)
4. [Share-as-User-1 (creator)](#4-share-as-user-1-creator)
5. [Scan-to-Reveal (User 2)](#5-scan-to-reveal-user-2)
6. [Contribute a question](#6-contribute-a-question)
7. [Reveal with no kwento (empty state)](#7-reveal-with-no-kwento-empty-state)
8. [Telemetry coverage](#8-telemetry-coverage)

---

## 1. Cold open → first session

**Entry:** App launch (native) or `https://kwentuhan.cards` (web).

**Sequence:**

1. **Landing screen** renders with:
   - Wordmark + tagline
   - Play Mode toggle (Group | Solo) — defaults to Group
   - Category chip row — defaults to Random (🎲)
   - Live deck count: `"{n} questions in deck"` (updates as mode/category change)
   - Mode info card: title + description
   - Desktop only: a live question preview card on the right
   - Primary CTA: `Start a Conversation`
2. **User taps a category chip** (optional) → deck count updates → preview question rotates.
3. **User taps the primary CTA** → transitions to Session screen.

**Data:**
- `GET /api/questions?mode={mode}&category={category}` fetches the merged
  deck. Cached client-side for 30s; deduped per (mode, category, level) key.
- Deck count = pool length.

**Native notes:**
- Bottom-anchored CTA is fine; the web version uses sticky desktop placement.
- Chip row should be horizontally scrollable on phone, multi-row on tablet.

**Microcopy:** `microcopy.landing.*`

---

## 2. Solo play

**Entry:** User selects Solo Mode + (optionally) a category, then taps `Start a Conversation`.

**Sequence:**

1. **Session screen mounts.** Card 1 of N appears centered.
2. Each card shows:
   - Level chip (Chill / Deep / Wild)
   - Category chip
   - Question hook (Playfair 700)
   - "Tap for deep dive" affordance (revealing the `deepDive` field)
   - "Question by @handle" line — only if community-contributed
3. Bottom action row: `← Back` · `Skip` · `Share` · `Next →`
4. **Skip / Next** advances to the next card.
5. **Back** returns to the previous card.
6. **Share** opens the Share Modal (flow #4).
7. **End of deck** → finished screen with:
   - 🎉 emoji
   - "All Done!"
   - "{total} questions played."
   - CTA: `🔄 Play Again` (returns to landing with same mode/category)

**Telemetry per card:**
- Fire `shown` once when the card becomes current.
- Fire `skipped` when user taps Next/Skip WITHOUT having opened the Share Modal first.

**Microcopy:** `microcopy.session.*`

---

## 3. Group play

Identical to solo play except:
- Mode toggle = Group on landing
- Categories shown = group set (Barkada, Besties, Pamilya, Couple, Dating,
  Trabaho, Negosyo, Startup, Party)
- The `🎉 Party` category is **age-gated** (`ageGated: true`) — native should
  show a one-shot 18+ confirmation before allowing access.
- Solo-mode "personal" filtering (`isPersonal=true`) does NOT apply.

---

## 4. Share-as-User-1 (creator)

**Entry:** User taps the Share button during a session (flow #2 or #3).

**Sequence:**

1. **Share Modal opens** as a bottom sheet (mobile) / centered modal (desktop).
2. **Stage A — Input:**
   - Header: `Your kwento` + Close (×)
   - Question card (same level/category/hook layout as session screen)
   - Single auto-expanding textarea with placeholder `Kwento mo naman…`
   - 600-char hard cap with soft glow at 280, hint at 400
   - Primary CTA: `Preview` (disabled until non-empty)
3. **User taps Preview** → transitions to Stage B.
4. **Stage B — Preview/Export:**
   - Header: `Preview` + Close (×)
   - Scaled live `StoryCard` (270×480 preview of the 1080×1920 export)
   - Style chips: Chat | Quote | Note (persists last choice via localStorage)
   - Teaser toggle (defaults to **OFF** — download-ready mode)
   - When teaser=ON: a reveal-URL strip shows `Reveal link: https://kwentuhan.cards/reveal/k_…`
     - Minted via `POST /api/teaser` on toggle
     - Loading state: `Generating reveal link…`
     - Error state: `Couldn't generate reveal link.` + Retry
   - Primary CTA: `Download card` (saves a 1080×1920 PNG)
     - States: enabled / `Saving…` / hidden hint `Card saved!` for 2.2s
     - Disabled if answer empty, or if teaser ON but URL not yet minted
   - Social share row: Facebook · Instagram (clipboard) · Messenger
     - Every outbound URL is UTM-tagged: `?utm_source=kwentuhan&utm_medium={medium}&utm_campaign=share`
5. **User taps Close** → modal dismisses, returns to session.

**Telemetry:**
- Fire `shared` on each of: PNG download success, Facebook click, Messenger click,
  Instagram clipboard write.

**Microcopy:** `microcopy.shareModal.*` + `microcopy.exportPanel.*`

**Native notes:**
- Use the platform's native sheet (Compose `ModalBottomSheet` / SwiftUI `.sheet`).
- Render the StoryCard via native canvas / drawing API. Output PNG dimensions
  MUST be exactly 1080×1920 — these get cross-shared with web users.
- Native share row should use the platform share sheet directly (`Intent.ACTION_SEND` / `UIActivityViewController`), but still UTM-tag the URL placed into it.

---

## 5. Scan-to-Reveal (User 2)

**Entry:** User scans a Kwentuhan QR code (or opens a shared `/q/{id}/k/{kid}`
URL) on their phone.

**Sequence (single-screen, no nav between beats):**

1. **Reveal page mounts** at `/q/{questionId}/k/{kwentoId}`. The page resolves
   the kwento via `GET /api/kwento/{kwentoId}`. If missing → flow #7.
2. **Header:** Wordmark `kwentuhan` + level chip.
3. **Question card** with:
   - Category emoji + label uppercase
   - Question hook (Playfair 700)
   - "Question by @handle" line — only if community-contributed
4. **Reveal card** (`✨ a kwento for you`):
   - Handwritten answer text (Kalam font) appears via 0.55s spring-overshoot animation on mount
   - "— someone, anonymously" byline (italic Playfair)
   - **5-emoji reaction row:** `🤣 😱 💀 ❤️ 🔥`
     - Tapped emoji selects (filled bg + outline)
     - Other emojis desaturate to ~55% opacity
     - The tapped emoji spawns a floating burst that drifts up + fades out (~1s)
     - Telemetry: `reacted` per tap (multiple taps fire multiple events)
   - Native: use platform haptics (`UIImpactFeedbackGenerator.light` / Compose `LocalHapticFeedback`)
5. **Your turn form** (`Sagutin mo rin ✍️`):
   - Subhead: `Pass it on. Walang nakakaalam, walang husga.`
   - 3-row textarea, 500-char limit, Kalam font
   - Char counter only appears once >60% used
   - Primary CTA: `✨ Share your kwento` (disabled until non-empty)
6. **User taps Share your kwento:**
   - `POST /api/kwento` with `{questionId, questionText, answerText, isTeaser: true}`
   - Loading state: button shows `Sharing…` + spinner
   - Success: form is replaced by the **shared export panel** (flow #4 Stage B)
     - `initialRevealUrl` = the URL just minted
     - `initialTeaser` = **false** (download-ready, not teaser)
     - Adds a footer: `Write another kwento →`
7. **Tiny share row** at bottom of the page: `or pass along → [WA] [Msgr] [X]`
   - Compact circular icon buttons
   - Each tap = `shared` event

**Telemetry:**
- `shown` on RevealAnswer mount (once, StrictMode-safe)
- `reacted` on each emoji tap
- `answered` on form submit success with `answer_length_chars` + `dwell_ms`
- `shared` on PNG download / social share

**Microcopy:** `microcopy.reveal.*` + `microcopy.kwentoForm.*`

**Native notes:**
- The whole flow must fit in one screen with NO horizontal scroll. The form's
  primary CTA should be visible without scrolling on standard mobile heights.
- The reveal animation matters — use a native spring with `dampingRatio≈0.6`,
  not a linear ease.

---

## 6. Contribute a question

**Entry:** User taps the `Add` button (aria: `Contribute a question`) from
within the Session screen.

**Sequence:**

1. **Add Question Modal opens** as a sheet.
2. **Stage A — Form:**
   - Header: `Contribute a Question` + Close (×)
   - Intro: `Your question goes live instantly and joins the deck for everyone.`
   - **Mode** toggle: Solo | Group (pills)
   - **Category** dropdown — filters by selected mode
   - **Vibe** pills: 🌤 Chill (every day) | 🌙 Deep (real talk) | 🔥 Wild (edge it up)
   - **The question** textarea — 8..220 chars
     - Rotating placeholder example per mode (random pick per mount)
     - Quality nudges appear below when:
       - hook starts with yes/no triggers → `nudgeYesNo`
       - hook has 2+ `?` → `nudgeMultiQuestion`
       - hook starts with abstract-philosophy pattern → `nudgeVague`
   - **Follow-up (optional)** textarea — 0..220 chars
   - **Your handle (optional)** — `@`-prefixed input, 0..24 chars
   - Primary CTA: `Publish question` (disabled while < 8 chars)
   - Fine print: `Goes live immediately. Be kind, be curious, be real.`
3. **User taps Publish:**
   - `POST /api/contribute` with the form payload
   - Loading state: `Publishing…` + spinner
   - On 4xx error → red error chip surfaces above CTA
   - On success → transition to Stage B
4. **Stage B — Live confirmation:**
   - 🎉 emoji + `Live na ang kwento mo!` heading
   - Context line: `Anyone playing {Solo|Group} → {category} can see it next.`
   - **Mini question card** showing the just-published question (with level + category chips)
   - **Deep Dive panel** (threaded card with `↳ DEEP DIVE` eyebrow):
     - On mount → fires `POST /api/follow-up` to generate an AI follow-up
     - Loading: shimmer bars
     - Ready: the generated follow-up question (Playfair italic)
     - On 503 (key not configured) or 8s timeout → hide the panel entirely
     - On any 5xx error → small chip `Couldn't draft a follow-up.` + Retry
   - **Action buttons** side-by-side:
     - `👁️ View` → navigates to `/q/{id}`
     - `✍️ Answer` → navigates to `/q/{id}?answer=1` (auto-focuses textarea)
     - Both share a single double-click guard
   - **Done** button (tertiary text link) → closes modal

**Telemetry:**
- No specific event for contribution itself (it's a contribute, not a session event).
- Once the question is in the deck, subsequent `shown`/`answered`/etc. accrue
  against it via `session_events.question_id`.

**Microcopy:** `microcopy.contribute.*` + `microcopy.followUp.*`

---

## 7. Reveal with no kwento (empty state)

**Entry:** User opens a `/q/{id}/k/{kid}` URL where the `kwentoId` doesn't
resolve (stale link, deleted row, malformed).

**Behavior:**
1. The question card still renders (using static or community question data
   resolved by `questionId`).
2. In place of the reveal card, render a soft inline note:
   - `💭 We couldn't load this particular kwento — but the question above
     is still wide open. Be the storyteller this time.`
3. The form below stays the same (with different heading/subheading copy —
   `Your turn` instead of `Sagutin mo rin`).
4. The bottom social share row is **hidden** in this branch.

**Reasoning:** Don't punish the user for someone else's broken link. Convert
the dead-end into a fresh contribution prompt.

**Microcopy:** `microcopy.reveal.notFoundCopy`

---

## 8. Telemetry coverage

Every interaction the question-quality graph needs is captured. The table:

| Event | Fire at | Payload extras |
|---|---|---|
| `shown` | Session card becomes current; Reveal card mounts | – |
| `skipped` | Session Next/Skip tapped WITHOUT opening share | – |
| `answered` | KwentoForm submit success | `answer_length_chars`, `dwell_ms` |
| `shared` | PNG download succeeds; Facebook click; Messenger click; Instagram clipboard write | – |
| `reacted` | Reveal emoji tap | – |

Implementation:
- Client buffer: in-memory queue, auto-flushes every 2s or at 10 events
- Drain on page-hide / app-backgrounded via `sendBeacon`
- Silent failure throughout — telemetry MUST NOT break UX
- `session_id` is per-device, persists forever in storage (`kw.sessionId`)

Native implementation should mirror this exactly — see `lib/telemetry.ts`
for the canonical behavior.

---

## Cross-platform parity rules

1. **Microcopy is sacrosanct.** Never translate or rewrite. The Taglish
   IS the brand voice.
2. **Levels and categories use the same string keys** as in
   `design-tokens.json` and the API responses. Don't localize the keys.
3. **PNG export is 1080×1920 exactly.** A web user and a native user
   sharing the same kwento should produce visually-identical cards.
4. **Reveal URLs use the canonical `/q/{id}/k/{kid}` form** on outbound
   shares. Always UTM-tag.
5. **session_id format:** v4 UUID (`crypto.randomUUID()` equivalent).
6. **`event_type` strings are exact:** `shown`, `skipped`, `answered`, `shared`, `reacted`. Never plural, never camelCase.

---

## Native-only behaviors (acceptable divergence)

These exist on native but not on web — and that's correct:

- **QR code scanner**, via camera. Web depends on the OS camera app
  recognizing a kwentuhan.cards URL.
- **Push notifications** for "your kwento got a 💀 reaction" (post-MVP).
- **Native haptic feedback** on primary actions and emoji reactions.
- **Native share sheet** instead of three discrete social buttons.
- **Deep-linked open via Universal Links / App Links** (`kwentuhan.cards`
  domain handles both web and native opens).
- **Offline mode** for the bundled static deck — web requires connectivity
  for community questions; native can play offline against the bundled set.

---

## Web-only behaviors (acceptable divergence)

- **Multi-column desktop layout** on landing (sidebar + preview).
- **`html-to-image`-based PNG export** (native uses canvas/Compose draw).
- **URL bar / share via clipboard** as the primary scan-target replacement.
