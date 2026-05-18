/**
 * Dev-only endpoint: persist Play Store screenshot PNGs from the
 * /play-store/[n] renderer into /public/play-store/{n}.png.
 *
 * Gated by NODE_ENV !== "production" so it's impossible to ship to prod
 * by accident. Accepts a single { n, dataUrl } where dataUrl is a
 * base64-encoded `data:image/png;base64,…` payload (output of html-to-image).
 */

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  try {
    const { n, dataUrl } = await req.json();
    const idx = Number(n);
    if (!Number.isInteger(idx) || idx < 1 || idx > 7) {
      return NextResponse.json({ error: "n must be 1..7" }, { status: 400 });
    }
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) {
      return NextResponse.json({ error: "dataUrl must be a PNG base64" }, { status: 400 });
    }

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buf = Buffer.from(base64, "base64");

    const outDir = path.join(process.cwd(), "public", "play-store");
    await fs.mkdir(outDir, { recursive: true });
    const file = path.join(outDir, `${idx}.png`);
    await fs.writeFile(file, buf);

    return NextResponse.json({ ok: true, path: `/play-store/${idx}.png`, bytes: buf.length });
  } catch (err) {
    console.error("[/api/save-play-store] failed:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
