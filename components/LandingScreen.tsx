"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import type { Mode } from "@/lib/types";
import { GROUP_CATEGORIES, SOLO_CATEGORIES, CLUSTER_COLOR } from "@/lib/types";
import categoriesData from "@/data/categories.json";
import { getQuestionCount, getQuestions } from "@/lib/questions";
import CategoryChips from "./CategoryChips";
import PlayModeToggle from "./PlayModeToggle";
import PrimaryButton from "./PrimaryButton";
import DesktopQuestionPreview from "./DesktopQuestionPreview";

interface Props {
  onModeChosen: (mode: Mode, category?: string | null) => void;
}

type CatData = Record<string, { label: string; emoji: string; cluster: string }>;
const cats = categoriesData as CatData;

const ACCENT = "#6C52E3";
const colorFor = (key: string): string =>
  key === "random" ? ACCENT : CLUSTER_COLOR[cats[key]?.cluster]?.accent ?? ACCENT;

type Topic = { key: string; emoji: string; label: string; color: string };

const GROUP_TOPICS: Topic[] = [
  { key: "random", emoji: "🎲", label: "Random", color: ACCENT },
  ...GROUP_CATEGORIES.map(k => ({
    key: k,
    emoji: cats[k]?.emoji ?? "💬",
    label: cats[k]?.label ?? k,
    color: colorFor(k),
  })),
];

const SOLO_TOPICS: Topic[] = [
  { key: "random", emoji: "🎲", label: "Random", color: ACCENT },
  ...SOLO_CATEGORIES.map(k => ({
    key: k,
    emoji: cats[k]?.emoji ?? "💭",
    label: cats[k]?.label ?? k,
    color: colorFor(k),
  })),
];

// Stable hash function to create deterministic seed from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export default function LandingScreen({ onModeChosen }: Props) {
  const [mode,  setMode]  = useState<Mode>("group");
  const [topic, setTopic] = useState<string>("random");
  const [isMounted, setIsMounted] = useState(false);

  const topics = mode === "group" ? GROUP_TOPICS : SOLO_TOPICS;

  const questionCount = useMemo(
    () => getQuestionCount(mode, topic === "random" ? null : topic),
    [mode, topic],
  );

  // FIX: Only compute preview question after client mount to avoid hydration mismatch
  // This prevents server/client render differences for the preview
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Desktop-only: pick a stable deterministic preview question that updates when mode/topic changes
  // Only computed after client mount to avoid hydration mismatch
  const previewQuestion = useMemo(() => {
    if (!isMounted) return null;
    const pool = getQuestions(mode, topic === "random" ? null : topic);
    if (!pool.length) return null;
    // Create stable seed from mode and topic for consistent but deterministic selection
    const seed = hashString(`${mode}-${topic}`);
    return pool[seed % pool.length];
  }, [mode, topic, isMounted]);

  function switchMode(m: Mode) {
    setMode(m);
    setTopic("random");
  }

  function handleCTA() {
    onModeChosen(mode, topic === "random" ? null : topic);
  }

  const topicLabel = mode === "group" ? "Category" : "Solo Topic";
  const modeInfo =
    mode === "group"
      ? { title: "Group Mode", desc: "Better conversations start with better questions.", icon: "👥" }
      : { title: "Solo Mode",  desc: "Para sa sariling reflection + sharing.", icon: "👤" };

  return (
    <div className="kw-bg flex flex-col min-h-dvh safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 md:px-6 lg:px-8">

        {/* ── Logo (centered) ── */}
        <div className="mt-[72px] flex flex-col items-center animate-slide-up md:mt-24">
          <Image
            src="/logo.png"
            alt="Kwentuhan Logo"
            width={96}
            height={96}
            priority
            className="h-auto w-auto md:h-28 md:w-28"
          />

          <h1
            className="mt-5 text-4xl lg:text-5xl"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 900,
              color: "#1A1730",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            kwentuhan
          </h1>
          <p
            className="mt-1.5 text-[15px] lg:text-[17px]"
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: "#9B97BB",
            }}
          >
            usapang totoo, kasama mo.
          </p>
        </div>

        {/* ── Desktop 2-col / Mobile single-col ── */}
        <div className="mt-8 flex flex-1 flex-col gap-6 lg:mt-10 lg:grid lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-12">

          {/* ── Left sidebar ── */}
          <aside
            className="animate-slide-up lg:sticky lg:top-10 lg:flex lg:flex-col lg:gap-5"
            style={{ animationDelay: "0.07s" }}
          >
            {/* Play Mode */}
            <div>
              <p
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#9B97BB",
                  marginBottom: 10,
                }}
              >
                Play Mode
              </p>
              <PlayModeToggle mode={mode} onChange={switchMode} />
            </div>

            {/* Category */}
            <div className="mt-1 lg:mt-0">
              <p
                className="pl-4 lg:pl-0"
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#9B97BB",
                  marginBottom: 10,
                }}
              >
                {topicLabel}
              </p>
              <CategoryChips topics={topics} selected={topic} onSelect={setTopic} />
            </div>

            {/* Desktop-only: question count */}
            <div className="hidden lg:flex items-center gap-1.5 text-[13px] text-[#B0ABC8]">
              <span style={{ fontSize: 14 }}>📋</span>
              <span>{questionCount} questions in deck</span>
            </div>

            {/* Desktop-only: subtext + CTA */}
            <div className="hidden lg:flex lg:flex-col lg:gap-3 lg:pt-1">
              <p
                className="text-center text-[13px]"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif", color: "#9B97BB" }}
              >
                Tap below to get your first question
              </p>
              <PrimaryButton
                onClick={handleCTA}
                icon={<ShuffleIcon />}
                ariaLabel="Start a Conversation"
              >
                Start a Conversation
              </PrimaryButton>
            </div>
          </aside>

          {/* ── Main / right column ── */}
          <main className="animate-slide-up" style={{ animationDelay: "0.12s" }}>
            <div className="mx-auto flex w-full flex-col gap-3 md:gap-4 lg:max-w-none lg:gap-5">

              {/* Mobile-only: question count */}
              <div className="flex items-center justify-center gap-1.5 text-[13px] text-[#B0ABC8] lg:hidden">
                <span style={{ fontSize: 14 }}>📋</span>
                <span>{questionCount} questions in deck</span>
              </div>

              {/* Mobile-only: mode info card */}
              <div
                className="flex items-center gap-3 rounded-[18px] border border-[rgba(200,195,230,0.6)] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 md:gap-4 md:p-5 lg:hidden"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full md:h-14 md:w-14"
                  style={{
                    background: "rgba(108,92,231,0.12)",
                    fontSize: 22,
                  }}
                >
                  {modeInfo.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="text-[15px] font-bold leading-[1.2] text-[#1A1730] md:text-base">
                    {modeInfo.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.4] text-[#8B87A8] md:text-sm">
                    {modeInfo.desc}
                  </p>
                </div>
              </div>

              {/* Desktop-only: live question preview */}
              <DesktopQuestionPreview question={previewQuestion} />

              {/* Mobile-only: CTA */}
              <div className="mb-8 pt-1 md:pb-4 lg:hidden">
                <p
                  className="mb-3 text-center text-[13px]"
                  style={{ fontFamily: "var(--font-dm-sans), sans-serif", color: "#9B97BB" }}
                >
                  Tap below to get your first question
                </p>
                <PrimaryButton
                  onClick={handleCTA}
                  icon={<ShuffleIcon />}
                  ariaLabel="Start a Conversation"
                  className="mx-auto"
                >
                  Start a Conversation
                </PrimaryButton>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ShuffleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M2.5 5.5h2.75c1.4 0 2.6 1 3.4 2.3"
        stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M11.35 12.2c.8 1.3 2 2.3 3.4 2.3h2.75"
        stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M2.5 14.5h2.75c2 0 3.5-2 5-4.5s3-4.5 5-4.5h2.25"
        stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M15.5 3.5l2 2-2 2M15.5 12.5l2 2-2 2"
        stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
