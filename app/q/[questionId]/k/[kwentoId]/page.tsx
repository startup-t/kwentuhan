import { KwentoForm } from "./KwentoForm";

async function getKwento(kwentoId: string) {
  const res = await fetch(`https://kwentuhan.cards/api/kwento/${kwentoId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
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
