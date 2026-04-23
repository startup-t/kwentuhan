"use client";

import type { ReactNode } from "react";

interface Props {
  onClick:    () => void;
  children:   ReactNode;
  icon?:      ReactNode;
  ariaLabel?: string;
  className?: string;
}

export default function PrimaryButton({ onClick, children, icon, ariaLabel, className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`btn-primary inline-flex h-[3.5rem] w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl text-[1.0625rem] font-bold transition-all duration-200 active:scale-[0.985] lg:hover:-translate-y-0.5 lg:hover:shadow-xl ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
