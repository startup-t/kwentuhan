"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const SOFT_GLOW_AT = 280;
const HINT_AT      = 400;
const HARD_CAP     = 600;

export interface AnswerInputHandle {
  blur:  () => void;
  focus: () => void;
}

interface Props {
  value:    string;
  onChange: (next: string) => void;
  onFocus:  () => void;
  onBlur:   () => void;
}

const AnswerInput = forwardRef<AnswerInputHandle, Props>(function AnswerInput(
  { value, onChange, onFocus, onBlur },
  forwardedRef,
) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(forwardedRef, () => ({
    blur:  () => taRef.current?.blur(),
    focus: () => taRef.current?.focus(),
  }));

  // Auto-resize on every keystroke.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const len      = value.length;
  const showGlow = len >= SOFT_GLOW_AT;
  const showHint = len >= HINT_AT;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next.length > HARD_CAP ? next.slice(0, HARD_CAP) : next);
  }

  return (
    <div className="mt-3 flex flex-col items-end">
      <div
        className="relative max-w-[75%] rounded-[18px] px-4 py-3"
        style={{
          background: "var(--kw-chat-peach)",
          boxShadow:  showGlow ? "0 0 0 1px var(--kw-warn)" : "none",
          transition: "box-shadow 0.2s ease",
        }}
      >
        {/* Tail — pointing down-left */}
        <span
          aria-hidden
          className="absolute"
          style={{
            left:   -4,
            bottom: 4,
            width:  8,
            height: 8,
            background: "var(--kw-chat-peach)",
            transform:  "rotate(45deg)",
            borderBottomLeftRadius: 2,
          }}
        />
        <textarea
          ref={taRef}
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Kwento mo naman…"
          rows={1}
          className="block w-full resize-none bg-transparent outline-none placeholder:text-[rgba(42,24,16,0.4)]"
          style={{
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            fontSize:   "0.85rem",
            fontWeight: 500,
            lineHeight: 1.4,
            color:      "var(--kw-note-ink)",
          }}
        />
      </div>

      <p
        className="mt-2 text-right text-[0.6875rem]"
        style={{
          color:      "var(--kw-muted)",
          opacity:    showHint ? 1 : 0,
          minHeight:  14,
          transition: "opacity 0.2s ease",
        }}
        aria-live="polite"
      >
        Mahaba na ah — try Note style on the next screen.
      </p>
    </div>
  );
});

export default AnswerInput;
