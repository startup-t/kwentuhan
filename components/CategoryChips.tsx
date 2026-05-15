"use client";

import CategoryChip from "./CategoryChip";

export type CategoryTopic = {
  key: string;
  emoji: string;
  label: string;
  color: string;
};

interface Props {
  topics:   CategoryTopic[];
  selected: string;
  onSelect: (key: string) => void;
}

export default function CategoryChips({ topics, selected, onSelect }: Props) {
  return (
    <div className="relative">
      {/* Edge fade (right) — hints that there's more to scroll horizontally.
       *  Mobile/tablet only. On desktop (lg+) chips wrap to multiple rows so
       *  no scroll hint is needed (and the fade would just look like a bug). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 lg:hidden"
        style={{
          background:
            "linear-gradient(to left, var(--kw-bg) 0%, rgba(238,234,246,0) 100%)",
        }}
      />
      {/* Mobile/tablet: horizontal scroll with snap. Desktop: flex-wrap so all
       *  categories are visible at once in the sidebar — no hidden chips, no
       *  scroll dead-end (sidebars don't scroll horizontally with a mouse). */}
      <div
        className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1 md:gap-3 md:px-0 lg:flex-wrap lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-2"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {topics.map(({ key, emoji, label, color }) => (
          <div key={key} style={{ scrollSnapAlign: "start" }}>
            <CategoryChip
              label={label}
              emoji={emoji}
              color={color}
              active={selected === key}
              onClick={() => onSelect(key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
