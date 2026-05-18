# Kwentuhan API Contract

**Status:** v1 — stable.
**Base URL (prod):** `https://kwentuhan.cards`
**Base URL (dev):** `http://localhost:3000`
**Runtime:** Node.js serverless on Vercel.

All endpoints are `force-dynamic` (no caching). Bodies are JSON. Responses
are JSON unless otherwise noted. Times are ISO 8601 UTC.

This file is the contract for **all** clients — the web app, the native
iOS/Android app, and anything else. If a contract changes, this file
changes first.

---

## Authentication

There is **no user auth** today. Two endpoints are admin-gated by a shared
secret env var:

- `GET /api/metrics`
- `GET /api/contribute` (admin feed; POST is public)

Admin auth:
- `Authorization: Bearer <METRICS_ADMIN_TOKEN>` (preferred), **or**
- `?token=<METRICS_ADMIN_TOKEN>` query param

Token must be at least 16 characters. Constant-time compared server-side.
If the env var is unset, both endpoints return `503 Service Unavailable`.

---

## Common types

```ts
type Mode  = "solo" | "group";
type Level = "light" | "deep" | "wild";

interface Question {
  id: string | number;        // numeric for static; "q_..." for community
  hook: string;
  deepDive: string;
  level: Level;
  levelLabel: string;
  levelColor: string;
  category: string;           // e.g. "barkada", "selfCheck"
  categoryLabel: string;
  categoryEmoji: string;
  mode: Mode;
  cluster: string;            // e.g. "social", "love", "grind", "solo"
  isPersonal: boolean;
  ageGated: boolean;
  contributor?: string;       // present when isCommunity
  language?: string;
  isCommunity?: boolean;
}
```

---

## `GET /api/questions`

Returns the merged question pool — bundled static questions + published
community contributions. This is the primary deck source. Server-side
caching with a 30s TTL; client-side cache via `lib/questions.ts`.

### Query params
| Param | Required | Values | Notes |
|---|---|---|---|
| `mode` | yes | `solo \| group` | |
| `category` | optional | category key or `null` (string) | `"null"` = all categories |
| `level` | optional | `light \| deep \| wild` | |

### Response 200

```json
{
  "questions": [ Question, ... ]
}
```

### Response 400

```json
{ "error": "Invalid mode" }
```

---

## `POST /api/contribute`

Publishes a community question instantly. No moderation queue.

### Request body
```json
{
  "hook": "string (8..400 chars, required)",
  "deepDive": "string (0..400 chars, optional)",
  "level": "light | deep | wild",
  "category": "string (category key)",
  "mode": "solo | group",
  "cluster": "string (cluster key)",
  "contributorUsername": "string (0..32 chars, prefixed with @ on display)",
  "language": "string (ISO 639-1, e.g. 'en')"
}
```

### Response 200

```json
{
  "question": {
    "id": "q_abcdef0123456789",
    "hook": "...",
    "deepDive": "...",
    "level": "light",
    "category": "selfCheck",
    "mode": "solo",
    "cluster": "solo",
    "contributorUsername": "@ysha",
    "language": "en",
    "isPublished": true,
    "createdAt": "2026-05-15T08:25:45.167Z"
  }
}
```

### Response 400

```json
{ "error": "Question must be at least 8 characters." }
{ "error": "Question can be at most 400 characters." }
```

### Side effects
- Drops in-process question caches (`bustQuestionsCache()`)
- Best-effort `revalidatePath('/')` + `/q/[questionId]` + `/q/[questionId]/k/[kwentoId]`

---

## `GET /api/contribute` *(admin-gated)*

Enriched community-question feed with per-question telemetry signals. The
read path for moat #2 (community quality filter).

### Query params
| Param | Default | Values |
|---|---|---|
| `sort` | `newest` | `newest \| best \| worst` |
| `days` | `30` | int 1..3650, or `all` |
| `mode` | – | `solo \| group` |
| `category` | – | category key |
| `level` | – | `light \| deep \| wild` |
| `min_shown` | `0` for `newest`, `5` for `best`/`worst` | int ≥ 0 |
| `limit` | `50` | int 1..200 |
| `offset` | `0` | int ≥ 0 |
| `token` | – | admin token (alt to Bearer header) |

### Response 200
```json
{
  "windowDays": 30,
  "sort": "best",
  "total": 14,
  "limit": 50,
  "offset": 0,
  "questions": [
    {
      "id": "q_...",
      "hook": "...",
      "deepDive": "",
      "level": "light",
      "category": "startup",
      "mode": "group",
      "cluster": "grind",
      "contributorUsername": "@reveal-test",
      "language": "en",
      "isPublished": true,
      "createdAt": "2026-05-15T...",
      "signals": {
        "shown": 7,
        "answered": 5,
        "reacted": 3,
        "shared": 0,
        "skipped": 0,
        "answerRatePct": 71.43,
        "reactionRatePct": 42.86,
        "shareRatePct": 0,
        "skipRatePct": 0,
        "engagementRatePct": 114.29
      }
    }
  ]
}
```

### Response 401 / 503
- 401: token missing or wrong
- 503: `METRICS_ADMIN_TOKEN` env var not configured

---

## `POST /api/kwento`

Persists a User 2 answer (the kwento) and returns its public reveal URL.
This is the answer-creation endpoint used by `KwentoForm`.

### Request body
```json
{
  "questionId": "string | number (required)",
  "questionText": "string (optional, defaults to questionId)",
  "answerText": "string (required, non-empty)",
  "isTeaser": "boolean (optional, defaults true)",
  "teaser": "boolean (alias for isTeaser, native compat)"
}
```

### Response 200
```json
{
  "kwentoId": "k_abcdef0123456789",
  "questionId": "1",
  "answerText": "...",
  "isTeaser": true,
  "revealUrl": "https://kwentuhan.cards/reveal/k_abc...?teaser=true"
}
```

### Response 400 / 500
- 400: `{ "error": "Missing fields" | "Invalid request" }`
- 500: `{ "error": "Failed to save kwento" }`

---

## `GET /api/kwento/[kwentoId]`

Resolves a single kwento by ID. Used by reveal pages.

### Response 200
```json
{
  "kwentoId": "k_...",
  "questionId": "1",
  "questionText": "Be honest — ilang 'new chapter' na sinimulan mo...",
  "answerText": "Honestly...",
  "isTeaser": true
}
```

### Response 404
```json
{ "error": "Kwento not found" }
```

---

## `POST /api/teaser`

Web-only alias for `POST /api/kwento` with `isTeaser: true`. Persists
a teaser-mode kwento and returns the reveal URL. Used by
`createAnswerRevealUrl()` from web's `SharePreview`/`KwentoExportPanel`.

### Request body
```json
{
  "questionId": "number | string",
  "question": "string (the question hook)",
  "answer": "string"
}
```

### Response 200
```json
{
  "kwentoId": "k_...",
  "questionId": "1",
  "revealUrl": "https://kwentuhan.cards/reveal/k_...?teaser=true"
}
```

### Response 400 / 500
- 400: `{ "error": "Invalid payload" }`
- 500: `{ "error": "Failed to create share" }`

---

## `GET /api/reveal/[shareId]`

Legacy reveal-URL handler. Resolves a `shareId` (= kwentoId) and returns
the answer payload. Kept for backwards compatibility with old shares
created when the URL shape was `/reveal/[shareId]`.

### Response 200
```json
{
  "answers": {
    "questionId": 1,
    "question": "...",
    "answer": "..."
  },
  "mode": "teaser"
}
```

### Response 404
```json
{
  "answers": null,
  "mode": "teaser",
  "fallback": true,
  "error": "Share not found"
}
```

---

## `POST /api/session-event`

Telemetry ingest — the foundation of the question-quality graph. Fire-and-
forget from the client. Always returns 200 unless the request itself is
structurally malformed.

### Request body — single event
```json
{
  "session_id": "string (uuid or stable token, required)",
  "user_token": "string | null",
  "question_id": "string (required)",
  "event_type": "shown | skipped | answered | shared | reacted",
  "answer_length_chars": 0,
  "dwell_ms": 0
}
```

### Request body — batched
```json
{ "events": [ { ... }, { ... }, ... ] }
```
or just a bare array `[ { ... }, ... ]`. Max 100 events per batch.

### Response 200
```json
{ "accepted": 4 }              // all valid
{ "accepted": 1, "dropped": 2 } // mixed batch
```

### Response 400
```json
{ "error": "Invalid JSON" }
{ "error": "Expected event or events[]" }
```

### Failure mode
Inserts failing → `500 { "accepted": 0, "error": "insert_failed" }` — client
should NOT retry (the client's local queue has already moved on).

---

## `GET /api/metrics` *(admin-gated)*

Returns the full impact-metrics snapshot — activity, engagement, funnel,
quality, virality, community, top-questions leaderboard.

### Query params
| Param | Default | Values |
|---|---|---|
| `days` | `30` | int 1..3650, or `all` |
| `token` | – | admin token |

### Response 200
See `MetricsSnapshot` in `lib/metrics.ts` for the full shape. Top-level:
```ts
{
  windowDays: number | null;
  generatedAt: string;
  activity:    { dau, wau, mau };
  engagement:  { totalSessions, avgEventsPerSession, ... };
  funnel:      { shownCount, answerRatePct, shareRatePct, ... };
  quality:     { answeredCount, avgDwellMs, p50DwellMs, ... };
  virality:    { shareCount, totalSessions, sharesPerSession };
  community:   { contributedQuestionCount, answersOnCommunityQuestions };
  topQuestions: QuestionPerformanceRow[];
}
```

---

## `POST /api/follow-up`

Generates a contextual "Deep Dive" follow-up question for a freshly published
kwento. Routes through Vercel AI Gateway (OpenAI-compatible). Used by
`FollowUpQuestionCard`.

### Request body
```json
{
  "hook": "string (required)",
  "mode": "solo | group",
  "category": "string"
}
```

### Response 200
```json
{ "followUp": "What part of that experience still feels unfinished for you?" }
```

### Response 503
Returned when `AI_GATEWAY_API_KEY` is unset. Clients should hide their UI
silently (not show an error).

### Response 502 / 500
Returned on gateway errors. Clients should offer a "Retry" affordance.

---

## Reveal URL shapes (clients must support both)

- **Canonical (v2):** `/q/{questionId}/k/{kwentoId}` — the durable form
- **Teaser (v1, web-only):** `/reveal/{kwentoId}?teaser=true` — legacy

Both resolve to the same kwento payload via the API endpoints above.

---

## QR / share-URL UTM convention

Every outbound share URL is UTM-tagged so incoming sessions are attributable:

```
?utm_source=kwentuhan&utm_medium={qr|facebook|messenger|instagram}&utm_campaign=share
```

Native clients should match this exactly when generating share URLs.
The `utm_medium` taxonomy:

| Medium | When |
|---|---|
| `qr` | QR code rendered into a downloaded/exported card |
| `facebook` | Facebook Share dialog |
| `messenger` | Messenger deep-link or web dialog |
| `instagram` | Clipboard payload (Instagram has no direct share intent) |

If you add a platform, document its `utm_medium` here first.

---

## Telemetry event taxonomy (for `POST /api/session-event`)

| `event_type` | When to fire | Additional fields |
|---|---|---|
| `shown` | A question card is displayed (game flow OR reveal page) | – |
| `skipped` | User advances past a question without engaging (no share, no react) | – |
| `answered` | User submits an answer for the question | `answer_length_chars`, `dwell_ms` |
| `shared` | User downloads the card, taps a social share, or fires native share intent | – |
| `reacted` | User taps an emoji reaction on the reveal | – |

`dwell_ms` = milliseconds from `shown` to the current event (typically
calculated for `answered`).

`session_id` is per-device, persisted forever in localStorage / native
keychain. Generate one v4 UUID on first launch; persist; reuse across
sessions until user clears storage.
