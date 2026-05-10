import { KwentoForm } from "./KwentoForm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getKwento(kwentoId: string) {
  try {
    const requestHeaders = await headers();
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "kwentuhan.cards";
    const protocol =
      requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/kwento/${encodeURIComponent(kwentoId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Page({ params }: any) {
  const kwentoId = params?.kwentoId;
  const questionId = params?.questionId;

  if (!kwentoId || typeof kwentoId !== "string" || !questionId || typeof questionId !== "string") {
    return <div>Kwento not found</div>;
  }

  const data = await getKwento(kwentoId);

  if (!data) {
    return <div>Kwento not found</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>{data.questionText}</h1>
      <p style={{ filter: data.isTeaser ? "blur(6px)" : "none" }}>{data.answerText}</p>
      <KwentoForm questionId={questionId} questionText={data.questionText} />
    </div>
  );
}
