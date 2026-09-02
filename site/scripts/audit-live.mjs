/**
 * `npm run audit` (in site/) — the checks the static doctor cannot make.
 *
 * site-doctor.mjs runs on plain Node with zero dependencies, which is why
 * it reasons about the built HTML as text. Three things genuinely need a
 * browser, and were carried as open gaps rather than claimed:
 *
 *   - a real axe-core audit (colour-in-context, ARIA semantics, the rules
 *     a regex cannot evaluate)
 *   - keyboard traversal: focus order, a visible focus indicator on every
 *     stop, and no traps
 *   - layout stability and paint timing (CLS / LCP), measured from the
 *     browser's own Performance APIs rather than inferred
 *
 * Kept OUT of `npm run doctor` and out of the pages.yml gate on purpose:
 * it needs axe-core and a Playwright browser, and site/ deliberately has
 * neither. Run it from the repo root, where those already exist:
 *
 *     npm run site:audit          # after `npm --prefix site run build`
 *
 * Exit codes match the doctor: 0 clean, 1 findings.
 */

import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..");
const DIST = join(SITE, ".vitepress", "dist");
const BASE = "/Mjolnir/";

/** Pages worth auditing: the landing page, a doc page, and the catalog. */
const ROUTES = ["", "guide/getting-started", "rules/"];

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

/** Static server over dist/, mirroring how GitHub Pages resolves cleanUrls. */
function serve(port) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.startsWith(BASE)) p = p.slice(BASE.length);
    p = p.replace(/^\/+/, "");
    const tries =
      p === "" || p.endsWith("/")
        ? [p + "index.html"]
        : [p, p + ".html", p + "/index.html"];
    for (const t of tries) {
      const f = join(DIST, t);
      if (existsSync(f) && statSync(f).isFile()) {
        const type = MIME[extname(f)] ?? "application/octet-stream";
        const body = readFileSync(f);
        // GitHub Pages gzips text assets; without this the harness ships
        // 714 KB where production ships 264 KB, and the resulting score
        // measures this server rather than the site.
        const compressible =
          /^(text\/|application\/(javascript|json)|image\/svg)/.test(type);
        if (
          compressible &&
          (req.headers["accept-encoding"] || "").includes("gzip")
        ) {
          const z = gzipSync(body);
          res.writeHead(200, {
            "content-type": type,
            "content-encoding": "gzip",
            "content-length": z.length,
          });
          res.end(z);
        } else {
          res.writeHead(200, {
            "content-type": type,
            "content-length": body.length,
          });
          res.end(body);
        }
        return;
      }
    }
    res.writeHead(404).end("not found");
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("dist/ not found — run `npm --prefix site run build` first");
    process.exit(1);
  }
  const { chromium } = await import("playwright");
  const axeSource = readFileSync(
    join(SITE, "..", "node_modules", "axe-core", "axe.min.js"),
    "utf8",
  );

  const port = 4399;
  const server = await serve(port);
  const browser = await chromium.launch();
  const results = [];

  for (const route of ROUTES) {
    const url = `http://localhost:${port}${BASE}${route}`;
    const label = route === "" ? "/ (landing)" : "/" + route;
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });

    // --- layout stability + paint, from the browser's own timings -------
    await page.addInitScript(() => {
      window.__cls = 0;
      window.__lcp = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });

    await page.goto(url, { waitUntil: "networkidle" });
    // Scroll the page so lazy/reveal content settles, then let it rest —
    // a CLS number taken before the reveal animations run is not the one
    // a reader experiences.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);

    const vitals = await page.evaluate(() => ({
      cls: Math.round(window.__cls * 10000) / 10000,
      lcp: Math.round(window.__lcp),
    }));

    // --- axe ------------------------------------------------------------
    await page.evaluate(axeSource);
    const axe = await page.evaluate(
      async () =>
        // eslint-disable-next-line no-undef
        await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        }),
    );

    // --- keyboard traversal ---------------------------------------------
    await page.evaluate(() => window.scrollTo(0, 0));
    const stops = [];
    let trapped = false;
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const hasRing =
          (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
          cs.boxShadow !== "none";
        return {
          tag: el.tagName.toLowerCase(),
          label: (el.getAttribute("aria-label") || el.textContent || "")
            .trim()
            .slice(0, 34),
          hasRing,
        };
      });
      if (!stop) break;
      stops.push(stop);
      if (stops.length > 2) {
        const last = JSON.stringify(stop);
        if (stops.slice(-4, -1).every((s) => JSON.stringify(s) === last)) {
          trapped = true;
          break;
        }
      }
    }

    results.push({ label, vitals, axe, stops, trapped });
    await page.close();
  }

  await browser.close();
  server.close();

  /* ---------------- report ---------------- */
  console.log("\nmjolnir site audit  (axe-core + keyboard + web vitals)\n");
  let failed = 0;

  for (const r of results) {
    const v = r.violations ?? r.axe.violations;
    const noRing = r.stops.filter((s) => !s.hasRing);
    const clsOk = r.vitals.cls <= 0.05;
    const ok = v.length === 0 && noRing.length === 0 && !r.trapped && clsOk;
    if (!ok) failed++;

    console.log(`  ${ok ? "PASS" : "FAIL"}  ${r.label}`);
    console.log(
      `          axe: ${v.length} violation(s) · ` +
        `keyboard: ${r.stops.length} stops, ${noRing.length} without a focus ring` +
        `${r.trapped ? ", TRAP" : ""} · ` +
        `CLS ${r.vitals.cls} (<=0.05) · LCP ${r.vitals.lcp}ms`,
    );
    for (const x of v) {
      console.log(
        `            [${x.impact}] ${x.id} — ${x.help} (${x.nodes.length} node(s))`,
      );
      for (const n of x.nodes.slice(0, 2)) {
        console.log(`              ${n.html.slice(0, 96)}`);
      }
    }
    for (const s of noRing.slice(0, 4)) {
      console.log(`            no focus ring: <${s.tag}> ${s.label}`);
    }
    if (!clsOk) console.log(`            CLS ${r.vitals.cls} exceeds 0.05`);
  }

  console.log(`\n  ${failed} of ${results.length} pages failing\n`);
  process.exit(failed ? 1 : 0);
}

await main();
