/**
 * /reveal/[shareId] — legacy reveal URL format.
 *
 * Tries to find the shareId in PostgreSQL (in case it was saved there).
 * If found: redirects to the canonical /q/{questionId}/k/{kwentoId} page.
 * If not found: renders a helpful "link expired" page.
 *
 * Old in-memory-only shares (created before the PostgreSQL fix) cannot
 * be recovered — the data was never persisted. New shares always use
 * the /q/{questionId}/k/{kwentoId} URL form directly.
 */

import { redirect, notFound } from "next/navigation";
import { getPersistedKwento } from "@/lib/kwento/postgresStore";

type Props = { params: Promise<{ shareId: string }> };

async function safeGet(shareId: string) {
  try {
    return await getPersistedKwento(shareId);
  } catch {
    return null;
  }
}

export default async function LegacyRevealPage({ params }: Props) {
  const { shareId } = await params;

  if (!shareId) notFound();

  // Try PostgreSQL — works for any k_* token regardless of which URL format
  // was used to arrive here.
  const kwento = await safeGet(shareId);

  if (kwento) {
    redirect(`/q/${kwento.questionId}/k/${kwento.kwentoId}`);
  }

  // Not in DB — the link is stale or was created before server persistence.
  notFound();
}
