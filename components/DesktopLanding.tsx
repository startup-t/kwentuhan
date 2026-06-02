"use client";

/**
 * DesktopLanding — the ≥1024px "card player" landing experience.
 *
 * DESKTOP-ONLY and SELF-CONTAINED. Rendered inside a `hidden lg:block`
 * wrapper AND guards every side effect behind a `min-width:1024px` matchMedia
 * check, so mobile/tablet ship no network requests, no key listeners and no
 * behavioural change. The mobile experience lives entirely in LandingScreen.
 *
 * Layout — one balanced "player" + a lean discovery rail:
 *   LEFT  — a single hero card that owns everything about the current
 *           question: metadata (type · mood · ~time) + favorite/share on top,
 *           the centered question with its category beneath, and a footer
 *           control bar (Previous · progress + counter · Next). One shortcut
 *           legend sits under the card.
 *   RIGHT — CTA, then Session (deck fact + Shuffle), Discover (mini cards),
 *           Categories (compact pills). Mode toggle lives in the top header.
 *
 * All "trivia" is derived from REAL deck data only — no fabricated user stats.
 */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Mode, Level, Question } from "@/lib/types";
import { GROUP_CATEGORIES, SOLO_CATEGORIES, LEVEL_CONFIG, CLUSTER_COLOR } from "@/lib/types";
import categoriesData from "@/data/categories.json";
import { getQuestions } from "@/lib/questions";
import ShareModal from "./ShareModal";

interface Props {
  onStart: (mode: Mode, category: string | null) => void;
}

type CatMeta = { label: string; emoji: string; cluster: string; tagline?: string; ageGated?: boolean };
const cats = categoriesData as Record<string, CatMeta>;

const ACCENT = "#6C52E3";

/** How many real categories show as "Popular" before the "More" dropdown. */
const POPULAR_COUNT = 4;

/** Per-level mood + estimated *discussion* time (a UX heuristic, not a user stat). */
const LEVEL_META: Record<Level, { mood: string; minutes: string }> = {
  light: { mood: "Easygoing",  minutes: "~2 min" },
  deep:  { mood: "Reflective", minutes: "~5 min" },
  wild:  { mood: "Daring",     minutes: "~3 min" },
};

/** Curated, one-click conversation starters. Map to real (mode, category, level). */
type Discover = { key: string; emoji: string; label: string; desc: string; mode: Mode; category: string | null; level?: Level };
const DISCOVER: Discover[] = [
  { key: "date",    emoji: "❤️", label: "Date Night",      desc: "Questions for couples",   mode: "group", category: "dating",  level: undefined },
  { key: "funny",   emoji: "😂", label: "Funny",           desc: "Guaranteed laughs",       mode: "group", category: null,      level: "wild" },
  { key: "barkada", emoji: "👯", label: "Barkada Chaos",   desc: "Chaotic group fun",       mode: "group", category: "barkada", level: "wild" },
  { key: "startup", emoji: "🚀", label: "Startup Stories", desc: "Founder conversations",   mode: "group", category: "startup", level: undefined },
  { key: "deep",    emoji: "✨", label: "Deep Talks",      desc: "Meaningful discussions",  mode: "group", category: null,      level: "deep" },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function DesktopLanding({ onStart }: Props) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mode, setMode] = useState<Mode>("group");
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<Level | undefined>(undefined);

  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(false);
  const [showShare, setShowShare] = useState(false);

  /* ── Desktop guard: only this component's logic runs at ≥1024px ── */
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const categoryKeys = mode === "group" ? GROUP_CATEGORIES : SOLO_CATEGORIES;
  const popularKeys = categoryKeys.slice(0, POPULAR_COUNT);
  const moreKeys = categoryKeys.slice(POPULAR_COUNT);

  /* ── Load + shuffle the deck whenever the filter changes (desktop only) ── */
  useEffect(() => {
    if (!isDesktop) return;
    let alive = true;
    getQuestions(mode, category, level).then((pool) => {
      if (!alive) return;
      setDeck(shuffle(pool));
      setIdx(0);
      setAnimKey((k) => k + 1);
    });
    return () => { alive = false; };
  }, [isDesktop, mode, category, level]);

  const total = deck.length;
  const pos = total ? (idx % total) + 1 : 0;
  const current = total ? deck[idx % total] : null;
  const pct = total ? Math.round((pos / total) * 100) : 0;

  const next = useCallback(() => {
    setIdx((i) => (total ? (i + 1) % total : 0));
    setAnimKey((k) => k + 1);
  }, [total]);

  const prev = useCallback(() => {
    setIdx((i) => (total ? (i - 1 + total) % total : 0));
    setAnimKey((k) => k + 1);
  }, [total]);

  const randomPick = useCallback(() => {
    if (!total) return;
    setIdx(Math.floor(Math.random() * total));
    setAnimKey((k) => k + 1);
  }, [total]);

  /* ── Keyboard shortcuts (desktop only, paused while sharing) ──
       ← previous · → next · Space shuffle */
  useEffect(() => {
    if (!isDesktop || showShare) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input,textarea,select,[contenteditable='true']")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === " " || e.code === "Space") { e.preventDefault(); randomPick(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, showShare, next, prev, randomPick]);

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setCategory(null);
    setLevel(undefined);
  }

  function selectCategory(cat: string | null) {
    setCategory(cat);
    setLevel(undefined);
    setShowMore(false);
  }

  function applyDiscover(d: Discover) {
    setMode(d.mode);
    setCategory(d.category);
    setLevel(d.level);
    setShowMore(false);
  }

  function toggleFav(id: string) {
    setFavs((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const lvl = current ? (LEVEL_CONFIG[current.level] ?? LEVEL_CONFIG.light) : LEVEL_CONFIG.light;
  const meta = current ? (LEVEL_META[current.level] ?? LEVEL_META.light) : LEVEL_META.light;
  const isFav = current ? favs.has(String(current.id)) : false;

  const activeDiscover = useMemo(
    () => DISCOVER.find((d) => d.mode === mode && d.category === category && d.level === level)?.key ?? null,
    [mode, category, level],
  );

  /* Real, non-fabricated deck trivia derived from the loaded pool. */
  const deckFact = useMemo(() => {
    if (!total) return null;
    const catCount = new Set(deck.map((q) => q.category)).size;
    const wild = deck.filter((q) => q.level === "wild").length;
    if (catCount > 1) return `📚 ${total} questions across ${catCount} categories`;
    if (wild > 0) return `🔥 ${wild} bold prompts in this deck`;
    return `💬 ${total} questions ready to go`;
  }, [deck, total]);

  return (
    <div className="flex min-h-dvh w-full justify-center px-10 py-6 2xl:px-16">
      <div className="flex w-full flex-col" style={{ maxWidth: 1500 }}>

        {/* ── Top header bar: brand (left) + mode toggle (right) ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Kwentuhan Logo" width={44} height={44} priority className="h-11 w-11" />
            <div>
              <h1
                className="text-[1.6rem] leading-none"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 900, color: "#1A1730", letterSpacing: "-0.02em" }}
              >
                kwentuhan
              </h1>
              <p className="mt-1 text-[13px]" style={{ fontFamily: "var(--font-dm-sans), sans-serif", color: "#8B87A8" }}>
                usapang totoo, kasama mo.
              </p>
            </div>
          </div>

          {/* Mode toggle — global session switch */}
          <div
            role="tablist"
            aria-label="Play Mode"
            className="inline-flex items-center gap-1 rounded-full p-1"
            style={{ background: "#FFFFFF", border: "1.5px solid rgba(200,195,230,0.55)", boxShadow: "0 2px 8px rgba(108,92,231,0.05)" }}
          >
            {(["group", "solo"] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchMode(m)}
                  className="h-9 cursor-pointer rounded-full px-5 text-[13px] font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B5EE8]"
                  style={
                    active
                      ? { background: "linear-gradient(135deg,#7B5EE8 0%,#5B3FD0 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(108,92,231,0.32)" }
                      : { background: "transparent", color: "#6B6890" }
                  }
                >
                  {m === "group" ? "👥 Group" : "👤 Solo"}
                </button>
              );
            })}
          </div>
        </header>

        {/* ── Two-column layout: hero player (left) + discovery rail (right) ── */}
        <div
          className="mt-5 flex-1"
          style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 28, alignItems: "stretch" }}
        >

          {/* ── LEFT: the unified hero "player" ── */}
          <section className="flex min-w-0 flex-col">
            <div
              className="group relative flex flex-1 overflow-hidden rounded-[1.9rem] transition-all duration-300 lg:hover:-translate-y-1"
              style={{
                background: lvl.cardBg,
                border: `1.5px solid ${lvl.cardBorder}`,
                boxShadow: "0 20px 64px rgba(108,92,231,0.16), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)",
              }}
            >
              <div className="flex w-full flex-col p-10" style={{ minHeight: "60vh" }}>

                {/* Top: metadata (left) + favorite / share (right) */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-[13px]">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 font-bold uppercase tracking-[0.04em]"
                      style={{ height: 30, fontSize: 12, background: lvl.bg, color: lvl.color, border: `1px solid ${lvl.border}` }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{lvl.emoji}</span>
                      <span>{lvl.label}</span>
                    </span>
                    <span style={{ color: "#8B87A8" }}>🎭 {meta.mood}</span>
                    <Dot />
                    <span style={{ color: "#8B87A8" }}>⏱️ {meta.minutes} talk</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <IconBtn
                      label={isFav ? "Remove favorite" : "Add favorite"}
                      onClick={() => current && toggleFav(String(current.id))}
                      disabled={!current}
                      active={isFav}
                      square
                    >
                      <svg width="17" height="17" viewBox="0 0 18 18" fill={isFav ? "#E8527A" : "none"}>
                        <path
                          d="M9 15.5S2.5 11.5 2.5 6.9A3.4 3.4 0 0 1 9 5.2a3.4 3.4 0 0 1 6.5 1.7C15.5 11.5 9 15.5 9 15.5Z"
                          stroke={isFav ? "#E8527A" : "currentColor"} strokeWidth="1.6" strokeLinejoin="round"
                        />
                      </svg>
                    </IconBtn>
                    <IconBtn label="Share question" onClick={() => current && setShowShare(true)} disabled={!current} square>
                      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                        <circle cx="13" cy="3.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="13" cy="14.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="3.5" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5.2 8L11 4.4M5.2 10L11 13.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </IconBtn>
                  </div>
                </div>

                {/* Center: question (hero) + its category beneath */}
                <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8">
                  {current ? (
                    <>
                      <p
                        key={`${current.id}-${animKey}`}
                        className="animate-scale-in text-center"
                        style={{
                          fontFamily: "var(--font-playfair), Georgia, serif",
                          fontWeight: 800,
                          fontSize: "clamp(2rem, 2.5vw, 2.6rem)",
                          lineHeight: 1.32,
                          color: "#1A1730",
                          maxWidth: "24ch",
                        }}
                      >
                        {current.hook}
                      </p>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
                        style={{ height: 30, background: "rgba(255,255,255,0.8)", color: "#6B6890", border: "1px solid rgba(200,195,230,0.5)" }}
                      >
                        <span style={{ fontSize: 14, lineHeight: 1 }}>{current.categoryEmoji}</span>
                        <span>{current.categoryLabel}</span>
                      </span>
                    </>
                  ) : (
                    <p className="text-center text-[15px]" style={{ color: "#8B87A8" }}>Shuffling your deck…</p>
                  )}
                </div>

                {/* Footer control bar: Previous · progress + counter · Next */}
                <div className="flex items-center gap-5">
                  <NavButton dir="prev" label="Previous" onClick={prev} disabled={!total} />

                  <div className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: "#6B6890" }}>
                      {total ? `Question ${pos} of ${total}` : "Loading deck…"}
                    </span>
                    <div
                      role="progressbar"
                      aria-valuenow={pos}
                      aria-valuemin={0}
                      aria-valuemax={total}
                      className="w-full overflow-hidden rounded-full"
                      style={{ height: 5, background: "rgba(108,92,231,0.14)" }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "linear-gradient(90deg,#7B5EE8 0%,#E8527A 100%)",
                          borderRadius: 999,
                          transition: "width 0.4s cubic-bezier(0.34,1.2,0.64,1)",
                        }}
                      />
                    </div>
                  </div>

                  <NavButton dir="next" label="Next" onClick={next} disabled={!total} />
                </div>
              </div>
            </div>

            {/* Single shortcut legend */}
            <p className="mt-3 text-center text-[12px]" style={{ color: "#9B97BB" }}>
              <Kbd>←</Kbd> Previous · <Kbd>→</Kbd> Next · <Kbd>space</Kbd> Shuffle
            </p>
          </section>

          {/* ── RIGHT: discovery rail ── */}
          <aside className="flex flex-col gap-4">

            {/* Primary CTA — dominant, clearly labelled */}
            <button
              onClick={() => onStart(mode, category)}
              aria-label="Start a Conversation with this deck"
              className="group inline-flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-6 text-white transition-all duration-200 active:scale-[0.98] lg:hover:-translate-y-0.5 lg:hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3FD0]"
              style={{ height: 66, background: "linear-gradient(135deg,#7B5EE8 0%,#5B3FD0 100%)", boxShadow: "0 12px 32px rgba(108,92,231,0.42)" }}
            >
              <span className="inline-flex items-center gap-2 text-[1.0625rem] font-semibold">
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 5.5h2.75c1.4 0 2.6 1 3.4 2.3" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11.35 12.2c.8 1.3 2 2.3 3.4 2.3h2.75" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 14.5h2.75c2 0 3.5-2 5-4.5s3-4.5 5-4.5h2.25" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15.5 3.5l2 2-2 2M15.5 12.5l2 2-2 2" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Start a Conversation</span>
              </span>
              <span className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                Shuffles {total || "the"} {total ? "questions" : "deck"} · {mode === "group" ? "Group" : "Solo"} mode
              </span>
            </button>

            {/* ── Session panel — deck fact + shuffle (progress lives in the card) ── */}
            <Panel>
              <PanelLabel>Session</PanelLabel>
              {deckFact && (
                <p className="text-[12.5px]" style={{ color: "#8B87A8" }}>{deckFact}</p>
              )}
              <button
                onClick={randomPick}
                disabled={!total}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-all duration-200 ${total ? "cursor-pointer lg:hover:-translate-y-0.5" : "cursor-not-allowed opacity-50"}`}
                style={{ background: "rgba(108,92,231,0.10)", color: "#5B3FD0", border: "1.5px solid rgba(108,92,231,0.22)" }}
              >
                <span style={{ fontSize: 15 }}>🎲</span>
                <span>Shuffle a question</span>
                <Kbd>space</Kbd>
              </button>
            </Panel>

            {/* ── Discover panel — visual mini cards ── */}
            <Panel>
              <PanelLabel>✨ Discover</PanelLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {DISCOVER.map((d) => {
                  const active = activeDiscover === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => applyDiscover(d)}
                      aria-pressed={active}
                      className="flex cursor-pointer flex-col gap-1 rounded-2xl p-3 text-left transition-all duration-200 lg:hover:-translate-y-0.5"
                      style={
                        active
                          ? { background: "linear-gradient(135deg,rgba(123,94,232,0.14),rgba(232,82,122,0.12))", border: "1.5px solid rgba(123,94,232,0.45)" }
                          : { background: "#FFFFFF", border: "1.5px solid rgba(200,195,230,0.5)" }
                      }
                    >
                      <span style={{ fontSize: 19, lineHeight: 1 }}>{d.emoji}</span>
                      <span className="text-[13px] font-bold leading-tight" style={{ color: active ? "#5B3FD0" : "#3A3658" }}>
                        {d.label}
                      </span>
                      <span className="text-[11.5px] leading-snug" style={{ color: "#8B87A8" }}>{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            {/* ── Categories panel — compact pills ── */}
            <Panel>
              <PanelLabel>Categories</PanelLabel>
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill emoji="🎲" label="Random" active={category === null} onClick={() => selectCategory(null)} />
                {popularKeys.map((k) => (
                  <Pill
                    key={k}
                    emoji={cats[k]?.emoji ?? "💬"}
                    label={cats[k]?.label ?? k}
                    active={category === k}
                    onClick={() => selectCategory(k)}
                  />
                ))}

                {moreKeys.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMore((s) => !s)}
                      aria-expanded={showMore}
                      aria-haspopup="menu"
                      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold transition-all duration-200 lg:hover:-translate-y-0.5"
                      style={{
                        background: moreKeys.includes(category as never) ? "rgba(108,92,231,0.12)" : "#FFFFFF",
                        border: "1.5px solid rgba(200,195,230,0.6)",
                        color: "#6B6890",
                      }}
                    >
                      <span>More</span>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                        <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {showMore && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} aria-hidden />
                        <div
                          role="menu"
                          className="animate-scale-in absolute right-0 z-20 grid grid-cols-2 gap-1.5 rounded-2xl p-2"
                          style={{ bottom: "calc(100% + 8px)", width: 300, background: "#fff", border: "1px solid rgba(200,195,230,0.55)", boxShadow: "0 14px 44px rgba(108,92,231,0.16)" }}
                        >
                          {moreKeys.map((k) => (
                            <button
                              key={k}
                              role="menuitem"
                              onClick={() => selectCategory(k)}
                              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors duration-150 hover:bg-[rgba(108,92,231,0.08)]"
                              style={{ color: category === k ? ACCENT : "#4A4668" }}
                            >
                              <span style={{ fontSize: 15 }}>{cats[k]?.emoji ?? "💬"}</span>
                              <span className="truncate">{cats[k]?.label ?? k}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Panel>
          </aside>
        </div>
      </div>

      {/* Reuse the existing share flow */}
      {showShare && current && (
        <ShareModal question={current} onClose={() => setShowShare(false)} onNext={next} />
      )}
    </div>
  );
}

/* ── Small presentational helpers ── */

function Dot() {
  return <span aria-hidden style={{ width: 3, height: 3, borderRadius: 3, background: "#C4C0DC" }} />;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded-md px-1.5 text-[11px] font-semibold"
      style={{ minWidth: 20, height: 19, background: "#F0EEF8", border: "1px solid rgba(200,195,230,0.7)", color: "#8B87A8", lineHeight: 1, fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {children}
    </kbd>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-3xl p-4"
      style={{ background: "rgba(255,255,255,0.72)", border: "1.5px solid rgba(200,195,230,0.5)", boxShadow: "0 4px 22px rgba(108,92,231,0.06)" }}
    >
      {children}
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "#9B97BB" }}>
      {children}
    </p>
  );
}

function NavButton({ dir, label, onClick, disabled }: { dir: "prev" | "next"; label: string; onClick: () => void; disabled?: boolean }) {
  const arrow = dir === "prev"
    ? <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    : <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous question" : "Next question"}
      className={`inline-flex h-12 shrink-0 items-center gap-1.5 rounded-2xl px-5 text-[13.5px] font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B5EE8] ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer lg:hover:-translate-y-0.5 lg:hover:shadow-md"}`}
      style={{ background: "#FFFFFF", border: "1.5px solid rgba(200,195,230,0.6)", color: "#5B3FD0", boxShadow: "0 2px 10px rgba(108,92,231,0.07)" }}
    >
      {dir === "prev" && <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{arrow}</svg>}
      <span>{label}</span>
      {dir === "next" && <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{arrow}</svg>}
    </button>
  );
}

function Pill({ emoji, label, active, onClick }: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold transition-all duration-200 lg:hover:-translate-y-0.5"
      style={
        active
          ? { background: "linear-gradient(135deg,#7B5EE8 0%,#5B3FD0 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(108,92,231,0.3)" }
          : { background: "#FFFFFF", border: "1.5px solid rgba(200,195,230,0.55)", color: "#4A4668" }
      }
    >
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function IconBtn({
  children, onClick, label, disabled, active, square,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  square?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-200 ${square ? "h-10 w-10" : "h-10 px-4"} ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer lg:hover:-translate-y-0.5"}`}
      style={{
        background: active ? "rgba(232,82,122,0.10)" : "#FFFFFF",
        border: `1.5px solid ${active ? "rgba(232,82,122,0.4)" : "rgba(200,195,230,0.55)"}`,
        color: "#6B6890",
        boxShadow: "0 2px 8px rgba(108,92,231,0.05)",
      }}
    >
      {children}
    </button>
  );
}
