# Kwentuhan — Web PWA

> usapang totoo, kasama mo.

A card-based social conversation app — white-theme, iOS-style, PWA-ready.

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:3000
```

## Deploy to Vercel

```bash
npx vercel         # zero config needed
```

Or push to GitHub and import at vercel.com.

## Build for Production

```bash
npm run build
npm start
```

## Stack

| Layer     | Tech                    |
|-----------|-------------------------|
| Framework | Next.js 15 (App Router) |
| Language  | TypeScript              |
| Styling   | Tailwind CSS v3         |
| Data      | Static JSON (550 Qs)    |
| PWA       | Web Manifest + SW       |
| Export    | Canvas API (no backend) |

## Project Structure

```
kwentuhan-web/
├── app/
│   ├── layout.tsx          # Root layout, fonts, SW registration
│   ├── page.tsx            # App shell: landing → category → session
│   └── globals.css         # White-theme design tokens + animations
├── components/
│   ├── LandingScreen.tsx   # Mode selector, animated logo
│   ├── CategoryScreen.tsx  # Group: swipeable cards | Solo: chip grid
│   ├── QuestionCard.tsx    # Swipeable card, spring physics drag
│   ├── SessionScreen.tsx   # Play session, progress bar, controls
│   ├── ShareModal.tsx      # Card preview + PNG export + QR + copy
│   ├── AgeGateModal.tsx    # 18+ bottom sheet for Party mode
│   └── ServiceWorkerRegistrar.tsx
├── data/
│   ├── questions.json      # 550 questions (all iOS categories)
│   └── categories.json     # 19 categories with metadata
├── lib/
│   ├── types.ts            # TypeScript types + LEVEL_CONFIG + CLUSTER_COLOR
│   ├── questions.ts        # Filtering + seeded shuffle
│   ├── useSession.ts       # Session state hook
│   ├── shareCard.ts        # Canvas PNG generator (1080×1080)
│   └── qr.ts               # Zero-dependency QR matrix encoder
└── public/
    ├── manifest.json
    ├── sw.js
    └── icons/
```

## Features

- **550 questions** across 19 categories (Group + Solo)
- **White iOS-style UI** — clean cards, soft shadows, purple accents
- **Unified category design** — Group and Solo modes look identical
- **Spring-physics swipe** — drag left to advance, with rotation + fade
- **Deep Dive** — tap any card to reveal the follow-up question
- **Share & Export** — generates a 1080×1080 PNG with embedded QR code
- **Party Mode** — 18+ age gate with confirmation bottom sheet
- **Progress bar** — animated per session
- **PWA** — installable, offline-capable, no app store needed

## Category Map

### Group Mode
| Cluster  | Categories                         |
|----------|------------------------------------|
| Social   | Barkada, Besties, Pamilya          |
| Love     | Couple, Dating                     |
| Grind    | Trabaho, Negosyo, Startup          |
| Wild     | Party 🔞                           |

### Solo Mode
Self Check · Reflect · Goals · Emotions · Memories · Values · Growth · Habits · Thoughts

## Design Tokens

```css
--kw-bg:       #F7F7FA   /* page background */
--kw-surface:  #FFFFFF   /* card background */
--kw-accent:   #6C5CE7   /* primary purple  */
--kw-text:     #1A1730   /* heading text    */
--kw-subtext:  #8B87A8   /* body text       */
--kw-wild:     #E8527A   /* wild/party pink */
--kw-deep:     #3B82F6   /* deep blue       */
```

Fonts: **Playfair Display** (questions) + **DM Sans** (UI)
