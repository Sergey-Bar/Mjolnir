/**
 * Workflows that belong to no gate TIER, and the reason.
 *
 * One list, because it is one kind of fact. There were two: eleven
 * coverage/triage/renderer workflows here-eleven-there in
 * `check-gate-tiers.mjs` and three in the script checker, with
 * `dependabot-auto-merge.yml` and `repair-dist-tag.yml` in BOTH under
 * different reasons and no cross-check to say which was current. A reviewer
 * comparing them had no way to tell a deliberate exemption from a stale one.
 *
 * The response to a duplication is not a second copy of it.
 *
 * Entries are repository administration (issue triage, label sync, dist-tag
 * repair), a third-party scanner whose verdict is published to its own
 * dashboard rather than asserted here, or a manual-only render. The reason is
 * the part a reviewer needs to check; "not a gate" as a bare string would be
 * unfalsifiable.
 */
export const EXEMPT_FROM_TIERS = new Map([
  [
    ".github/workflows/dependabot-auto-merge.yml",
    "repository administration — merges Dependabot PRs after their own CI " +
      "has run; runs no npm script of this repository",
  ],
  [
    ".github/workflows/repair-dist-tag.yml",
    "repository administration — corrects the dist-tag of a publish that " +
      "already succeeded; runs no npm script of this repository",
  ],
  [
    ".github/workflows/greetings.yml",
    "repository administration — first-touch comment on new issues; no gate",
  ],
  [
    ".github/workflows/label.yml",
    "repository administration — label synchronisation; no gate",
  ],
  [
    ".github/workflows/stale.yml",
    "repository administration — issue and PR lifecycle; no gate",
  ],
  [
    ".github/workflows/action-tags.yml",
    "repository administration — moves the vN major tag of the published " +
      "Action; runs no npm script",
  ],
  [
    ".github/workflows/jekyll-gh-pages.yml",
    "compatibility shim — one echo step documenting that pages.yml owns " +
      "deployment; no gate",
  ],
  [
    ".github/workflows/demo-video.yml",
    "manual-only render — needs Chromium and minutes of video encoding, and " +
      "its own header excludes it from standing CI deliberately",
  ],
  [
    ".github/workflows/codeql.yml",
    "third-party scanner — publishes its own SARIF to Code Scanning; its " +
      "verdict is not asserted by a tier",
  ],
  [
    ".github/workflows/osv-scanner.yml",
    "third-party scanner — publishes its own vulnerability report; not " +
      "asserted by a tier",
  ],
  [
    ".github/workflows/scorecard.yml",
    "third-party scanner — OpenSSF Scorecard, published as SARIF; not " +
      "asserted by a tier",
  ],
]);

/**
 * Workflows the SCRIPT checker may not read npm script names out of, because
 * the scripts they name belong to something else.
 *
 * A separate list on purpose, and the separation is not cosmetic:
 * `release-smoke.yml` is a nightly workflow this repository owns — it is in
 * `gates/nightly.json` under `alsoRunsIn` — AND it installs a PUBLISHED tarball
 * and drives it as a consumer, so the `npm run` names in its steps are the
 * installed package's. Both facts are true and they answer different
 * questions, so a single list with one exemption reason per workflow cannot
 * hold either honestly: `nightly.json` said it belongs to a tier while the
 * exemption said it does not, and a check written as `!claimed && !exempt`
 * treats both as satisfied and never sees the disagreement.
 *
 * An entry here says nothing about tier membership. A workflow may be in
 * `EXEMPT_FROM_TIERS`, in a tier's `alsoRunsIn`, or both.
 */
export const EXEMPT_FROM_SCRIPT_CHECK = new Map([
  [
    ".github/workflows/release-smoke.yml",
    "installs a PUBLISHED tarball and drives it as a consumer would; the " +
      "scripts it runs belong to the installed package, not this repository",
  ],
]);

/**
 * The minimum a reason has to be.
 *
 * Not arbitrary. The shortest useful reason above is 49 characters; a one-word
 * entry ("no", "manual", "n/a") is unfalsifiable because there is no claim in
 * it to disagree with, and an unfalsifiable exemption is indistinguishable
 * from a hole.
 */
export const MIN_REASON_LENGTH = 24;

/** Entries whose reason is too short to be a reason, across both lists. */
export function weakExemptionReasons(...lists) {
  const out = [];
  for (const list of lists.length > 0
    ? lists
    : [EXEMPT_FROM_TIERS, EXEMPT_FROM_SCRIPT_CHECK]) {
    for (const [path, reason] of list) {
      if (reason.trim().length < MIN_REASON_LENGTH) out.push({ path, reason });
    }
  }
  return out;
}
