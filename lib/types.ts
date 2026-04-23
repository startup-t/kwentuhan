// lib/types.ts — Kwentuhan shared types

export type Level = "light" | "deep" | "wild";
export type Mode  = "solo"  | "group";

export interface Question {
  id:            number;
  hook:          string;
  deepDive:      string;
  level:         Level;
  levelLabel:    string;
  levelColor:    string;
  category:      string;
  categoryLabel: string;
  categoryEmoji: string;
  mode:          Mode;
  cluster:       string;
  isPersonal:    boolean;
  ageGated:      boolean;
}

export interface CategoryMeta {
  label:     string;
  emoji:     string;
  mode:      Mode;
  cluster:   string;
  tagline:   string;
  ageGated?: boolean;
}

export interface SessionState {
  mode:       Mode;
  category:   string | null;
  questions:  Question[];
  currentIdx: number;
  showDeep:   boolean;
  isFinished: boolean;
}

export const GROUP_CATEGORIES = [
  "barkada", "besties", "family",
  "loveLab", "dating",
  "work", "businessOwners", "startup",
  "party",
] as const;

export const SOLO_CATEGORIES = [
  "selfCheck", "reflect", "goals", "emotions",
  "memories", "values", "growth", "habits", "thoughts",
] as const;

export type GroupCategory = typeof GROUP_CATEGORIES[number];
export type SoloCategory  = typeof SOLO_CATEGORIES[number];

// iOS-matched level config with emoji prefix
export const LEVEL_CONFIG: Record<Level, {
  label:  string;
  emoji:  string;
  color:  string;
  bg:     string;
  border: string;
  cardBg: string;
  cardBorder: string;
}> = {
  light: {
    label: "Chill", emoji: "☀️",
    color: "#5B3FD0", bg: "#EEEAFF", border: "rgba(108,92,231,0.22)",
    cardBg: "linear-gradient(160deg,#F8F6FF 0%,#FDFCFF 100%)",
    cardBorder: "rgba(108,92,231,0.2)",
  },
  deep: {
    label: "Deep", emoji: "🌙",
    color: "#3B55C4", bg: "#EEF2FF", border: "rgba(59,85,196,0.22)",
    cardBg: "linear-gradient(160deg,#F6F8FF 0%,#FAFAFF 100%)",
    cardBorder: "rgba(59,130,246,0.25)",
  },
  wild: {
    label: "Wild", emoji: "🔥",
    color: "#C94020", bg: "#FFECE8", border: "rgba(232,82,122,0.24)",
    cardBg: "linear-gradient(160deg,#FFF8F6 0%,#FFFBFA 100%)",
    cardBorder: "rgba(232,82,122,0.25)",
  },
};

// Cluster accent + soft-bg palette
export const CLUSTER_COLOR: Record<string, { accent: string; bg: string }> = {
  social:   { accent:"#6C5CE7", bg:"#EDE9FF" },
  love:     { accent:"#E8527A", bg:"#FFECF1" },
  grind:    { accent:"#3B82F6", bg:"#EFF6FF" },
  wildcard: { accent:"#F59E0B", bg:"#FFFBEB" },
  solo:     { accent:"#10B981", bg:"#ECFDF5" },
  other:    { accent:"#6C5CE7", bg:"#EDE9FF" },
};
