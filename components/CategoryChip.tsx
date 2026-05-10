"use client";

/**
 * CategoryChip — the unified pill used by both Group and Solo modes.
 *
 * Minimal, Apple/SwiftUI-inspired:
 *   • Inactive: white surface, soft border, dark text
 *   • Active:   filled with the category's color (with gradient polish)
 *   • Tap feedback: subtle scale
 */

interface Props {
  label:    string;
  emoji:    string;
  color:    string;       // category accent color (hex / css color)
  active:   boolean;
  onClick:  () => void;
}

/** Darken a hex color by mixing it toward black — used to build the gradient. */
function darken(hex: string, amount = 0.22): string {
  const h = hex.replace("#", "");
  const n = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const mix = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Turn a hex color into an rgba string for translucent shadows. */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function CategoryChip({
  label, emoji, color, active, onClick,
}: Props) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="inline-flex h-[2.75rem] flex-shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[0.875rem] font-semibold transition-all duration-200 active:scale-95 md:h-12 md:px-5 md:text-[0.9375rem] lg:h-9 lg:px-3.5 lg:text-[0.8125rem] lg:hover:-translate-y-0.5 lg:hover:shadow-md"
      style={
        active
          ? {
              background:  `linear-gradient(135deg, ${color} 0%, ${darken(color)} 100%)`,
              color:       "white",
              border:      "none",
              boxShadow:   `0 4px 14px ${rgba(color, 0.3)}, inset 0 1px 0 rgba(255,255,255,0.15)`,
            }
          : {
              background:  "var(--kw-surface)",
              color:       "var(--kw-text)",
              border:      "1.5px solid var(--kw-border)",
              boxShadow:   "0 2px 6px rgba(0,0,0,0.04)",
            }
      }
    >
      <span className="text-[1rem] leading-none">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
