"use client";

interface Props { onConfirm: () => void; onDeny: () => void; }

export default function AgeGateModal({ onConfirm, onDeny }: Props) {
  return (
    <div className="kw-overlay" onClick={onDeny}>
      <div className="kw-sheet" onClick={e => e.stopPropagation()}>

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background:"var(--kw-border)" }} />
        </div>

        <div className="flex flex-col items-center text-center px-7 pt-5 pb-7 gap-5">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
               style={{ background:"var(--kw-accent-soft)", border:"1.5px solid rgba(108,92,231,0.2)" }}>
            🎉
          </div>

          <div>
            <h3 className="font-bold text-xl mb-2" style={{ color:"var(--kw-text)" }}>
              Age Confirmation
            </h3>
            <p className="text-sm leading-relaxed" style={{ color:"var(--kw-subtext)" }}>
              Party Mode contains bold and playful content made for adults.
            </p>
          </div>

          {/* Warning badge */}
          <div className="text-sm font-semibold px-5 py-2.5 rounded-2xl w-full"
               style={{ background:"#FFECF1", color:"#E8527A", border:"1px solid rgba(232,82,122,0.2)" }}>
            🔞 &nbsp;Are you 18 years old or above?
          </div>

          {/* Buttons */}
          <div className="flex gap-3 w-full pt-1">
            <button
              onClick={onDeny}
              className="btn-secondary flex-1 py-3.5 text-sm"
            >
              No, go back
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary flex-1 py-3.5 text-sm"
            >
              Yes, I&apos;m 18+
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
