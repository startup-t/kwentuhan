"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Level, Mode } from "@/lib/types";
import { LEVEL_CONFIG } from "@/lib/types";
import { clearQuestionCache } from "@/lib/questions";
import categoriesData from "@/data/categories.json";
import FollowUpQuestionCard from "./FollowUpQuestionCard";

interface Props {
  onClose: () => void;
  /** Called after a question is successfully published. */
  onSubmit?: (id: string) => void;
}

type CategoryMeta = { label: string; emoji: string; mode: Mode; cluster: string };
const CATEGORIES = categoriesData as Record<string, CategoryMeta>;

const HOOK_MIN = 8;
const HOOK_MAX = 220;
const DEEP_MAX = 220;
const USERNAME_MAX = 24;
const LEVELS: Level[] = ["light", "deep", "wild"];

const STORAGE_KEY = "kw.lastContribution";

/**
 * Short helper line under each Vibe pill so first-time contributors know what
 * "Wild" actually means. Keyed by Level — see lib/types.ts.
 */
const VIBE_HINTS: Record<Level, string> = {
  light: "every day",
  deep: "real talk",
  wild: "edge it up",
};

/**
 * Rotating placeholder examples — gives the user a sense of the RANGE of
 * questions the deck accepts. Picked at random per mode on each modal mount.
 * Keep these tight and on-brand: specific, story-prompting, never yes/no.
 */
const PLACEHOLDER_EXAMPLES: Record<Mode, string[]> = {
  solo: [
    "Anong moment recently na akala mo end of the world, pero ngayon tinatawanan mo na lang?",
    "Sino yung version mo dati na nami-miss mo pa rin?",
    "Kailan ka huling nag-iyak na hindi mo alam kung bakit?",
    "Anong sikreto mong unhealthy habit na alam mong dapat itigil?",
    "Ano yung tagal mo nang gusto sabihin sa pamilya mo pero hindi mo masabi?",
  ],
  group: [
    "Anong pinaka-cringe na ginawa mo noong high school?",
    "Sino sa atin yung pinaka-likely mag-viral sa wrong reason?",
    "Anong sinabi mo while drunk na pinagsisihan mo kinabukasan?",
    "Sa lahat ng barkada, sino yung pinaka-likely makasal una?",
    "Anong nangyari sa first date mo na palaging naaalala ng kasama mo?",
  ],
};

function pickPlaceholder(mode: Mode): string {
  const pool = PLACEHOLDER_EXAMPLES[mode];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Lightweight content-quality check on the hook. Returns a nudge string when
 * the question looks like it'll generate weak responses, or null when it's
 * fine. Detection rules are intentionally simple — false positives are okay
 * because the user can ignore the tip and submit anyway.
 */
function qualityNudge(hook: string): string | null {
  const t = hook.trim().toLowerCase();
  if (t.length < 8) return null; // too short to assess

  // Yes/no triggers — questions starting with these tend to get one-word answers
  if (/^(is|are|do you|did you|have you|will you|can you|should|would|could|was|were)\b/.test(t)) {
    return "Try opening with “What”, “Anong”, “Sino”, or “Kailan” — yes/no questions rarely get stories.";
  }

  // Multiple questions in one (more than one "?" or " at " connector)
  const questionMarks = (t.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    return "Pick one question — combined prompts make players freeze on which part to answer.";
  }

  // Vague philosophical (matches "what is happiness", "ano ang totoong tagumpay", etc.)
  if (/^(what is|what's|ano ang|ano yung)\s+(love|happiness|life|truth|success|peace|family|home|tagumpay|kaligayahan|buhay|tunay)/.test(t)) {
    return "Try a specific moment instead — e.g. “Anong moment recently na…” — abstract prompts feel like essays.";
  }

  return null;
}

export default function AddQuestionModal({ onClose, onSubmit }: Props) {
  const [hook, setHook] = useState("");
  const [deepDive, setDeepDive] = useState("");
  const [mode, setMode] = useState<Mode>("solo");
  const [level, setLevel] = useState<Level>("light");
  const [category, setCategory] = useState<string>("selfCheck");
  const [username, setUsername] = useState("");
  const [stage, setStage] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // Pick a single placeholder example on mount + when mode changes. Random
  // selection from the per-mode pool gives users a sense of the deck's range
  // without committing them to any single example.
  const [placeholder, setPlaceholder] = useState<string>(() => pickPlaceholder("solo"));
  useEffect(() => {
    setPlaceholder(pickPlaceholder(mode));
  }, [mode]);
  // Snapshot of the just-published question so the success state can render
  // even after the form fields are reset.
  const [published, setPublished] = useState<{
    id: string;
    hook: string;
    mode: Mode;
    category: string;
    level: Level;
  } | null>(null);

  // ESC closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Categories filtered by current mode
  const categoriesForMode = useMemo(() =>
    Object.entries(CATEGORIES)
      .filter(([, meta]) => meta.mode === mode)
      .map(([key, meta]) => ({ key, ...meta })),
    [mode]
  );

  // Keep category aligned with mode
  useEffect(() => {
    if (!categoriesForMode.find((c) => c.key === category)) {
      setCategory(categoriesForMode[0]?.key ?? (mode === "solo" ? "selfCheck" : "barkada"));
    }
  }, [mode, category, categoriesForMode]);

  const trimmedHook = hook.trim();
  const trimmedDeep = deepDive.trim();
  const trimmedUsername = username.trim().replace(/^@+/, "");
  const tooShort = trimmedHook.length < HOOK_MIN;

  const handleSubmit = useCallback(async () => {
    if (tooShort || stage === "submitting") return;
    setStage("submitting");
    setErrorMsg("");

    const meta = CATEGORIES[category];
    const cluster = meta?.cluster ?? (mode === "solo" ? "solo" : "social");
    const contributorUsername = trimmedUsername.length > 0
      ? `@${trimmedUsername}`
      : "Community Contributor";

    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook: trimmedHook,
          deepDive: trimmedDeep,
          level,
          category,
          mode,
          cluster,
          contributorUsername,
          language: "en",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(typeof data?.error === "string" ? data.error : "Couldn't publish your question. Try again.");
        setStage("error");
        return;
      }

      // Remember last submission so we can show "yours appears here" hints in the future.
      try {
        if (data?.question?.id) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            id: data.question.id,
            hook: trimmedHook,
            mode,
            category,
            createdAt: Date.now(),
          }));
        }
      } catch { /* private mode — ignore */ }

      // Drop the client question cache so the new row appears in the very
      // next getQuestions() call (e.g. landing screen's deck count).
      clearQuestionCache();

      // Capture a snapshot for the success state. Don't auto-close —
      // the follow-up card needs time to render and be read.
      const newId = typeof data?.question?.id === "string" ? data.question.id : "";
      setPublished({ id: newId, hook: trimmedHook, mode, category, level });
      onSubmit?.(newId);
      setStage("done");
    } catch (err) {
      console.error("[AddQuestionModal] failed:", err);
      setErrorMsg("No internet connection. Try again in a moment.");
      setStage("error");
    }
  }, [
    tooShort, stage, trimmedHook, trimmedDeep, trimmedUsername,
    mode, category, level, onSubmit,
  ]);

  return (
    <div
      className="kw-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Contribute a question"
    >
      <div
        className="kw-sheet w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--kw-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <h3 className="font-bold text-base" style={{ color: "var(--kw-text)" }}>
            Contribute a Question
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center btn-secondary text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Done state */}
        {stage === "done" && published ? (
          <PublishedSuccess
            published={published}
            onClose={onClose}
          />
        ) : (
          <div className="px-6 pb-6 flex flex-col gap-4 max-h-[72vh] overflow-y-auto">
            <p className="text-[0.8125rem]" style={{ color: "var(--kw-subtext)" }}>
              Your question goes live instantly and joins the deck for everyone.
            </p>

            {/* Mode toggle */}
            <Field label="Mode">
              <div className="grid grid-cols-2 gap-2">
                <Pill active={mode === "solo"} onClick={() => setMode("solo")}>
                  👤 Solo
                </Pill>
                <Pill active={mode === "group"} onClick={() => setMode("group")}>
                  👥 Group
                </Pill>
              </div>
            </Field>

            {/* Category */}
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--kw-surface-alt)",
                  border: "1.5px solid var(--kw-border)",
                  color: "var(--kw-text)",
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundImage:
                    "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg width='12' height='8' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238B87A8' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  paddingRight: "2rem",
                }}
              >
                {categoriesForMode.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Level — labels include a tiny secondary hint so newcomers
             *   actually know what "Wild" means before tapping it. */}
            <Field label="Vibe">
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((lv) => {
                  const cfg = LEVEL_CONFIG[lv];
                  return (
                    <Pill key={lv} active={level === lv} onClick={() => setLevel(lv)}>
                      <span className="flex flex-col items-center leading-tight">
                        <span>{cfg.emoji} {cfg.label}</span>
                        <span
                          className="text-[0.625rem] font-normal opacity-80 mt-0.5"
                          style={{
                            color: level === lv ? "rgba(255,255,255,0.85)" : "var(--kw-muted)",
                          }}
                        >
                          {VIBE_HINTS[lv]}
                        </span>
                      </span>
                    </Pill>
                  );
                })}
              </div>
            </Field>

            {/* Hook */}
            <Field label="The question" hint={`${trimmedHook.length}/${HOOK_MAX}`}>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value.slice(0, HOOK_MAX))}
                placeholder={`e.g. ${placeholder}`}
                autoFocus
                rows={3}
                className="w-full rounded-2xl px-4 py-3 text-[0.9375rem] leading-snug resize-none outline-none"
                style={{
                  background: "var(--kw-surface-alt)",
                  border: "1.5px solid var(--kw-border)",
                  color: "var(--kw-text)",
                  minHeight: 86,
                }}
              />
              {/* Quality nudge — fires when the hook looks like it'll
               *   generate weak (yes/no, multi-part, or vague) answers.
               *   Non-blocking: it's a tip, not a validation. */}
              {(() => {
                const tip = qualityNudge(trimmedHook);
                if (!tip) return null;
                return (
                  <p
                    className="text-[0.6875rem] mt-1.5 flex items-start gap-1.5"
                    style={{ color: "var(--kw-subtext)" }}
                  >
                    <span aria-hidden>💡</span>
                    <span>{tip}</span>
                  </p>
                );
              })()}
            </Field>

            {/* Deep dive */}
            <Field label="Follow-up (optional)" hint={`${trimmedDeep.length}/${DEEP_MAX}`}>
              <textarea
                value={deepDive}
                onChange={(e) => setDeepDive(e.target.value.slice(0, DEEP_MAX))}
                placeholder="A deeper version that the host can ask next"
                rows={2}
                className="w-full rounded-2xl px-4 py-3 text-[0.9375rem] leading-snug resize-none outline-none"
                style={{
                  background: "var(--kw-surface-alt)",
                  border: "1.5px solid var(--kw-border)",
                  color: "var(--kw-text)",
                  minHeight: 64,
                }}
              />
            </Field>

            {/* Username */}
            <Field
              label="Your handle (optional)"
              hint={trimmedUsername.length > 0 ? `@${trimmedUsername}` : "Stay anonymous"}
            >
              <div
                className="flex items-center rounded-xl px-3"
                style={{
                  background: "var(--kw-surface-alt)",
                  border: "1.5px solid var(--kw-border)",
                }}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--kw-muted)" }}>@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.slice(0, USERNAME_MAX).replace(/^@+/, ""))}
                  placeholder="yourhandle"
                  className="flex-1 bg-transparent py-2.5 px-2 text-sm outline-none"
                  style={{ color: "var(--kw-text)" }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </Field>

            {/* Error */}
            {stage === "error" && errorMsg && (
              <div
                className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
                style={{ background: "var(--kw-wild-soft)", color: "var(--kw-wild-text)" }}
              >
                <span className="shrink-0">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={tooShort || stage === "submitting"}
                className="btn-primary w-full py-[1.0625rem] text-[0.9375rem] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stage === "submitting" ? (
                  <>
                    <Spinner />
                    <span>Publishing…</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Publish question</span>
                  </>
                )}
              </button>
              <p className="text-[0.6875rem] text-center" style={{ color: "var(--kw-muted)" }}>
                Goes live immediately. Be kind, be curious, be real.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────── post-publish success state ────────── */

interface PublishedSuccessProps {
  published: { id: string; hook: string; mode: Mode; category: string; level: Level };
  onClose: () => void;
}

function PublishedSuccess({ published, onClose }: PublishedSuccessProps) {
  const { id, hook, mode, category, level } = published;
  const catMeta = CATEGORIES[category];
  const lvl = LEVEL_CONFIG[level];

  const router = useRouter();
  // Single guard prevents double-navigation if the user double-taps or fires
  // both buttons in quick succession.
  const navigatedRef = useRef(false);
  const [navigatingTo, setNavigatingTo] = useState<"view" | "answer" | null>(null);
  const hasId = id.length > 0;

  const handleView = useCallback(() => {
    if (!hasId || navigatedRef.current) return;
    navigatedRef.current = true;
    setNavigatingTo("view");
    router.push(`/q/${encodeURIComponent(id)}`);
    onClose();
  }, [hasId, id, onClose, router]);

  const handleAnswer = useCallback(() => {
    if (!hasId || navigatedRef.current) return;
    navigatedRef.current = true;
    setNavigatingTo("answer");
    // ?answer=1 → KwentoForm auto-focuses + scrolls into view on mount.
    router.push(`/q/${encodeURIComponent(id)}?answer=1`);
    onClose();
  }, [hasId, id, onClose, router]);

  return (
    <div className="px-6 pb-6 flex flex-col gap-4 max-h-[72vh] overflow-y-auto">
      {/* Celebration row */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-2xl" aria-hidden>🎉</span>
        <div className="flex flex-col">
          <p className="text-[0.9375rem] font-bold" style={{ color: "var(--kw-text)" }}>
            Live na ang kwento mo!
          </p>
          <p className="text-[0.6875rem]" style={{ color: "var(--kw-subtext)" }}>
            Anyone playing {mode === "solo" ? "Solo" : "Group"} → {catMeta?.label ?? category} can see it next.
          </p>
        </div>
      </div>

      {/* Published question — primary card */}
      <div
        className="kw-card kw-slide-up p-4 flex flex-col gap-2"
        style={{
          background: lvl?.cardBg ?? "var(--kw-surface)",
          border: `1px solid ${lvl?.cardBorder ?? "var(--kw-border-solid)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[0.625rem] font-bold uppercase tracking-[0.18em] inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: lvl?.bg, color: lvl?.color }}
          >
            <span aria-hidden>{lvl?.emoji}</span>
            <span>{lvl?.label}</span>
          </span>
          {catMeta && (
            <span
              className="text-[0.625rem] font-semibold inline-flex items-center gap-1"
              style={{ color: "var(--kw-subtext)" }}
            >
              <span aria-hidden>{catMeta.emoji}</span>
              <span>{catMeta.label}</span>
            </span>
          )}
        </div>
        <p
          className="text-[1rem] font-bold leading-snug"
          style={{ fontFamily: "var(--font-playfair), serif", color: "var(--kw-text)" }}
        >
          {hook}
        </p>
      </div>

      {/* Generated follow-up — secondary, threaded card */}
      <FollowUpQuestionCard hook={hook} mode={mode} category={category} />

      {/* Primary actions: View + Answer — side by side */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={handleView}
          disabled={!hasId || navigatedRef.current}
          aria-label="View question"
          className="py-[0.9375rem] text-[0.9375rem] font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--kw-surface)",
            color: "var(--kw-accent)",
            border: "1.5px solid var(--kw-accent)",
          }}
        >
          {navigatingTo === "view" ? <Spinner accent /> : <span aria-hidden>👁️</span>}
          <span>View</span>
        </button>
        <button
          type="button"
          onClick={handleAnswer}
          disabled={!hasId || navigatedRef.current}
          aria-label="Answer this question"
          className="btn-primary py-[0.9375rem] text-[0.9375rem] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {navigatingTo === "answer" ? <Spinner /> : <span aria-hidden>✍️</span>}
          <span>Answer</span>
        </button>
      </div>

      {!hasId && (
        <p className="text-[0.6875rem] text-center" style={{ color: "var(--kw-wild-text)" }}>
          Question saved, but its link couldn&apos;t be loaded. Tap Done and try refreshing.
        </p>
      )}

      {/* Done — tertiary, dismiss-only */}
      <button
        type="button"
        onClick={onClose}
        className="text-sm font-medium text-center transition-colors py-1"
        style={{ color: "var(--kw-subtext)" }}
      >
        Done
      </button>
    </div>
  );
}

/* ────────── form helpers ────────── */

function Field({
  label,
  hint,
  children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[0.6875rem] font-bold uppercase tracking-widest"
          style={{ color: "var(--kw-label)" }}
        >
          {label}
        </span>
        {hint && (
          <span className="text-[0.6875rem]" style={{ color: "var(--kw-muted)" }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold py-2 rounded-xl transition-all"
      style={{
        background: active ? "var(--kw-accent)" : "var(--kw-surface-alt)",
        color: active ? "#fff" : "var(--kw-subtext)",
        border: `1.5px solid ${active ? "var(--kw-accent)" : "var(--kw-border)"}`,
        boxShadow: active ? "0 4px 14px rgba(108,92,231,0.25)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function Spinner({ accent = false }: { accent?: boolean } = {}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid ${accent ? "var(--kw-accent)" : "white"}`,
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}
