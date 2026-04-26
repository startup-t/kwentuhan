"use client";

interface Props {
  value:    boolean;
  onChange: (next: boolean) => void;
}

export default function TeaserToggle({ value, onChange }: Props) {
  return (
    <label
      className="flex items-center justify-between gap-3 select-none"
      style={{ cursor: "pointer" }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold" style={{ color: "var(--kw-text)" }}>
          Share as teaser
        </span>
        <span className="text-[0.6875rem]" style={{ color: "var(--kw-muted)" }}>
          Blur your answer. Friends scan to read it.
        </span>
      </div>
      <span
        role="switch"
        aria-checked={value}
        tabIndex={0}
        onClick={() => onChange(!value)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!value);
          }
        }}
        style={{
          position:   "relative",
          width:      44,
          height:     26,
          borderRadius: 13,
          background: value ? "var(--kw-accent)" : "var(--kw-border-solid)",
          transition: "background 0.18s ease",
          flexShrink: 0,
          outline:    "none",
        }}
      >
        <span
          aria-hidden
          style={{
            position:   "absolute",
            top:        3,
            left:       value ? 21 : 3,
            width:      20,
            height:     20,
            borderRadius: 10,
            background: "white",
            boxShadow:  "0 2px 6px rgba(0,0,0,0.15)",
            transition: "left 0.18s ease",
          }}
        />
      </span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-hidden
      />
    </label>
  );
}
