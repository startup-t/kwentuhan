"use client";

import type { Mode } from "@/lib/types";

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

function UsersIcon({ tone }: { tone: "light" | "muted" }) {
  const fill = tone === "light" ? "#FFFFFF" : "#9B97BB";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill={fill}
        d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
      <path fill={fill}
        d="M2 19c0-3 2.7-5 6-5s6 2 6 5v1H2v-1Zm13-4.5c2.3.6 4 2.4 4 4.5v1h-4v-1c0-1.7-.5-3.3-1.5-4.6.5-.05 1-.1 1.5 0Z"/>
    </svg>
  );
}

function UserIcon({ tone }: { tone: "light" | "muted" }) {
  const fill = tone === "light" ? "#FFFFFF" : "#9B97BB";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill={fill} d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"/>
      <path fill={fill} d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6v1H4v-1Z"/>
    </svg>
  );
}

export default function PlayModeToggle({ mode, onChange }: Props) {
  const options = [
    { key: "group" as Mode, label: "Group Mode", Icon: UsersIcon },
    { key: "solo"  as Mode, label: "Solo Mode",  Icon: UserIcon  },
  ];

  return (
    <div role="tablist" aria-label="Play Mode" className="flex w-full gap-3 md:gap-4 lg:justify-start">
      {options.map(({ key, label, Icon }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`flex-1 inline-flex h-[3.25rem] cursor-pointer items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold transition-all duration-200 active:scale-[0.97] md:h-[3.5rem] md:text-base lg:hover:-translate-y-0.5 lg:hover:shadow-md ${
              active ? "text-white" : "text-[#6B6890]"
            }`}
            style={{
              WebkitTapHighlightColor: "transparent",
              ...(active
                ? {
                    background:
                      "linear-gradient(135deg,#7B5EE8 0%,#5B3FD0 100%)",
                    border: "none",
                    boxShadow:
                      "0 8px 22px rgba(108,92,231,0.38), inset 0 1px 0 rgba(255,255,255,0.18)",
                  }
                : {
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(200,195,230,0.55)",
                    boxShadow: "0 2px 8px rgba(108,92,231,0.05)",
                  }),
            }}
          >
            <Icon tone={active ? "light" : "muted"} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
