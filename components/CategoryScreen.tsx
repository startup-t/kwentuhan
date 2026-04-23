"use client";

import { useState, useRef } from "react";
import type { Mode } from "@/lib/types";
import { GROUP_CATEGORIES, SOLO_CATEGORIES, CLUSTER_COLOR } from "@/lib/types";
import { getQuestionCount } from "@/lib/questions";
import categoriesData from "@/data/categories.json";

interface Props {
  mode:             Mode;
  onCategoryChosen: (cat: string | null) => void;
  onBack:           () => void;
}

interface CatMeta {
  label: string; emoji: string; mode: string;
  cluster: string; tagline: string; ageGated?: boolean;
}
const cats = categoriesData as Record<string, CatMeta>;

/* ── Shared category card — used by BOTH modes ── */
interface CatCardProps {
  catKey:    string | null;   // null = Random
  isActive?: boolean;
  onClick:   () => void;
  compact?:  boolean;
}

function CategoryCard({ catKey, isActive, onClick, compact }: CatCardProps) {
  const isRandom = catKey === null;
  const meta     = catKey ? cats[catKey] : null;
  const count    = getQuestionCount(catKey === null ? "group" : (meta?.mode as Mode ?? "group"), catKey);
  const cluster  = meta?.cluster ?? "other";
  const clr      = CLUSTER_COLOR[cluster] ?? CLUSTER_COLOR.other;

  return (
    <button
      onClick={onClick}
      className={`kw-card kw-card-hover w-full text-left transition-all duration-200 ${
        compact ? "p-4" : "p-6"
      } ${isActive ? "ring-2 ring-kw-accent" : ""}`}
      style={isActive ? { borderColor:"var(--kw-accent)" } : {}}
    >
      {/* Cluster tag */}
      {!isRandom && meta && !compact && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[0.7rem] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                style={{ color: clr.accent, background: clr.bg }}>
            {meta.cluster}
          </span>
          {meta.ageGated && (
            <span className="text-[0.7rem] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{ color:"#E8527A", background:"#FFECF1" }}>
              18+
            </span>
          )}
        </div>
      )}

      {/* Main content */}
      <div className={`flex items-center gap-3 ${compact ? "" : "mb-3"}`}>
        <span className={`${compact ? "text-2xl" : "text-4xl"} leading-none select-none`}>
          {isRandom ? "🎲" : meta?.emoji}
        </span>
        <div>
          <p className={`font-bold leading-tight ${compact ? "text-sm" : "text-xl"}`}
             style={{ color:"var(--kw-text)", fontFamily:"'Playfair Display',Georgia,serif" }}>
            {isRandom ? "Random" : meta?.label}
          </p>
          {!compact && (
            <p className="text-sm mt-0.5" style={{ color:"var(--kw-subtext)" }}>
              {isRandom ? "All categories, shuffled." : meta?.tagline}
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs font-medium" style={{ color:"var(--kw-muted)" }}>
            📚 {count} questions
          </span>
          <div className="flex items-center gap-1" style={{ color:"var(--kw-accent)" }}>
            <span className="text-xs font-semibold">Start</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

/* ── Group Mode: paged swipe-card browser ── */
function GroupBrowser({ onChosen }: { onChosen: (cat: string | null) => void }) {
  const allKeys: Array<string | null> = [null, ...GROUP_CATEGORIES];
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);

  const catKey = allKeys[idx];
  const meta   = catKey ? cats[catKey] : null;
  const count  = getQuestionCount("group", catKey);
  const cluster = meta?.cluster ?? "other";
  const clr    = CLUSTER_COLOR[cluster] ?? CLUSTER_COLOR.other;

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* Swipeable hero card */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-5 py-2 md:px-6 md:py-4"
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const d = touchX.current - e.changedTouches[0].clientX;
          if (d >  50 && idx < allKeys.length - 1) setIdx(i => i + 1);
          if (d < -50 && idx > 0)                  setIdx(i => i - 1);
          touchX.current = null;
        }}
      >
        <div
          key={idx}
          className="kw-card card-enter flex w-full max-w-sm flex-col items-center gap-4 px-8 py-9 text-center md:max-w-md md:gap-6 md:px-10 md:py-10"
        >
          {/* Cluster / age badges */}
          <div className="flex items-center gap-2 h-6">
            {meta && (
              <span className="text-[0.7rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ color: clr.accent, background: clr.bg }}>
                {meta.cluster}
              </span>
            )}
            {meta?.ageGated && (
              <span className="text-[0.7rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ color:"#E8527A", background:"#FFECF1" }}>
                18+
              </span>
            )}
          </div>

          <span className="text-6xl leading-none select-none animate-slide-up-sm">
            {catKey === null ? "🎲" : meta?.emoji}
          </span>

          <div>
            <h2 className="text-[1.875rem] font-black leading-tight md:text-[2.125rem]"
                style={{ fontFamily:"'Playfair Display',Georgia,serif", color:"var(--kw-text)" }}>
              {catKey === null ? "Random" : meta?.label}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed md:text-base" style={{ color:"var(--kw-subtext)" }}>
              {catKey === null ? "All categories, random order." : meta?.tagline}
            </p>
          </div>

          <p className="text-sm font-medium" style={{ color:"var(--kw-muted)" }}>
            📚 {count} questions
          </p>

          <button
            onClick={() => onChosen(catKey)}
            className="btn-primary w-full py-[0.9375rem] text-[0.9375rem] mt-1"
            style={meta && !meta.ageGated ? {
              background:`linear-gradient(135deg,${clr.accent}DD,${clr.accent}AA)`,
              boxShadow:`0 4px 20px ${clr.accent}40`,
            } : {}}
          >
            {catKey === null ? "✨  Start Random" : `Start — ${meta?.label}`}
          </button>
        </div>
      </div>

      {/* Dot pager */}
      <div className="flex justify-center gap-1.5 py-3">
        {allKeys.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width:  i === idx ? 20 : 6, height: 6,
                    background: i === idx ? "var(--kw-accent)" : "var(--kw-border)",
                  }} />
        ))}
      </div>

      <p className="text-center text-[0.7rem] pb-4 flex items-center justify-center gap-2"
         style={{ color:"var(--kw-muted)" }}>
        <span>←</span><span>swipe to browse</span><span>→</span>
      </p>
    </div>
  );
}

/* ── Solo Mode: chip + preview card — same visual system as Group ── */
function SoloBrowser({ onChosen }: { onChosen: (cat: string | null) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const meta  = selected ? cats[selected] : null;
  const count = getQuestionCount("solo", selected);

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 md:gap-6 md:px-6">

      {/* Chip row */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        <button
          onClick={() => setSelected(null)}
          className={`kw-chip ${selected === null ? "active" : ""}`}
        >
          🎲 Random
        </button>
        {SOLO_CATEGORIES.map(cat => {
          const m = cats[cat];
          if (!m) return null;
          return (
            <button
              key={cat}
              onClick={() => setSelected(cat)}
              className={`kw-chip ${selected === cat ? "active" : ""}`}
            >
              {m.emoji} {m.label}
            </button>
          );
        })}
      </div>

      {/* Preview card — same CategoryCard component */}
      <div className="mx-auto w-full max-w-sm md:max-w-md">
        {selected ? (
          <div key={selected} className="kw-card deep-reveal p-6 md:p-7">
            <div className="flex flex-col items-center gap-3 text-center md:gap-4">
              <div className="flex items-center gap-2">
                {meta && (
                  <span className="text-[0.7rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{
                          color: (CLUSTER_COLOR[meta.cluster]??CLUSTER_COLOR.other).accent,
                          background: (CLUSTER_COLOR[meta.cluster]??CLUSTER_COLOR.other).bg,
                        }}>
                    {meta.cluster}
                  </span>
                )}
              </div>
              <span className="text-5xl leading-none">{meta?.emoji}</span>
              <div>
                <p className="text-xl font-bold md:text-2xl"
                   style={{ fontFamily:"'Playfair Display',Georgia,serif", color:"var(--kw-text)" }}>
                  {meta?.label}
                </p>
                <p className="mt-1 text-sm md:text-[15px]" style={{ color:"var(--kw-subtext)" }}>
                  {meta?.tagline}
                </p>
              </div>
              <p className="text-xs font-medium" style={{ color:"var(--kw-muted)" }}>
                📚 {count} questions
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm py-4" style={{ color:"var(--kw-muted)" }}>
            {count} questions · pick a topic or go random
          </p>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={() => onChosen(selected)}
        className="btn-primary mx-auto flex w-full max-w-sm items-center justify-center gap-2 py-[1.0625rem] text-[1rem] md:max-w-md"
      >
        <span>{selected === null ? "✨ Start Random" : `Start — ${meta?.label}`}</span>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9h10M9 5l4 4-4 4" stroke="white" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="pb-2" />
    </div>
  );
}

/* ── CategoryScreen shell ── */
export default function CategoryScreen({ mode, onCategoryChosen, onBack }: Props) {
  return (
    <div className="flex min-h-dvh flex-col safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-1 pb-3 pt-4 md:gap-4 md:pt-6"
           style={{ borderBottom:"1px solid var(--kw-border)" }}>
        <button onClick={onBack}
                className="w-9 h-9 rounded-xl flex items-center justify-center btn-secondary shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h2 className="text-[0.9375rem] font-bold leading-tight md:text-base" style={{ color:"var(--kw-text)" }}>
            {mode === "group" ? "Group Mode" : "Solo Mode"}
          </h2>
          <p className="text-xs md:text-[13px]" style={{ color:"var(--kw-subtext)" }}>
            {mode === "group" ? "Choose your vibe" : "Pick a reflection topic"}
          </p>
        </div>
      </div>

      {mode === "group"
        ? <GroupBrowser onChosen={onCategoryChosen} />
        : <SoloBrowser  onChosen={onCategoryChosen} />}
      </div>
    </div>
  );
}
