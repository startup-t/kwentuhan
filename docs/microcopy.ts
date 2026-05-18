/**
 * Kwentuhan microcopy — single source of truth for every user-facing string.
 *
 * Why this exists: web and native must speak identically. The Taglish
 * phrasing ("Sagutin mo rin", "Ikwento mo naman…", "Walang nakakaalam,
 * walang husga") IS the brand voice — paraphrasing it loses the soul.
 *
 * Consumers:
 *   - Web: import directly. Replace inline strings throughout components.
 *   - Native: this file IS the spec. Mirror as Kotlin strings.xml or
 *     Swift String catalog with the same keys.
 *
 * Rules for adding/editing strings here:
 *   1. NEVER translate the Taglish phrases. They're intentional code-switches.
 *   2. Keep keys grouped by screen / flow.
 *   3. Use {placeholders} for runtime interpolation, document each.
 *   4. Mark anonymity / fine-print explicitly — these are legal-adjacent.
 */

export const microcopy = {
  /* ─────────────────────────────────────────────────────────────────────
     BRAND / GLOBAL
     ───────────────────────────────────────────────────────────────────── */
  brand: {
    wordmark:     "kwentuhan",
    tagline:      "usapang totoo, kasama mo.",
    domainFooter: "kwentuhan.cards",
  },

  /* ─────────────────────────────────────────────────────────────────────
     LANDING SCREEN
     ───────────────────────────────────────────────────────────────────── */
  landing: {
    playModeLabel:   "Play Mode",
    groupModeLabel:  "Group Mode",
    soloModeLabel:   "Solo Mode",
    categoryLabel:   "Category",
    soloTopicLabel:  "Solo Topic",
    randomCategory:  "Random",
    deckCount:       "{n} questions in deck", // {n} = integer
    groupModeTitle:  "Group Mode",
    groupModeDesc:   "Better conversations start with better questions.",
    soloModeTitle:   "Solo Mode",
    soloModeDesc:    "Para sa sariling reflection + sharing.",
    primaryCta:      "Start a Conversation",
    questionPreviewEyebrow: "Question Preview",
    questionPreviewFooter:  "Start a conversation to see your full deck",
  },

  /* ─────────────────────────────────────────────────────────────────────
     SESSION SCREEN (in-game card flow)
     ───────────────────────────────────────────────────────────────────── */
  session: {
    progress:           "Question {current} of {total}", // {current}/{total} = ints
    deckProgress:       "{pct}% through the deck",       // {pct} = "0" to "100"
    deepDiveCta:        "Tap for deep dive",
    finishedEmoji:      "🎉",
    finishedHeading:    "All Done!",
    finishedSubheading: "{total} questions played.",     // {total} = int
    playAgainCta:       "🔄  Play Again",
    backToHome:         "← Back",
    skipAriaLabel:      "Skip",
    nextLabel:          "Next",
    shareCta:           "Share this kwento",
    addQuestionAria:    "Contribute a question",
  },

  /* ─────────────────────────────────────────────────────────────────────
     SHARE MODAL — User 1 (in-app creator after writing answer)
     ───────────────────────────────────────────────────────────────────── */
  shareModal: {
    inputHeader:        "Your kwento",
    inputPlaceholder:   "Kwento mo naman…",
    inputDoneCta:       "Preview",
    previewHeader:      "Preview",
    closeAria:          "Close",
    downloadCardCta:    "Download card",
    addAnswerFirstCta:  "Add your answer first",
    generatingLinkCta:  "Generating link…",
    retryAfterLinkCta:  "Retry after generating link",
    savedHint:          "Card saved!",
    saveFailedHint:     "Failed to save image",
    revealLinkLabel:    "Reveal link:",
    generatingRevealMsg: "Generating reveal link…",
    revealLinkFailedMsg: "Couldn't generate reveal link.",
    retry:              "Retry",
  },

  /* ─────────────────────────────────────────────────────────────────────
     SCAN-TO-REVEAL — User 2 (lands here via shared QR/URL)
     ───────────────────────────────────────────────────────────────────── */
  reveal: {
    revealEyebrow:      "✨ a kwento for you",
    revealMetaLabel:    "shared via kwentuhan",
    revealAttribution:  "— someone, anonymously",
    reactionAriaLabel:  "React to this kwento",
    reactionItemAria:   "React with {emoji}",         // {emoji} = single emoji
    questionByPrefix:   "Question by",                // followed by @handle
    notFoundEmoji:      "💭",
    notFoundCopy:       "We couldn't load this particular kwento — but the question above is still wide open. Be the storyteller this time.",
    shareRowLabel:      "or pass along →",
    shareWhatsApp:      "WhatsApp",
    shareMessenger:     "Messenger",
    shareX:             "X",
    /** Label above the question card on the reveal screen (native). */
    questionEyebrow:    "✨ ang tanong",
  },

  /* ─────────────────────────────────────────────────────────────────────
     KWENTO FORM (User 2 writing their answer on the reveal page)
     ───────────────────────────────────────────────────────────────────── */
  kwentoForm: {
    headingWithKwento:    "Sagutin mo rin",
    subheadingWithKwento: "Pass it on. Walang nakakaalam, walang husga.",
    headingNoKwento:      "Your turn",
    subheadingNoKwento:   "Answer the question and we'll spin up a shareable link for you.",
    placeholder:          "Ikwento mo naman…",
    sharingCta:           "Sharing…",
    primaryCta:           "Share your kwento",
    submitIconLeading:    "✨",
    writeAnotherCta:      "Write another kwento →",
    errorGeneric:         "Something went wrong. Please try again.",
    errorNoNetwork:       "No internet connection. Please try again.",
    errorMissingReveal:   "Kwento saved, but couldn't generate the reveal link.",
    /** Success panel (User 2 post-submit) — native only until web adopts. */
    successHeading:       "Your kwento is live!",
    successSubheading:    "Ibahagi ito at simulan ang usapan.",
    /** CTA on the success panel share button (🔗 icon, distinct from ✨ submit). */
    shareLinkCta:         "🔗  Share your kwento",
  },

  /* ─────────────────────────────────────────────────────────────────────
     CONTRIBUTE QUESTION MODAL
     ───────────────────────────────────────────────────────────────────── */
  contribute: {
    modalHeading:      "Contribute a Question",
    closeAria:         "Close",
    introCopy:         "Your question goes live instantly and joins the deck for everyone.",
    fieldMode:         "Mode",
    modeSolo:          "👤 Solo",
    modeGroup:         "👥 Group",
    fieldCategory:     "Category",
    fieldVibe:         "Vibe",
    vibeHints: {
      light: "every day",
      deep:  "real talk",
      wild:  "edge it up",
    },
    fieldQuestion:     "The question",
    fieldFollowUp:     "Follow-up (optional)",
    followUpPlaceholder: "A deeper version that the host can ask next",
    fieldHandle:       "Your handle (optional)",
    handlePlaceholder: "yourhandle",
    handleHintAnonymous: "Stay anonymous",
    handleHintFormat:    "@{handle}", // {handle} = trimmed username

    /* Quality nudges — see qualityNudge() in AddQuestionModal.tsx.
       These fire below the question textarea when the heuristics detect
       a low-quality prompt pattern. Non-blocking. */
    nudgeYesNo:        "Try opening with \"What\", \"Anong\", \"Sino\", or \"Kailan\" — yes/no questions rarely get stories.",
    nudgeMultiQuestion: "Pick one question — combined prompts make players freeze on which part to answer.",
    nudgeVague:        "Try a specific moment instead — e.g. \"Anong moment recently na…\" — abstract prompts feel like essays.",
    nudgeIcon:         "💡",

    publishCta:        "Publish question",
    publishingCta:     "Publishing…",
    publishFinePrint:  "Goes live immediately. Be kind, be curious, be real.",
    errorTooShort:     "Question must be at least {min} characters.", // {min} = HOOK_MIN
    errorTooLong:      "Question can be at most {max} characters.",   // {max} = HOOK_MAX
    errorGeneric:      "Couldn't publish your question. Try again.",
    errorNoNetwork:    "No internet connection. Try again in a moment.",

    /* Success state */
    successCelebration: "🎉",
    successHeading:    "Live na ang kwento mo!",
    successContext:    "Anyone playing {modeLabel} → {categoryLabel} can see it next.",
    viewCta:           "View",
    viewAria:          "View question",
    viewIcon:          "👁️",
    answerCta:         "Answer",
    answerAria:        "Answer this question",
    answerIcon:        "✍️",
    doneCta:           "Done",
    idMissingNotice:   "Question saved, but its link couldn't be loaded. Tap Done and try refreshing.",

    /* Default contributor label when handle field is left blank */
    fallbackContributor: "Community Contributor",
  },

  /* ─────────────────────────────────────────────────────────────────────
     FOLLOW-UP QUESTION CARD (Deep Dive — AI-generated in contribute success)
     ───────────────────────────────────────────────────────────────────── */
  followUp: {
    eyebrow:     "Deep Dive",
    threadIcon:  "↳",
    errorChip:   "Couldn't draft a follow-up.",
    retry:       "Retry",
  },

  /* ─────────────────────────────────────────────────────────────────────
     KWENTO EXPORT PANEL (the shared "final state" for User 1 + User 2)
     ───────────────────────────────────────────────────────────────────── */
  exportPanel: {
    qrLabelPlay:    "Scan to play",
    qrLabelReveal:  "Scan to reveal",
    savingCta:      "Saving…",
    downloadCta:    "Download card",
  },

  /* ─────────────────────────────────────────────────────────────────────
     DEEP-LINK / APP-OPEN
     ───────────────────────────────────────────────────────────────────── */
  deepLink: {
    openInAppCta:    "Already have the app? Open in Kwentuhan →",
    openingCta:      "Opening app…",
    notInstalledMsg: "App not installed yet?",
    openInButtonCta: "📱  Open in Kwentuhan app",
    appStoreCta:     "App Store",
    playStoreCta:    "Google Play",
  },

  /* ─────────────────────────────────────────────────────────────────────
     SHARE TARGETS — copy used when pushing to native share / clipboards
     ───────────────────────────────────────────────────────────────────── */
  shareIntents: {
    /** Used when the User 2 native share is invoked (Web Share API). */
    titleUser2:    "My kwento on Kwentuhan",
    bodyUser2:     "Sumagot ako ng isang tanong sa Kwentuhan — basahin mo ang sagot ko, tapos sagutin mo rin.",

    /** Clipboard payload when Instagram-share is tapped. {hook} + {url}. */
    instagramText: "{hook}\n\n— kwentuhan\n{url}",

    /** X (Twitter) tweet intent text. */
    xTweetText:    "This kwento was revealed just for you",
  },
} as const;

export type Microcopy = typeof microcopy;
