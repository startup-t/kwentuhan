const SPLIT_AT    = 120;
const MAX_BUBBLES = 3;

/**
 * Split a chat answer into up to 3 bubbles at sentence boundaries past 120 chars.
 * The last bubble is uncapped — it grows past 120 if there's no more sentence break.
 */
export function autoStackChat(text: string): string[] {
  if (!text) return [];
  if (text.length <= SPLIT_AT) return [text];

  const bubbles: string[] = [];
  let remaining = text;

  while (bubbles.length < MAX_BUBBLES - 1 && remaining.length > SPLIT_AT) {
    const splitAt = findSentenceEndAfter(remaining, SPLIT_AT);
    if (splitAt === -1) break;
    bubbles.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  if (remaining.length > 0) bubbles.push(remaining);
  return bubbles;
}

function findSentenceEndAfter(text: string, after: number): number {
  for (let i = after; i < text.length; i++) {
    const ch = text[i];
    if (ch === "." || ch === "?" || ch === "!") return i;
  }
  return -1;
}
