/**
 * Play Store screenshot renderer.
 *
 * Each route /play-store/1 .. /play-store/7 renders a single 1080×1920
 * composite ready to be screenshot for upload. Capture by setting the
 * preview viewport to exactly 1080×1920 and grabbing the page.
 *
 * NOT a public surface. This is a dev-only build asset; consider removing
 * the route or gating it behind a flag before any public launch.
 */

import { notFound } from "next/navigation";
import CaptureTrigger from "./CaptureTrigger";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ n: string }> };

interface ScreenSpec {
  headline: string;
  subtext: string;
  gradient: { from: string; to: string };
  glowColor: string;
  scene: () => React.ReactElement;
}

export default async function PlayStoreScreenshot({ params }: Props) {
  const { n } = await params;
  const idx = Number.parseInt(n, 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > 7) notFound();

  const spec = SCREENS[idx - 1];

  return (
    <main
      style={{
        position: "relative",
        width: 1080,
        height: 1920,
        overflow: "hidden",
        background: `linear-gradient(160deg, ${spec.gradient.from} 0%, ${spec.gradient.to} 100%)`,
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        color: "#1A1730",
      }}
    >
      <CaptureTrigger />

      {/* Soft radial glow behind the phone */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "58%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${spec.glowColor} 0%, transparent 70%)`,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Top text block — first 22% of the canvas */}
      <header
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          right: 80,
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 900,
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#1A1730",
            margin: 0,
          }}
        >
          {spec.headline}
        </h1>
        <p
          style={{
            marginTop: 22,
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.4,
            color: "rgba(26,23,48,0.65)",
            maxWidth: 880,
          }}
        >
          {spec.subtext}
        </p>
      </header>

      {/* Phone frame holding the actual UI */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 540,
          transform: "translateX(-50%)",
          width: 480,
          height: 980,
          borderRadius: 56,
          background: "#1A1730",
          padding: 14,
          boxShadow:
            "0 60px 120px rgba(108,82,227,0.25), 0 20px 40px rgba(0,0,0,0.15), inset 0 0 0 2px rgba(255,255,255,0.08)",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 44,
            overflow: "hidden",
            background: "#EEEAF6",
            position: "relative",
          }}
        >
          <spec.scene />
        </div>
      </div>

      {/* Bottom brand mark + page indicator */}
      <footer
        style={{
          position: "absolute",
          bottom: 48,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 700,
            fontSize: 28,
            color: "#6C52E3",
            letterSpacing: "-0.01em",
          }}
        >
          kwentuhan
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "rgba(26,23,48,0.35)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {idx} / 7
        </span>
      </footer>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   The 7 screen specs
   ────────────────────────────────────────────────────────────────────────── */

const SCREENS: ScreenSpec[] = [
  {
    headline: "Usapang totoo, walang husga.",
    subtext: "Real conversations that turn small talk into the real talk — solo o kasama ng barkada.",
    gradient: { from: "#FFF8F0", to: "#EEEAFF" },
    glowColor: "rgba(108,82,227,0.20)",
    scene: SceneLanding,
  },
  {
    headline: "Pick a vibe. Start the kwento.",
    subtext: "Barkada, Besties, Self Check, Goals — 18 categories tuned to whatever you need that night.",
    gradient: { from: "#EEEAFF", to: "#FFECF1" },
    glowColor: "rgba(232,82,122,0.16)",
    scene: SceneBrowse,
  },
  {
    headline: "May tanong ka? Sa deck na agad.",
    subtext: "Anyone can drop a question. It goes live instantly — walang waiting list, walang approval.",
    gradient: { from: "#FFF8F0", to: "#ECFDF5" },
    glowColor: "rgba(16,185,129,0.18)",
    scene: SceneContribute,
  },
  {
    headline: "React mo agad. Pakiramdam mo, pakita mo.",
    subtext: "🤣 😱 💀 ❤️ 🔥 — one tap lets someone know their kwento hit.",
    gradient: { from: "#FFEFE6", to: "#EDE9FF" },
    glowColor: "rgba(232,82,122,0.18)",
    scene: SceneReact,
  },
  {
    headline: "Stories-ready. Group-chat-ready.",
    subtext: "Download the kwento card or send it straight to WhatsApp, Messenger, or your story.",
    gradient: { from: "#EDE9FF", to: "#EFF6FF" },
    glowColor: "rgba(108,82,227,0.20)",
    scene: SceneShare,
  },
  {
    headline: "Every kwento is from someone real.",
    subtext: "Mga sariling tanong ng community — at next time, baka sa'yo na ang next question.",
    gradient: { from: "#FFF8F0", to: "#FFFBEB" },
    glowColor: "rgba(245,158,11,0.18)",
    scene: SceneCommunity,
  },
  {
    headline: "Tara. Usap tayo.",
    subtext: "Free to play. No login. Walang ads. Just better questions, better kwento.",
    gradient: { from: "#FFF8F0", to: "#EEEAFF" },
    glowColor: "rgba(108,82,227,0.28)",
    scene: SceneClosing,
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Scene 1 — Landing
   ────────────────────────────────────────────────────────────────────────── */
function SceneLanding() {
  return (
    <div
      style={{
        height: "100%",
        padding: "60px 28px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: "linear-gradient(135deg, #6C52E3, #5B3FD0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
        }}
      >
        💬
      </div>
      <h2
        style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontWeight: 900,
          fontSize: 44,
          color: "#1A1730",
          margin: "16px 0 4px",
          letterSpacing: "-0.02em",
        }}
      >
        kwentuhan
      </h2>
      <p style={{ fontSize: 14, color: "#9B97BB" }}>usapang totoo, kasama mo.</p>

      <Label style={{ marginTop: 32 }}>PLAY MODE</Label>
      <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8 }}>
        <Pill active>👥 Group Mode</Pill>
        <Pill>👤 Solo Mode</Pill>
      </div>

      <Label style={{ marginTop: 18 }}>CATEGORY</Label>
      <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8, flexWrap: "wrap" }}>
        <Chip active>🎲 Random</Chip>
        <Chip>👯 Barkada</Chip>
        <Chip>🫂 Besties</Chip>
      </div>

      <div style={{ marginTop: 22, fontSize: 13, color: "#B0ABC8" }}>
        📋 281 questions in deck
      </div>

      <PrimaryButton style={{ marginTop: 22 }}>🔀 Start a Conversation</PrimaryButton>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Scene 2 — Browse (categories visible)
   ────────────────────────────────────────────────────────────────────────── */
function SceneBrowse() {
  return (
    <div style={{ height: "100%", padding: "60px 28px 28px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <p
        style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontWeight: 700,
          fontSize: 26,
          color: "#6C52E3",
        }}
      >
        kwentuhan
      </p>
      <p style={{ fontSize: 12, color: "#9B97BB", marginBottom: 22 }}>usapang totoo, kasama mo.</p>

      <Label>PLAY MODE</Label>
      <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8, marginBottom: 18 }}>
        <Pill active>👥 Group Mode</Pill>
        <Pill>👤 Solo Mode</Pill>
      </div>

      <Label>CATEGORY</Label>
      <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8, flexWrap: "wrap" }}>
        <Chip active>🎲 Random</Chip>
        <Chip>👯 Barkada</Chip>
        <Chip>🫂 Besties</Chip>
        <Chip>🏠 Pamilya</Chip>
        <Chip>💑 Couple</Chip>
        <Chip>💌 Dating</Chip>
        <Chip>💼 Trabaho</Chip>
        <Chip>🧾 Negosyo</Chip>
        <Chip>🚀 Startup</Chip>
        <Chip>🎉 Party</Chip>
      </div>

      <div style={{ marginTop: 20, fontSize: 13, color: "#B0ABC8" }}>
        📋 281 questions in deck
      </div>

      <PrimaryButton style={{ marginTop: 20 }}>🔀 Start a Conversation</PrimaryButton>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Scene 3 — Contribute modal
   ────────────────────────────────────────────────────────────────────────── */
function SceneContribute() {
  return (
    <div style={{ height: "100%", background: "rgba(26,23,48,0.55)", padding: "60px 24px 24px", display: "flex", alignItems: "flex-end" }}>
      <div style={{ width: "100%", background: "#fff", borderRadius: 28, padding: "20px 22px 22px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: "#DAD4EA" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: 17, color: "#1A1730" }}>Contribute a Question</h3>
          <span style={{ width: 28, height: 28, borderRadius: 10, background: "#F3F0FA", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#8B87A8", fontSize: 12 }}>✕</span>
        </div>

        <Label small>MODE</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
          <Pill small>👤 Solo</Pill>
          <Pill small active>👥 Group</Pill>
        </div>

        <Label small>CATEGORY</Label>
        <div style={{ marginTop: 6, marginBottom: 14, padding: "10px 12px", borderRadius: 12, background: "#F3F0FA", border: "1.5px solid rgba(200,195,230,0.5)", color: "#1A1730", fontSize: 14, fontWeight: 500 }}>
          👯 Barkada
        </div>

        <Label small>VIBE</Label>
        <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
          <VibePill emoji="☀️" label="Chill" hint="every day" />
          <VibePill emoji="🌙" label="Deep" hint="real talk" />
          <VibePill emoji="🔥" label="Wild" hint="edge it up" active />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <Label small>THE QUESTION</Label>
          <span style={{ fontSize: 11, color: "#B0ABC8" }}>52/220</span>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: 16, background: "#F3F0FA", border: "1.5px solid rgba(200,195,230,0.5)", color: "#1A1730", fontSize: 15, lineHeight: 1.4, fontFamily: "var(--font-kalam), cursive" }}>
          Anong pinaka-cringe na ginawa mo noong high school?
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: "#8B87A8", display: "flex", gap: 6 }}>
          <span>💡</span>
          <span>Looking good — specific moments make for the best stories.</span>
        </p>

        <PrimaryButton style={{ marginTop: 16, fontSize: 14, padding: "14px 18px" }}>✨ Publish question</PrimaryButton>
        <p style={{ marginTop: 10, fontSize: 11, color: "#B0ABC8", textAlign: "center" }}>
          Goes live immediately. Be kind, be curious, be real.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Scene 4 — React (Scan-to-Reveal centerpiece)
   ────────────────────────────────────────────────────────────────────────── */
function SceneReact() {
  return (
    <div style={{ height: "100%", padding: "44px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: 18, color: "#6C52E3" }}>kwentuhan</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#5B3FD0", background: "#EEEAFF", padding: "4px 12px", borderRadius: 100, letterSpacing: "0.04em" }}>☀️ CHILL</span>
      </div>

      {/* Question card */}
      <div style={{ background: "linear-gradient(160deg,#F8F6FF 0%,#FDFCFF 100%)", border: "1px solid rgba(108,92,231,0.2)", borderRadius: 20, padding: "16px 18px" }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "#8B87A8", textTransform: "uppercase", marginBottom: 8 }}>🤔 SELF CHECK</p>
        <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: 18, lineHeight: 1.3, color: "#1A1730" }}>
          Anong moment recently na akala mo end of the world, pero ngayon tinatawanan mo na lang?
        </p>
      </div>

      {/* Reveal card */}
      <div style={{ background: "#fff", border: "1px solid rgba(200,195,230,0.5)", borderRadius: 20, padding: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,92,231,0.18) 0%, transparent 70%)", filter: "blur(8px)" }} />
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#6C52E3", textTransform: "uppercase" }}>✨ a kwento for you</p>
        <p style={{ marginTop: 12, fontFamily: "var(--font-kalam), cursive", fontSize: 15, lineHeight: 1.5, color: "#2A1810" }}>
          Honestly, akala ko hindi ako makaka-recover. Pero now I&apos;m laughing at the WhatsApp draft I never sent.
        </p>
        <p style={{ marginTop: 10, fontSize: 11, fontStyle: "italic", textAlign: "right", color: "#8B87A8", fontFamily: "var(--font-playfair), Georgia, serif" }}>— someone, anonymously</p>

        {/* Reaction row */}
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {[
            { emoji: "🤣", active: false },
            { emoji: "😱", active: false },
            { emoji: "💀", active: true },
            { emoji: "❤️", active: false },
            { emoji: "🔥", active: false },
          ].map((r) => (
            <div
              key={r.emoji}
              style={{
                flex: 1,
                padding: "8px 0",
                textAlign: "center",
                fontSize: 18,
                borderRadius: 14,
                background: r.active ? "#EDE9FF" : "transparent",
                border: `1px solid ${r.active ? "#6C52E3" : "rgba(200,195,230,0.5)"}`,
                opacity: r.active ? 1 : 0.55,
                filter: r.active ? "none" : "saturate(0.85)",
              }}
            >
              {r.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Sagutin form preview */}
      <div style={{ background: "#fff", border: "1px solid rgba(200,195,230,0.5)", borderRadius: 20, padding: 18 }}>
        <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: 16, color: "#1A1730" }}>
          Sagutin mo rin ✍️
        </p>
        <p style={{ fontSize: 12, color: "#8B87A8", marginTop: 2 }}>
          Pass it on. Walang nakakaalam, walang husga.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Scene 5 — Share preview
   ────────────────────────────────────────────────────────────────────────── */
function SceneShare() {
  return (
    <div style={{ height: "100%", padding: "44px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <h3 style={{ fontWeight: 700, fontSize: 17, color: "#1A1730", marginBottom: 4 }}>Preview</h3>

      {/* Story card thumbnail */}
      <div
        style={{
          width: 240,
          height: 420,
          borderRadius: 18,
          background: "linear-gradient(160deg,#F8F6FF 0%,#FFF4F7 100%)",
          padding: 14,
          boxShadow: "0 8px 32px rgba(108,92,231,0.18)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: 14, color: "#6C52E3" }}>kwentuhan</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#5B3FD0", background: "#EEEAFF", padding: "3px 8px", borderRadius: 100 }}>☀️ CHILL</span>
        </div>
        <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#1A1730" }}>
          Anong pinaka-cringe na ginawa mo noong high school?
        </p>
        <div style={{ background: "#FFEFE6", borderRadius: 14, padding: 12, fontFamily: "var(--font-kalam), cursive", fontSize: 13, color: "#2A1810", lineHeight: 1.4 }}>
          Nag-confess ako kay crush via group GC. Daming naka-screenshot.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
          <div style={{ width: 70, height: 70, background: "#fff", borderRadius: 8, padding: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <QrPattern />
          </div>
        </div>
      </div>

      {/* Style chips */}
      <div style={{ display: "flex", gap: 8 }}>
        {["Chat", "Quote", "Note"].map((s, i) => (
          <span
            key={s}
            style={{
              padding: "8px 14px",
              borderRadius: 100,
              background: i === 0 ? "#EDE9FF" : "#F3F0FA",
              border: `1px solid ${i === 0 ? "#6C52E3" : "rgba(200,195,230,0.5)"}`,
              color: i === 0 ? "#5B3FD0" : "#8B87A8",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Download CTA */}
      <PrimaryButton style={{ width: "100%", marginTop: 8 }}>Download card</PrimaryButton>

      {/* Social row */}
      <div style={{ display: "flex", gap: 18, marginTop: 4 }}>
        {[
          { bg: "#1877F2", label: "f" },
          { bg: "linear-gradient(135deg,#F58529,#DD2A7B 45%,#8134AF 75%,#515BD4)", label: "○" },
          { bg: "linear-gradient(135deg,#00B2FF,#006AFF 60%,#8E33FF)", label: "M" },
        ].map((p, i) => (
          <span
            key={i}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: p.bg,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(0,0,0,0.14)",
            }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Scene 6 — Community (Question by @handle)
   ────────────────────────────────────────────────────────────────────────── */
function SceneCommunity() {
  const handles = ["@bea", "@joaqs", "@markk"];
  return (
    <div style={{ height: "100%", padding: "44px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: 18, color: "#6C52E3" }}>kwentuhan</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#C94020", background: "#FFECE8", padding: "4px 12px", borderRadius: 100, letterSpacing: "0.04em" }}>🔥 WILD</span>
      </div>

      <p style={{ fontSize: 13, color: "#8B87A8", textAlign: "center", marginTop: 4 }}>
        Question 14 of 30
      </p>

      <div
        style={{
          background: "linear-gradient(160deg,#FFF8F6 0%,#FFFBFA 100%)",
          border: "1px solid rgba(232,82,122,0.25)",
          borderRadius: 24,
          padding: "26px 22px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", color: "#8B87A8", textTransform: "uppercase", marginBottom: 14 }}>👯 BARKADA</p>
        <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: 22, lineHeight: 1.3, color: "#1A1730" }}>
          Sino sa atin yung pinaka-likely mag-viral sa wrong reason?
        </p>

        {/* Highlighted contributor attribution */}
        <div style={{ marginTop: 18, padding: "8px 12px", background: "rgba(255,251,180,0.55)", borderRadius: 10, alignSelf: "flex-start" }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#8B87A8" }}>
            Question by{" "}
            <span style={{ color: "#6C52E3", fontWeight: 700 }}>@ysha</span>
          </p>
        </div>

        <div style={{ flex: 1 }} />

        <p style={{ fontSize: 11, color: "#B0ABC8", textAlign: "center" }}>
          → swipe for next
        </p>
      </div>

      {/* Floating mentions hinting at the community */}
      <div style={{ display: "flex", justifyContent: "space-around", padding: "0 12px" }}>
        {handles.map((h, i) => (
          <span
            key={h}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#6C52E3",
              opacity: 0.55 - i * 0.1,
              fontFamily: "var(--font-dm-sans), system-ui",
            }}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Scene 7 — Closing CTA
   ────────────────────────────────────────────────────────────────────────── */
function SceneClosing() {
  return (
    <div style={{ height: "100%", padding: "80px 28px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 26,
          background: "linear-gradient(135deg, #6C52E3, #5B3FD0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 52,
          boxShadow: "0 12px 40px rgba(108,82,227,0.4)",
        }}
      >
        💬
      </div>
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 900,
            fontSize: 46,
            color: "#1A1730",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          kwentuhan
        </h2>
        <p style={{ fontSize: 15, color: "#8B87A8", marginTop: 8 }}>
          usapang totoo, kasama mo.
        </p>
      </div>

      <PrimaryButton style={{ marginTop: 10, fontSize: 16, padding: "18px 36px", width: "100%" }}>
        ✨ Install Kwentuhan
      </PrimaryButton>

      <p style={{ fontSize: 12, color: "#B0ABC8", marginTop: -4 }}>
        or play web at <span style={{ color: "#6C52E3", fontWeight: 600 }}>kwentuhan.cards</span>
      </p>

      <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 22, opacity: 0.55 }}>
        <span>☀️</span>
        <span>🌙</span>
        <span>🔥</span>
        <span>👯</span>
        <span>🪞</span>
        <span>💑</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Tiny shared bits
   ────────────────────────────────────────────────────────────────────────── */

function Label({ children, style, small }: { children: React.ReactNode; style?: React.CSSProperties; small?: boolean }) {
  return (
    <p
      style={{
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#9B97BB",
        alignSelf: "flex-start",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function Pill({ active, children, small }: { active?: boolean; children: React.ReactNode; small?: boolean }) {
  return (
    <span
      style={{
        flex: 1,
        padding: small ? "9px 0" : "12px 0",
        textAlign: "center",
        borderRadius: 100,
        background: active ? "#6C52E3" : "#fff",
        color: active ? "#fff" : "#8B87A8",
        border: `1.5px solid ${active ? "#6C52E3" : "rgba(200,195,230,0.6)"}`,
        fontWeight: 700,
        fontSize: small ? 13 : 14,
        boxShadow: active ? "0 4px 14px rgba(108,92,231,0.25)" : "none",
      }}
    >
      {children}
    </span>
  );
}

function Chip({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: "10px 14px",
        borderRadius: 100,
        background: active ? "#6C52E3" : "#fff",
        color: active ? "#fff" : "#1A1730",
        border: `1.5px solid ${active ? "#6C52E3" : "rgba(200,195,230,0.6)"}`,
        fontWeight: 600,
        fontSize: 13,
        boxShadow: active ? "0 4px 14px rgba(108,92,231,0.20)" : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {children}
    </span>
  );
}

function VibePill({ emoji, label, hint, active }: { emoji: string; label: string; hint: string; active?: boolean }) {
  return (
    <span
      style={{
        flex: 1,
        padding: "8px 0",
        textAlign: "center",
        borderRadius: 14,
        background: active ? "#6C52E3" : "#F3F0FA",
        color: active ? "#fff" : "#8B87A8",
        border: `1.5px solid ${active ? "#6C52E3" : "rgba(200,195,230,0.5)"}`,
        boxShadow: active ? "0 4px 14px rgba(108,92,231,0.25)" : "none",
      }}
    >
      <span style={{ display: "block", fontWeight: 700, fontSize: 13 }}>
        {emoji} {label}
      </span>
      <span
        style={{
          display: "block",
          fontSize: 10,
          marginTop: 1,
          color: active ? "rgba(255,255,255,0.85)" : "#B0ABC8",
          fontWeight: 400,
        }}
      >
        {hint}
      </span>
    </span>
  );
}

function PrimaryButton({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 22px",
        borderRadius: 22,
        background: "linear-gradient(135deg, #6C52E3, #5B3FD0)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 15,
        boxShadow: "0 6px 24px rgba(108,82,227,0.35)",
        gap: 8,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Tiny placeholder QR motif — purely decorative for the share-preview scene. */
function QrPattern() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      {/* Three position markers */}
      <rect x="2" y="2" width="14" height="14" rx="2" fill="#161327" />
      <rect x="5" y="5" width="8" height="8" rx="1" fill="#fff" />
      <rect x="7" y="7" width="4" height="4" fill="#161327" />
      <rect x="40" y="2" width="14" height="14" rx="2" fill="#161327" />
      <rect x="43" y="5" width="8" height="8" rx="1" fill="#fff" />
      <rect x="45" y="7" width="4" height="4" fill="#161327" />
      <rect x="2" y="40" width="14" height="14" rx="2" fill="#161327" />
      <rect x="5" y="43" width="8" height="8" rx="1" fill="#fff" />
      <rect x="7" y="45" width="4" height="4" fill="#161327" />
      {/* Body dots */}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = 20 + (i % 6) * 4;
        const y = 20 + Math.floor(i / 6) * 4;
        if ((i * 7) % 3 === 0) return null;
        return <rect key={i} x={x} y={y} width="3" height="3" fill="#161327" />;
      })}
    </svg>
  );
}
