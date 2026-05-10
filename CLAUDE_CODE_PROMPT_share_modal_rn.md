# Claude Code Prompt — Port Kwentuhan Share Modal to React Native

> Paste this entire file into Claude Code while it's open in your **React Native app's repo**. Have your `kwentuhan-web` checkout available too (or copy the referenced source files into a `reference/` folder of the RN repo) — Claude will need to read the originals to port them faithfully.

---

## 0. Goal

Reproduce the **Share Modal** from `kwentuhan-web` in our React Native app, 1:1 in terms of UX, layout, copy, animations, and visual styling. The modal is a bottom-sheet flow with two screens — an **input** screen (user writes their answer over a brand card) and a **preview** screen (live, scaled-down preview of a 1080×1920 story card with style chips, teaser-blur toggle, save-as-image, and social share buttons). Save `.png` to camera roll and offer native share.

The web source lives at:

```
kwentuhan-web/components/ShareModal.tsx
kwentuhan-web/components/share/ShareInput.tsx
kwentuhan-web/components/share/AnswerInput.tsx
kwentuhan-web/components/share/SharePreview.tsx
kwentuhan-web/components/share/StoryCard.tsx
kwentuhan-web/components/share/AnswerBlock.tsx
kwentuhan-web/components/share/StyleChips.tsx
kwentuhan-web/components/share/TeaserToggle.tsx
kwentuhan-web/components/share/SmartDefaultToast.tsx
kwentuhan-web/lib/types.ts                       # LEVEL_CONFIG, CLUSTER_COLOR, Question
kwentuhan-web/lib/shareAnswer/types.ts           # AnswerStyle, ANSWER_STYLES, STYLE_LABEL
kwentuhan-web/lib/shareAnswer/persist.ts         # last-style persistence
kwentuhan-web/lib/shareAnswer/autoStack.ts       # chat bubble splitter
kwentuhan-web/lib/shareAnswer/reveal.ts          # teaser /api/teaser → reveal URL
kwentuhan-web/lib/shareCard.ts                   # html-to-image PNG export
kwentuhan-web/lib/qr.ts                          # QR data-URL helper
kwentuhan-web/app/globals.css                    # design tokens (--kw-*)
```

**Read each of these in full before writing any code.** The token values, font sizes, and pixel offsets matter — match them exactly.

---

## 1. Tech choices for RN port

Use these libraries (install if not already present):

| Concern | Library |
|---|---|
| Bottom sheet / overlay | `@gorhom/bottom-sheet` (preferred) or a custom `Modal` + `Animated.View` slide-up |
| Style chips, toggle | Pure RN (Pressable + Animated.View) |
| QR code | `react-native-qrcode-svg` |
| Capture card → PNG | `react-native-view-shot` |
| Save PNG to camera roll | `@react-native-camera-roll/camera-roll` (iOS/Android) — request permission first |
| Native share sheet | `expo-sharing` (Expo) or `Share` from `react-native` (bare RN) |
| Persist last style | `@react-native-async-storage/async-storage` |
| Linear gradient | `react-native-linear-gradient` (bare) or `expo-linear-gradient` (Expo) |
| Blur (teaser) | `@react-native-community/blur` (bare) or `expo-blur` (Expo) — wrap a snapshot of the answer block, OR apply a heavy `opacity` + `translucent overlay` fallback |
| SVG icons (FB/IG/Messenger) | `react-native-svg` |
| Fonts | `expo-font` (Expo) or `react-native.config.js` link — load **Playfair Display**, **DM Sans**, **Kalam** |

If our repo already uses Expo, prefer the Expo-native variants. Detect this from `package.json` and pick the matching libraries.

---

## 2. Architecture — file layout in the RN repo

Create:

```
src/components/share/
  ShareModal.tsx           # top-level bottom-sheet container, mode switcher
  ShareInput.tsx           # mode === "input"
  AnswerInput.tsx          # the chat-bubble TextInput with auto-grow
  SharePreview.tsx         # mode === "preview"
  StoryCard.tsx            # the 1080×1920 export source
  AnswerBlock.tsx          # Chat / Quote / Note variants
  StyleChips.tsx           # 3 segmented chips
  TeaserToggle.tsx         # row + animated switch
  SmartDefaultToast.tsx    # one-shot length suggestion toast

src/lib/share/
  types.ts                 # AnswerStyle, ANSWER_STYLES, STYLE_LABEL
  autoStack.ts             # autoStackChat() — port verbatim
  persist.ts               # getLastStyle / setLastStyle via AsyncStorage
  reveal.ts                # createAnswerRevealUrl() — keep API contract
  qr.ts                    # buildQuestionShareUrl() + QR helper
  exportCard.ts            # captureRef → save to camera roll → native share

src/theme/
  tokens.ts                # all --kw-* values mapped to a JS object
  fonts.ts                 # font family constants (Playfair, DMSans, Kalam)
```

If the RN app already has a theme file, **merge** the tokens in rather than duplicating; never hardcode colors that exist as tokens.

---

## 3. Design tokens (port from `globals.css`)

Create `src/theme/tokens.ts`:

```ts
export const tokens = {
  bg:           '#EEEAF6',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F3F0FA',
  border:       'rgba(200,195,230,0.5)',
  borderSolid:  '#DAD4EA',
  accent:       '#6C52E3',
  accentSoft:   '#EDE9FF',
  accentDeep:   '#5B3FD0',
  accent2:      '#7B5EE8',
  text:         '#1A1730',
  subtext:      '#8B87A8',
  muted:        '#B0ABC8',
  label:        '#9B97BB',
  wild:         '#E8527A',
  wildSoft:     '#FFECE8',
  wildText:     '#C94020',
  deep:         '#3B55C4',
  deepSoft:     '#EFF3FF',
  chillSoft:    '#EDE9FF',
  chillText:    '#5B3FD0',
  success:      '#10B981',
  warn:         '#F59E0B',
  chatPeach:    '#FFEFE6',
  noteInk:      '#2A1810',
  rCard:        24,    // 1.5rem
  rBtn:         20,    // 1.25rem
} as const;
```

Also port `LEVEL_CONFIG` and `CLUSTER_COLOR` from `lib/types.ts` verbatim into `src/theme/questionTheme.ts` (or wherever the RN app already keeps Question metadata). Don't reinvent them.

---

## 4. Component-by-component spec

### 4.1 `ShareModal.tsx`

Behavior to match `components/ShareModal.tsx`:

- Two modes: `"input"` and `"preview"`. Starts in `"input"`.
- State held in this component:
  - `answer: string` — user's text
  - `isFocused: boolean` — controls "Add your answer" vs "Your answer" header copy and the brand-row scale animation
  - `style: AnswerStyle` — hydrate from `getLastStyle()` on mount; persist on every change via `setLastStyle()`
  - `teaser: boolean` — does **not** persist; resets each time the modal opens
- `handleDone()` switches to preview only if `answer.trim().length > 0`
- `handleEditAnswer()` switches back to input
- Tapping the backdrop closes; Escape-to-close is a web concept — RN equivalent is the bottom-sheet drag-to-dismiss; let `@gorhom/bottom-sheet` handle that. **Don't** dismiss while the TextInput is focused (web disables Escape while focused; mirror this — if `isFocused`, swallow back-press / drag-down dismissal).
- Render a small drag handle at the top of the sheet (10w × 1h pill, color = `tokens.borderSolid`).

Sheet styling:

- Width: full, capped at 420 on tablets.
- Background: `tokens.surface`.
- Border radius: top-left/top-right `28` (1.75rem); on wide screens (≥640dp) all four corners.
- Animation: slide-up from bottom, ~380ms, cubic-bezier `(0.34, 1.4, 0.64, 1)` — `@gorhom/bottom-sheet` covers this if you set `animationConfigs` to a similar spring.
- Backdrop: `rgba(26,23,48,0.45)` with blur if available (`expo-blur` `intensity={20} tint="dark"` underneath).

Props (match web):

```ts
interface Props {
  question: Question;
  visible:  boolean;     // RN replacement for "rendered or not"
  onClose:  () => void;
  onNext:   () => void;  // reserved, unused in current flow — keep for API parity
}
```

### 4.2 `ShareInput.tsx`

Faithful port of `components/share/ShareInput.tsx`:

- **Header row** (px 24, py 12):
  - Left: bold title — `"Add your answer"` if focused, else `"Your answer"` (font: DM Sans 16/700, color `tokens.text`).
  - Right: primary "Done" button, height 32, padX 16, fontSize 12, borderRadius 12. Calls `answerRef.current?.blur()` then `onDone()`. Use `btn-primary` styling: linear gradient `#7B5EE8 → #5B3FD0`, white text, weight 700, shadow `0 8px 32px rgba(108,92,231,0.45)`.
- **Card preview** (px 24, pb 24): rounded 24, padding 20, paddingBottom 84. Background: linear gradient `#F9F8FF → #FFF4F7` (135deg). Border: 1px `tokens.border`. Shadow: `0 4px 24px rgba(108,92,231,0.10)`.
  - **Brand row** (top): logo (24×24) + word "kwentuhan" (DM Sans 12/700, `tokens.text`). Below the row, when **not** focused, show tagline `"usapang totoo, kasama mo."` (10/normal, `tokens.subtext`). When focused, animate the whole brand block to `scale(0.7)`, transform-origin top-left, transition 220ms ease, and hide the tagline.
  - Right of the brand row: level badge (use `LEVEL_CONFIG[question.level]`) — a pill, 10/700, uppercase 6% letter-spacing, padX 10, padY 4, color/bg/border from the level config.
  - **Category chip** (below brand row, mb 12): small pill, 12/600, padX 8, padY 2, color/bg from `CLUSTER_COLOR[question.cluster]`. Format: `{categoryEmoji} {categoryLabel}`.
  - **Question text**: Playfair Display 16/700, lineHeight 1.4, `tokens.text`, paddingRight 88 to leave room for the badge.
  - **`<AnswerInput />`**: chat bubble pinned to right edge (see below).

### 4.3 `AnswerInput.tsx`

Faithful port of `components/share/AnswerInput.tsx`:

- A right-aligned chat-bubble `TextInput`. Multiline, auto-resizing height. Placeholder: `"Kwento mo naman…"`.
- Bubble: maxWidth 75%, borderRadius 18, padX 16, padY 12, background `tokens.chatPeach`. A small 8×8 square rotated 45° at `bottom: 4, left: -4` acts as the tail (use absolute positioning + rotate, same color as bubble).
- Constants:
  - `SOFT_GLOW_AT = 280` — at this length, add a 1px outer ring `tokens.warn` to the bubble (ringColor / shadow trick).
  - `HINT_AT = 400` — show the hint text below the bubble (right-aligned, 11/normal, `tokens.muted`, copy: `"Mahaba na ah — try Note style on the next screen."`). Animate opacity over 200ms.
  - `HARD_CAP = 600` — slice text on change.
- Text style: DM Sans, 13.6px (`0.85rem`), 500, color `tokens.noteInk`.
- Expose imperative `blur()` and `focus()` via `forwardRef` + `useImperativeHandle`.
- Auto-grow: in RN, set `multiline` and use `onContentSizeChange` to drive height in state.

### 4.4 `SharePreview.tsx`

Faithful port of `components/share/SharePreview.tsx`:

- **Constants**: `PREVIEW_W = 270`, `SCALE = PREVIEW_W / 1080`, `PREVIEW_H = 1920 * SCALE`. The story card always renders at full 1080×1920 dimensions, then a parent `View` with `transform: [{ scale: SCALE }]` and `transformOrigin: 'top left'` (RN: use a wrapper sized `PREVIEW_W × PREVIEW_H` with `overflow: 'hidden'`, child sized `1080 × 1920` and scaled).
- **Header row**: title `"Preview"` (DM Sans 16/700, `tokens.text`); right-side close button — 32×32, rounded 12, btn-secondary, label "✕".
- **Smart-default toast**: see 4.8. Show **once per share session** at first preview entry, only if `suggestionForLength(answer.length)` returns a non-null suggest.
- **Live preview frame**: width 270, height = `1920 * 270/1080 ≈ 480`, borderRadius 16, border `1px tokens.border`, shadow `0 8px 32px rgba(108,92,231,0.14)`, background white, overflow hidden.
- **`<StoryCard />`**: rendered at full size inside the scaled wrapper. Pass `question, answer, style, teaser, qrUrl, qrCacheKey, onEditAnswer`.
- **`<StyleChips />`** below the preview (px 24, pb 16).
- **Divider**: 1px hairline, color `tokens.border`, marginX 24.
- **`<TeaserToggle />`** below the divider (px 24, py 16).
- **Reveal-link card** (only when `teaser && teaserUrl`): rounded 12, border `tokens.border`, padX 12, padY 8, fontSize 12, color `tokens.subtext`. Show `Reveal link: <url>`. In RN, render the URL as a `Pressable` that calls `Linking.openURL`.
- **Save button**: full-width primary button, label states:
  - Default → `"Save"`
  - Saving → `"Saving…"` (disabled)
  - Empty answer → `"Add your answer first"` (disabled, opacity 0.55)
  - Calls `handleSave()` (see 4.10).
- **Save hint line**: 11/normal, color `tokens.muted`, minHeight 14. Shows `"Card saved!"` on success or `"Failed to save image"` on error, with 200ms opacity fade. Auto-clears after 2200ms.
- **Social row**: three `SocialIcon` buttons in a centered row, gap 12. Each = a 44×44 rounded-14 tile with a gradient background and a white SVG glyph, plus an 11/500 label below in `tokens.subtext`.
  - Facebook — bg `#1877F2`, FB "f" glyph (port the SVG path verbatim from web). Action: `Linking.openURL('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://kwentuhan.com'))`.
  - Instagram — gradient `#F58529 → #DD2A7B → #8134AF → #515BD4` (135deg), camera glyph. Action: copy `\`${question.hook}\\n\\n— kwentuhan\\nhttps://kwentuhan.com\`` to clipboard via `@react-native-clipboard/clipboard` (no Instagram URL share API exists). Show a subtle `"Copied — paste in Instagram"` toast (reuse the save-hint slot or a separate Snackbar).
  - Messenger — gradient `#00B2FF → #006AFF → #8E33FF` (135deg), Messenger glyph. Action: try `fb-messenger://share?link=…` via `Linking.canOpenURL` first; fall back to `https://www.facebook.com/dialog/send?…` in `Linking.openURL`.

### 4.5 `StoryCard.tsx`

This is the **export source**. Render at exact `1080 × 1920` dimensions; **don't** scale here — the parent scales for preview. The on-disk PNG must be 1080×1920.

Layout constants (from web):

```ts
const CARD_W = 1080, CARD_H = 1920;
const SAFE_TOP = 250, SAFE_BOTTOM = 250, SIDE_PAD = 80;
```

Composition (absolute positioning everywhere):

1. **Background** — gradient `#F8F6FF → #FFF4F7` at 160deg.
2. **Two soft blobs** — radial gradients (use `react-native-svg` `<RadialGradient>` or `expo-linear-gradient`-on-rounded-view approximation):
   - Top-left: `top: -160, left: -160, 700×700`, color `rgba(108,92,231,0.10)` fading to transparent.
   - Bottom-right: `bottom: -200, right: -200, 700×700`, color `rgba(232,82,122,0.08)` fading.
3. **Header (logo + wordmark)** at `top: SAFE_TOP - 130, left: SIDE_PAD, right: SIDE_PAD`, row layout, gap 20:
   - Logo image 72×72.
   - Column: "kwentuhan" Playfair 44/700 `tokens.text`, lineHeight 1; tagline "usapang totoo, kasama mo." 22/500 `tokens.subtext`.
4. **Badges row** at `top: SAFE_TOP + 110, left: SIDE_PAD`, row, gap 14:
   - Level pill — 46h, padX 18, radius 100, 18/700, uppercase 6% letter-spacing. Color/bg/border from `LEVEL_CONFIG[level]`. Prefix the level emoji + label.
   - Cluster pill — same dimensions but 18/600 (no border, no uppercase). Color/bg from `CLUSTER_COLOR[cluster]`. Prefix `categoryEmoji` + `categoryLabel`.
5. **Question hook** at `top: SAFE_TOP + 210, left/right: SIDE_PAD`. Playfair 58/700, lineHeight 1.25, `tokens.text`.
6. **Answer block** at `top: SAFE_TOP + 560, left/right: SIDE_PAD, minHeight: 360`. Render `<AnswerBlock text={answer} style={style} scale={1} />`. If `teaser` is true, wrap with a heavy blur (`@react-native-community/blur` BlurView at `blurAmount={14}`) — RN can't natively `filter: blur()` arbitrary children, so this approach is required. **Important**: the captured PNG must include the blur, so render BlurView as a sibling overlay above the answer block sized to its bounds.
   - If `onEditAnswer` is provided, wrap in a `Pressable` so tapping the answer in preview opens input mode.
   - Empty state: italic 22 `tokens.muted` text `"Kwento mo naman…"`.
7. **Quote-truncation hint** — when `style === "quote" && answer.length > 180 && !teaser`, place `"Read on kwentuhan.com"` at `top: CARD_H - SAFE_BOTTOM - 230, left/right: SIDE_PAD`, 18/600 `tokens.subtext`.
8. **QR block** — bottom-right at `right: SIDE_PAD, bottom: SAFE_BOTTOM + 30`, padding 20, radius 24, bg `rgba(255,255,255,0.95)`, border `1px rgba(232,230,240,0.95)`, shadow `0 8px 24px rgba(26,23,48,0.10)`. Inside: `<QRCode value={qrUrl} size={220} color="#161327" backgroundColor="#FFFFFF" ecl="M" />` from `react-native-qrcode-svg`. Below the QR, a centered caption 18/600 `tokens.subtext`: `"Scan to reveal"` if teaser, else `"Scan to play"`.
9. **Domain watermark** — bottom-left at `left: SIDE_PAD, bottom: SAFE_BOTTOM + 30`, 24/500, color `rgba(139,135,168,0.65)`, text `"kwentuhan.com"`.

### 4.6 `AnswerBlock.tsx`

Three variants — port verbatim from web. All accept `{ text, style, attribution = "you", scale = 1 }`. Multiply every pixel/font value by `scale`.

- **Chat** — call `autoStackChat(text)` to split into up to 3 right-aligned bubbles. Bubble: maxWidth 75%, padX `16*scale`, padY `12*scale`, radius `18*scale`, bg `tokens.chatPeach`, color `tokens.noteInk`, DM Sans `18*scale` / 500, lineHeight 1.4. Tail (8×8 rotated square) only on the **last** bubble at `left: -4*scale, bottom: 4*scale`.
- **Quote** — truncate at 180 chars (slice + `"…"`). Render with a giant decorative `❝` glyph behind/above the text (Playfair `80*scale`, opacity 0.12, positioned `top: -80*scale*0.18, left: 0`). Body: Playfair `20*scale`/400, lineHeight 1.5, `tokens.text`. Attribution line below: DM Sans `12*scale`/600, uppercase 8% letter-spacing, `tokens.subtext`, prefix `"— "`.
- **Note** — the whole block is rotated `-1.5deg` (use RN `transform: [{ rotate: '-1.5deg' }]`). Font: Kalam (or fallback `Caveat`/`Marker Felt`/cursive) `22*scale`/400, lineHeight 1.3, `tokens.noteInk`.

### 4.7 `StyleChips.tsx`

Three-segment row, centered, gap 8. Pills 13/600, padX 16, padY 8, radius 100. Inactive: bg `tokens.surface`, border `1.5px tokens.border`, color `tokens.subtext`. Active: bg `tokens.accent`, border `tokens.accent`, color `white`, shadow `0 4px 16px rgba(108,92,231,0.30)`. Use `STYLE_LABEL` (`Chat`/`Quote`/`Note`).

### 4.8 `TeaserToggle.tsx`

Row, space-between, gap 12, py 16:
- Left column: `"Share as teaser"` (14/600 `tokens.text`) over `"Blur your answer. Friends scan to read it."` (11/normal `tokens.muted`).
- Right: a 44×26 rounded-13 track. When off: track `tokens.borderSolid`. When on: track `tokens.accent`. A 20×20 white circle thumb with shadow `0 2px 6px rgba(0,0,0,0.15)` at `top: 3, left: 3` (off) or `left: 21` (on). Animate `left` and `background` over ~180ms. Tappable target = whole row.

### 4.9 `SmartDefaultToast.tsx`

Auto-dismissing toast (4000ms) above the preview. Logic in `suggestionForLength(len)`:

- `len <= 40` → `{ suggest: "quote", message: "Quote style fits short answers beautifully — try it?" }`
- `len > 120` → `{ suggest: "note", message: "Note keeps long answers easy to read." }`
- else → `{ suggest: null, message: "" }` (no toast)

Container: bg `tokens.surface`, border `1px tokens.border`, radius 12, padX 14, padY 10, shadow `0 4px 16px rgba(108,92,231,0.10)`, fontSize 13, color `tokens.text`. Animate opacity + translateY 8 → 0 on enter; reverse on dismiss.

If the user picks the suggested style during the toast's lifetime, hide it immediately (the parent already does this — pass an `onDismiss` and call it from the `setStyle` handler when `next === toastInfo.suggest`).

### 4.10 Save / export — `src/lib/share/exportCard.ts`

- Use `react-native-view-shot`'s `captureRef(storyCardRef, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' })`. Because the on-screen card is rendered at scale `SCALE`, you'll either need to:
  - **Option A (preferred)** — render a hidden, off-screen `<StoryCard />` at full 1080×1920 size for capture. Position it at `position: 'absolute', left: -10000, top: 0` so it's laid out but invisible. Capture from the hidden ref.
  - **Option B** — capture from the visible scaled card with `width: 1080, height: 1920` so view-shot snapshots at native size. Test both; Option A produces sharper QRs.
- After capture, ask `CameraRoll.save(tmpUri, { type: 'photo', album: 'Kwentuhan' })`. Catch & surface errors via `setSaveHint("error")`.
- Then offer a native share sheet via `Sharing.shareAsync(tmpUri, { mimeType: 'image/png', dialogTitle: 'Kwentuhan card' })` (Expo) or `Share.share({ url: tmpUri, title: 'Kwentuhan card' })` (bare RN).
- Filename: `kwentuhan-${question.id}.png`.
- Permissions: request photo-library write permission with `expo-media-library` (Expo) or `PermissionsAndroid.request(...)` + iOS Info.plist `NSPhotoLibraryAddUsageDescription`.

### 4.11 QR — `src/lib/share/qr.ts`

Mirror `lib/qr.ts`:

```ts
const DEFAULT_APP_URL = 'https://kwentuhan.com';

export function buildQuestionShareUrl(questionId: number): string {
  // RN: no window.location, always use DEFAULT_APP_URL or an env var (Expo: process.env.EXPO_PUBLIC_BASE_URL).
  const base = process.env.EXPO_PUBLIC_BASE_URL ?? DEFAULT_APP_URL;
  return `${base.replace(/\/$/, '')}/?qid=${questionId}&source=qr`;
}
```

For QR rendering, prefer letting `react-native-qrcode-svg` render the SVG directly inside `<StoryCard />` rather than pre-generating a data URL. That removes the async step and the `getCachedQRCodeDataUrl` cache.

### 4.12 Teaser reveal URL — `src/lib/share/reveal.ts`

Port `lib/shareAnswer/reveal.ts` 1:1. POSTs to `/api/teaser` with `{ questionId, question, answer }`, expects `{ shareId }` back, returns `${base}/reveal/${shareId}`. Use the same base-URL resolution as `qr.ts`. Use `fetch` (works in RN). On error, surface to UI by setting `teaserUrl` to `""` so the reveal-link card doesn't render.

### 4.13 Persistence — `src/lib/share/persist.ts`

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnswerStyle } from './types';

const KEY = 'kw:share:lastStyle';

export async function getLastStyle(): Promise<AnswerStyle> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'chat' || v === 'quote' || v === 'note') return v;
  } catch {}
  return 'chat';
}

export async function setLastStyle(s: AnswerStyle): Promise<void> {
  try { await AsyncStorage.setItem(KEY, s); } catch {}
}
```

In `ShareModal.tsx`, hydrate inside a `useEffect(() => { getLastStyle().then(setStyleState); }, [])`.

---

## 5. Fonts

Load these font families at app startup (e.g. `App.tsx` with `useFonts` from `expo-font`, or `react-native.config.js` linking):

- **Playfair Display** — weights 700 and 900, also 700-italic.
- **DM Sans** — weights 400, 500, 600, 700.
- **Kalam** — weight 400 (handwriting fallback).

Expose them in `src/theme/fonts.ts`:

```ts
export const fonts = {
  playfair: 'PlayfairDisplay-Bold',
  dmSans:   'DMSans-Regular',
  dmSansMedium: 'DMSans-Medium',
  dmSansSemiBold: 'DMSans-SemiBold',
  dmSansBold: 'DMSans-Bold',
  kalam:    'Kalam-Regular',
} as const;
```

Replace every `fontFamily: "'Playfair Display', …"` in the web source with `fonts.playfair`, etc.

---

## 6. Animations (RN-specific notes)

- The bottom-sheet slide-up uses cubic-bezier `(0.34, 1.4, 0.64, 1)` ≈ a soft overshoot. With `@gorhom/bottom-sheet`, configure `animationConfigs` via `useBottomSheetSpringConfigs({ damping: 18, stiffness: 220, mass: 1, overshootClamping: false })` — tune until it feels like the web version.
- The brand-row scale on focus (1 → 0.7) — use `Animated.timing(scale, { toValue: focused ? 0.7 : 1, duration: 220, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true })`.
- The bubble glow at length ≥ 280 — animate `borderColor` (set `borderWidth: 1` always, transparent off, `tokens.warn` on) over 200ms.
- The toggle thumb — `Animated.timing` on `left` and a color interpolation on track bg.
- The fade-in on style change in `SharePreview` (`key={style}` in web) — in RN, key the wrapper `<View>` with `style` so it remounts; wrap with `Animated.View` doing `opacity: 0 → 1` over 300ms on mount.

---

## 7. Acceptance criteria — verify before declaring done

Build a **screenshot test** or run on simulator and check:

1. Open modal → input mode shows the brand card with the question's level badge, cluster chip, hook text, and an empty chat bubble pinned right.
2. Type into the bubble → header swaps to `"Add your answer"`, brand block scales to 70%, tagline disappears, bubble auto-grows.
3. Type 280+ chars → bubble gets a 1px amber outline.
4. Type 400+ chars → hint `"Mahaba na ah — try Note style on the next screen."` fades in below.
5. Hit 600 chars → input stops accepting more.
6. Tap "Done" → preview mode. Live preview is a small phone-shaped card showing the full 1080×1920 layout scaled to 270 wide. QR appears bottom-right and decodes to `https://kwentuhan.com/?qid=<id>&source=qr`.
7. Switch chip Chat → Quote → Note. Each variant changes; on Quote with >180 chars, `"Read on kwentuhan.com"` appears near the bottom of the preview. The chosen style persists across reopen.
8. If the answer was ≤40 chars on first preview, a one-shot toast suggests Quote. If >120 chars, suggests Note. Toast disappears in 4s, or immediately when the suggested style is picked. Toast does **not** reappear within the same modal session.
9. Toggle Teaser → answer block blurs in the preview. Reveal link appears below the toggle. QR caption changes from "Scan to play" to "Scan to reveal". QR target swaps to the `/reveal/<id>` URL returned from `/api/teaser`. Teaser resets to off when modal reopens.
10. Tap Save → permission requested first run; PNG saved to camera roll at exactly 1080×1920 (verify with the OS Photos info pane). Native share sheet appears. Status text shows "Card saved!" then clears after 2.2s. With an empty answer (defensive case), the Save button is disabled with copy "Add your answer first".
11. Tap Facebook icon → opens FB sharer for `https://kwentuhan.com`. Tap Messenger → opens `fb-messenger://share?link=…`, falls back to web dialog. Tap Instagram → copies `<question hook>\n\n— kwentuhan\nhttps://kwentuhan.com` to clipboard and shows a "Copied" hint.
12. Tap the answer area in preview → returns to input mode with the existing answer preserved.
13. Tap backdrop → closes when not focused; while TextInput is focused, backdrop tap dismisses keyboard but **does not** close the sheet (web parity).
14. Reopen modal after closing → answer text resets to `""`, teaser resets to `false`, style is whatever was last picked.

---

## 8. Don't

- Don't introduce new design tokens. Map every color through `tokens` and every text style through `fonts`.
- Don't change copy strings. Match Tagalog/English exactly, including the em-dashes in `"usapang totoo, kasama mo."` and `"Mahaba na ah — try Note style on the next screen."`.
- Don't reimplement `autoStackChat` — port byte-for-byte. The 120-char split + sentence-end search is load-bearing for Chat layout.
- Don't add a second persistence key for teaser. Teaser is intentionally per-session.
- Don't hard-code QR text content for the default (non-teaser) case — always go through `buildQuestionShareUrl(question.id)` so it stays in sync with web.
- Don't introduce any web-only APIs (`window`, `localStorage`, `navigator.share`, `navigator.clipboard`) without an RN-native replacement listed in §1.
- Don't ship without testing on both iOS and Android — view-shot scaling, BlurView, and the camera-roll permission flow differ.

---

## 9. Deliverables

1. All files under `src/components/share/` and `src/lib/share/` listed in §2.
2. New entries in `src/theme/tokens.ts` and `src/theme/fonts.ts`.
3. Wherever the existing RN app currently triggers "share" on a question, mount `<ShareModal visible={…} question={…} onClose={…} onNext={…} />` exactly the same way `SessionScreen.tsx` does on web (see lines 14–41).
4. A short `docs/share-modal.md` documenting which web file each RN file derives from, what changed, and any TODOs (e.g. if BlurView was substituted for CSS filter).
5. Any new dependencies added to `package.json` with a one-line justification per dep.

---

## 10. Process — please follow this loop

1. Read every file listed in §0 first. Don't skim — note the exact pixel/color values.
2. Audit our existing RN repo for: existing bottom-sheet implementations, theme tokens, the Question type, and any share-related code already present. **Reuse what's there**; don't duplicate.
3. Propose the file plan back to me before writing code if anything in §2 conflicts with our existing structure.
4. Implement bottom-up: tokens → fonts → types → autoStack/persist/qr/reveal → leaf components (StyleChips, TeaserToggle, SmartDefaultToast, AnswerInput, AnswerBlock) → StoryCard → ShareInput → SharePreview → ShareModal → integration point.
5. After each component, run on iOS simulator and confirm visual parity against `kwentuhan-web` running locally side-by-side.
6. Walk through §7 as the final acceptance pass.

When you're done, summarize: what was ported, what diverged from web (and why), what's still TODO. Don't gloss over the BlurView / view-shot scaling decisions — call them out explicitly.
