#!/usr/bin/env node
/**
 * Capture all 7 Play Store screenshots from the running dev server.
 *
 * Requires:
 *   - dev server running on http://localhost:3000
 *   - Google Chrome installed at /Applications/Google Chrome.app/...
 *
 * Usage:
 *   node scripts/capture-play-store.mjs
 *
 * Outputs:
 *   public/play-store/{1..7}.png at exactly 1080×1920
 */

import puppeteer from "puppeteer-core";
import { promises as fs } from "fs";
import path from "path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "play-store");
const COUNT = 7;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();

    for (let n = 1; n <= COUNT; n++) {
      const url = `${BASE}/play-store/${n}`;
      const out = path.join(OUT_DIR, `${n}.png`);
      console.log(`[${n}/${COUNT}] ${url}`);

      await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
      // Settle frame for fonts + radial-gradient paints
      await new Promise((r) => setTimeout(r, 500));

      await page.screenshot({
        path: out,
        type: "png",
        clip: { x: 0, y: 0, width: 1080, height: 1920 },
        omitBackground: false,
      });

      const stat = await fs.stat(out);
      console.log(`     → ${out}  (${(stat.size / 1024).toFixed(1)} KB)`);
    }
  } finally {
    await browser.close();
  }

  console.log("\nDone. 7 PNGs at:", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
