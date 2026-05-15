"use client";

import { useState } from "react";
import type { Mode } from "@/lib/types";
import { useSession } from "@/lib/useSession";
import LandingScreen from "@/components/LandingScreen";
import CategoryScreen from "@/components/CategoryScreen";
import SessionScreen from "@/components/SessionScreen";
import AgeGateModal from "@/components/AgeGateModal";

type AppScreen = "landing" | "category" | "session";

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [mode, setMode] = useState<Mode>("group");
  const [showAge, setShowAge] = useState(false);
  const [pendingCat, setPendingCat] = useState<string | null>(null);
  const [ageVerified, setAgeVerified] = useState(false);

  const session = useSession();

  function handleModeChosen(m: Mode, category?: string | null) {
    setMode(m);
    // Category is now selected on the landing screen for both modes.
    // Defer to handleCategoryChosen so the age gate still fires for "party".
    if (category === "party" && !ageVerified) {
      setPendingCat("party");
      setShowAge(true);
      return;
    }
    session.startSession(m, category ?? null);
    setScreen("session");
  }

  function handleCategoryChosen(cat: string | null) {
    if (cat === "party" && !ageVerified) {
      setPendingCat(cat);
      setShowAge(true);
      return;
    }
    launchSession(cat);
  }

  function handleAgeConfirm() {
    setAgeVerified(true);
    setShowAge(false);
    launchSession(pendingCat);
    setPendingCat(null);
  }

  function handleAgeDeny() {
    setShowAge(false);
    setPendingCat(null);
  }

  async function launchSession(cat: string | null) {
    await session.startSession(mode, cat);
    setScreen("session");
  }

  return (
    <>
      {screen === "landing" && <LandingScreen onModeChosen={handleModeChosen} />}
      {screen === "category" && (
        <CategoryScreen
          mode={mode}
          onCategoryChosen={handleCategoryChosen}
          onBack={() => setScreen("landing")}
        />
      )}
      {screen === "session" && session.session && (
        <SessionScreen
          session={session}
          onEnd={() => { setScreen("landing"); session.reset(); }}
          onBack={() => { setScreen("landing"); session.reset(); }}
        />
      )}
      {showAge && <AgeGateModal onConfirm={handleAgeConfirm} onDeny={handleAgeDeny} />}
    </>
  );
}
