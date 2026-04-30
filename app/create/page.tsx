import { redirect } from "next/navigation";

export default function CreatePage({ searchParams }: { searchParams: { from?: string; qid?: string } }) {
  const from = searchParams?.from ? `from=${encodeURIComponent(searchParams.from)}` : "";
  const qid = searchParams?.qid ? `qid=${encodeURIComponent(searchParams.qid)}` : "";
  const query = [from, qid].filter(Boolean).join("&");

  redirect(query ? `/?${query}` : "/");
}
