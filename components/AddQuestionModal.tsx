"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Level, Mode } from "@/lib/types";
import { LEVEL_CONFIG } from "@/lib/types";
import categoriesData from "@/data/categories.json";

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

export default function AddQuestionModal({ onClose, onSubmit }: Props) {
  const [hook, setHook] = useState("");
  const [deepDive, setDeepDive] = useState("");
  const [mode, setMode] = useState<Mode>("solo");
  const [level, setLevel] = useState<Level>("light");
  const [category, setCategory] = useState<string>("selfCheck");
  const [username, setUsername] = useState("");
  const [stage, setStage] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

      onSubmit?.(data?.question?.id ?? "");
      setStage("done");
      setTimeout(onClose, 1400);
    } catch (err) {
      console.error("[AddQuestionModal] failed:", err);
      setErrorMsg("No internet connection. Try again in a moment.");
      setStage("error");
    }
  }, [
    tooShort, stage, trimmedHook, trimmedDeep, trimmedUsername,
    mode, category, level, onSubmit, onClose,
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
        {stage === "done" ? (
          <div className="px-6 pb-8 pt-2 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-[0.9375rem] font-semibold" style={{ color: "var(--kw-text)" }}>
              Live na ang kwento mo!
            </p>
            <p className="text-xs mt-1.5 leading-snug max-w-[20rem] mx-auto" style={{ color: "var(--kw-subtext)" }}>
              Anyone playing {mode === "solo" ? "Solo" : "Group"} → {CATEGORIES[category]?.label ?? category} can see it next.
            </p>
          </div>
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

            {/* Level */}
            <Field label="Vibe">
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((lv) => {
                  const cfg = LEVEL_CONFIG[lv];
                  return (
                    <Pill key={lv} active={level === lv} onClick={() => setLevel(lv)}>
                      {cfg.emoji} {cfg.label}
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
                placeholder="e.g. Anong pinakamalaking risk na ginawa mo para sa pag-ibig?"
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

/* ────────── helpers ────────── */

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

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid white",
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}
