/** Static GitHub-compatible status badges; no third-party badge requests. */
import { mkdirSync, writeFileSync } from "node:fs";
import { SCORE, STATUS, SURFACE } from "../src/brand/tokens.js";

const target = new URL("../assets/brand/pr-status/", import.meta.url);
mkdirSync(target, { recursive: true });
const badges = [
  ["incomplete", "INCOMPLETE", STATUS.warning],
  ["unmeasured", "UNMEASURED", SCORE.unmeasured],
  ["critical", "UNWORTHY", SCORE.critical],
  ["warning", "NEEDS WORK", SCORE.warning],
  ["trusted", "WORTHY", SCORE.trusted],
  ["forged", "FORGED", SCORE.forged],
] as const;
for (const [id, label, color] of badges) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="152" height="30" viewBox="0 0 152 30" role="img" aria-label="${label}"><title>${label}</title><rect x=".5" y=".5" width="151" height="29" rx="6" fill="${SURFACE.ink950}" stroke="${color}"/><circle cx="15" cy="15" r="3" fill="${color}"/><text x="28" y="19.5" fill="${color}" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" font-weight="bold" letter-spacing=".6">${label}</text></svg>\n`;
  writeFileSync(new URL(`${id}.svg`, target), svg);
}
