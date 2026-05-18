# Kwentuhan shared substrate

This folder is the **canonical contract** between the web app, the native
iOS/Android app, and any future client. If a fact lives in two places, it
lives in **one of these files first**.

## Files

| File | Purpose |
|---|---|
| **[design-tokens.json](./design-tokens.json)** | Colors, type scale, spacing, radii, elevation, level config (Chill/Deep/Wild), cluster palette, category metadata, motion reference, export-card dimensions, reaction emoji order. |
| **[microcopy.ts](./microcopy.ts)** | Every user-facing string, grouped by screen. **Never paraphrase the Taglish.** It's the brand voice. |
| **[api-contract.md](./api-contract.md)** | All 9 API endpoints with request/response shapes, auth, status codes, UTM convention, telemetry event taxonomy. |
| **[flows.md](./flows.md)** | Every user flow step-by-step: landing → session → share → reveal → contribute. State transitions, telemetry coverage, cross-platform parity rules. |
| **[METRICS.sql](./METRICS.sql)** | Raw SQL for every impact metric, paste-ready for the Supabase SQL Editor. |
| **[native-port-blueprint.md](./native-port-blueprint.md)** | Stage-by-stage Claude Code blueprint for porting web → React Native (Android). 6 copy-pasteable stage prompts + risk analysis. |

## How to use this folder when working in the native repo

Attach all five files to the Claude session as context. Then prompt:

> *"Replatform the [SCREEN NAME] screen to match the web app's behavior,
> using design-tokens.json for colors/typography/spacing, microcopy.ts
> for every user-facing string (don't translate), api-contract.md for any
> backend call, and flows.md > [FLOW NAME] for the state machine.
> Use native idioms (Compose sheets, native haptics, native share sheet) —
> don't try to reproduce web's exact pixel values."*

## Editing rules

1. **Update HERE first.** Then regenerate web/native consumers.
2. **Microcopy** — preserve Taglish exactly. If you're tempted to "fix the
   grammar" on a Taglish phrase, you're wrong. Don't.
3. **Adding a new color / token** — pick a semantic name (e.g. `chillSoft`,
   not `purple-100`). Names live in the API; values can change.
4. **Adding an API endpoint** — append it to `api-contract.md` with the same
   shape conventions as the existing ones. Add it to the native app's
   `ApiContract.kt` / `ApiContract.swift` as well.
5. **Adding a flow** — write the step-by-step in `flows.md` first, then
   implement on each platform.

## What is NOT in this folder

- Marketing copy / website content (lives elsewhere)
- Server schemas (live in `lib/kwento/postgresStore.ts` and `lib/kwento/telemetryStore.ts`)
- Question content (lives in `data/questions.json` + `contributed_questions` table)
- Build/deploy config

If something belongs here but isn't, file an issue — that's the failure mode
to watch for.
