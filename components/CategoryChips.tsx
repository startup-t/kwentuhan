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
      {/* Edge fade (right) — hints that there's more to scroll */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8"
        style={{
          background:
            "linear-gradient(to left, var(--kw-bg) 0%, rgba(238,234,246,0) 100%)",
        }}
      />
      <div
        className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1 md:gap-3 md:px-0 lg:gap-2 lg:pb-2"
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
