import { defineConfig } from "vitepress";
import { SURFACE } from "../../src/brand/tokens.js";

// Project site served from https://sergey-bar.github.io/qa-doctor/
const BASE = "/qa-doctor/";
const ORIGIN = "https://sergey-bar.github.io";
const SITE_URL = ORIGIN + BASE;
const REPO_BLOB = "https://github.com/Sergey-Bar/qa-doctor/blob/main/";
const TAGLINE =
  "Verification Trust Engine for QA — audits test suites and CI pipelines, reports a test health score and prioritized findings.";

const SIDEBAR = [
  {
    text: "Guide",
    items: [
      { text: "Getting started", link: "/guide/getting-started" },
      { text: "What QA Doctor checks", link: "/guide/what-it-checks" },
      { text: "How the score works", link: "/guide/scoring" },
      { text: "Runtime forensics", link: "/guide/forensics" },
      { text: "CI integration", link: "/guide/ci" },
      { text: "Agent integration", link: "/guide/agents" },
      { text: "Configuration", link: "/guide/configuration" },
    ],
  },
  {
    text: "Rules",
    items: [{ text: "Rule catalog", link: "/rules/" }],
  },
  {
    text: "Reference",
    items: [
      { text: "CLI reference", link: "/reference/cli" },
      { text: "Exit codes & contracts", link: "/reference/exit-codes" },
      { text: "Terminology", link: "/reference/terminology" },
      { text: "False-positive audit", link: "/reference/fp-audit" },
      { text: "Rule lifecycle", link: "/reference/rule-lifecycle" },
      { text: "SARIF integration", link: "/reference/sarif" },
      { text: "Roadmap", link: "/reference/roadmap" },
      { text: "Contributing", link: "/reference/contributing" },
    ],
  },
];

// Docs that are @include'd from ../../docs and ../../CONTRIBUTING.md carry
// links written relative to the repo, not the site. Map the ones that have
// a page here to that page; send the rest to GitHub so nothing dead-ends.
const DOC_ROUTES: Record<string, string> = {
  "RULE-LIFECYCLE": "reference/rule-lifecycle",
  SCORING: "guide/scoring",
  "FP-AUDIT": "reference/fp-audit",
  "SARIF-INTEGRATION": "reference/sarif",
  CONTRIBUTING: "reference/contributing",
};

export default defineConfig({
  title: "QA Doctor",
  titleTemplate: ":title · QA Doctor",
  description: TAGLINE,
  base: BASE,
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  // Dark-only. "dark" merely defaulted to dark and still shipped a light
  // ramp behind a toggle — a second theme nobody designed against, which
  // is where the unreadable light-mode navbar wordmark came from (D12).
  // "force-dark" also removes the appearance switch from the navbar.
  appearance: "force-dark",
  sitemap: { hostname: SITE_URL },
  // Included docs (docs/*.md) carry links relative to the repo, not the
  // site; markdown.config below rewrites them, this silences the checker.
  ignoreDeadLinks: true,
  markdown: {
    config(md) {
      const orig = md.renderer.rules.link_open;
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const tok = tokens[idx];
        const attrs = tok.attrs;
        const ai = tok.attrIndex("href");
        if (attrs && ai >= 0) {
          const href = attrs[ai][1];
          if (!/^(https?:|\/|#|mailto:)/.test(href)) {
            const [rawPath, hash] = href.replace(/^\.\//, "").split("#");
            const suffix = hash ? "#" + hash : "";
            const key = rawPath
              .replace(/^docs\//, "")
              .replace(/\.md$/i, "")
              .toUpperCase();
            const route = DOC_ROUTES[key];
            if (route) {
              // root-relative — VitePress prepends the base itself
              attrs[ai][1] = "/" + route + suffix;
            } else {
              const repoPath = rawPath.startsWith("docs/")
                ? rawPath
                : "docs/" + rawPath;
              attrs[ai][1] = REPO_BLOB + repoPath + suffix;
              tok.attrPush(["target", "_blank"]);
              tok.attrPush(["rel", "noreferrer"]);
            }
          }
        }
        return orig
          ? orig(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options);
      };
    },
  },
  head: [
    // Marks the document as "scripting is live", before the body paints.
    // The landing page's reveal-on-scroll animation starts its elements at
    // opacity 0, and only JS ever brought them back — so with scripting off
    // every section below the hero was invisible (plan §2, D4). Gating that
    // starting state on this class makes the animation an enhancement: no
    // script, no class, nothing hidden. Inline and in <head> so there is no
    // flash of the hidden state on the way in.
    ["script", {}, `document.documentElement.classList.add("qa-anim")`],
    ["meta", { name: "theme-color", content: SURFACE.ink900 }],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: BASE + "favicon-32.png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: BASE + "favicon-16.png",
      },
    ],
    ["link", { rel: "apple-touch-icon", href: BASE + "apple-touch-icon.png" }],
    // Fonts are self-hosted from site/public/fonts (vendored by
    // `npm run brand:fonts`, sha256-locked in fonts.lock.json). There is
    // no preconnect and no third-party stylesheet: the page renders its
    // own wordmark without asking anyone else, and the two cross-origin
    // round-trips that used to sit on the critical path are gone.
    //
    // Preloading the latin faces first paint needs — body and code — is
    // what makes `font-display: swap` safe here. Display is Geist too, so
    // there is no third face to wait for. The measured lesson this
    // replaces: JetBrains Mono swapping in at ~900ms re-flowed all 91
    // rows of the rule catalog and was the whole of that page's CLS
    // (0.088 against a 0.05 gate). A same-origin, preloaded, 23 KB face
    // arrives before the paint that would have to shift.
    ...["geist-400-latin", "geist-mono-400-latin"].map(
      (f) =>
        [
          "link",
          {
            rel: "preload",
            as: "font",
            type: "font/woff2",
            href: `${BASE}fonts/${f}.woff2`,
            crossorigin: "",
          },
        ] as [string, Record<string, string>],
    ),
    // Link previews (Slack, X, LinkedIn, Discord) — without these a
    // shared link renders as a bare URL.
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "QA Doctor" }],
    [
      "meta",
      {
        property: "og:title",
        content: "QA Doctor — Verification Trust Engine",
      },
    ],
    ["meta", { property: "og:description", content: TAGLINE }],
    ["meta", { property: "og:url", content: SITE_URL }],
    ["meta", { property: "og:image", content: SITE_URL + "social-card.jpg" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    [
      "meta",
      {
        name: "twitter:title",
        content: "QA Doctor — Verification Trust Engine",
      },
    ],
    ["meta", { name: "twitter:description", content: TAGLINE }],
    ["meta", { name: "twitter:image", content: SITE_URL + "social-card.jpg" }],
  ],
  themeConfig: {
    nav: [
      {
        text: "Features",
        items: [
          { text: "What it checks", link: "/guide/what-it-checks" },
          { text: "Test Health score", link: "/guide/scoring" },
          { text: "CI integrity", link: "/guide/ci" },
          { text: "Runtime forensics", link: "/guide/forensics" },
          {
            text: "Selector health",
            link: "/guide/forensics#selector-health-score",
          },
          { text: "AI agents", link: "/guide/agents" },
        ],
      },
      { text: "Docs", link: "/guide/getting-started", activeMatch: "^/guide/" },
      { text: "Rules", link: "/rules/", activeMatch: "^/rules/" },
      {
        text: "Changelog",
        link: "https://github.com/Sergey-Bar/qa-doctor/blob/main/CHANGELOG.md",
      },
    ],
    // One sidebar for every docs section (the landing page opts out via
    // `sidebar: false` in its frontmatter).
    sidebar: {
      "/guide/": SIDEBAR,
      "/reference/": SIDEBAR,
      "/rules/": SIDEBAR,
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/Sergey-Bar/qa-doctor" },
    ],
    search: { provider: "local" },
    // A few Reference pages are mostly `@include`d from ../../docs — send
    // "edit" to the real source there. Pages that opt out entirely
    // (generated rule pages, the FP-audit table) set `editLink: false`.
    //
    // NOTE: VitePress serializes this function and re-evaluates it in the
    // client bundle, so it cannot close over module scope — the map is
    // declared inside the body on purpose.
    editLink: {
      pattern: ({ filePath }: { filePath: string }) => {
        const edit = "https://github.com/Sergey-Bar/qa-doctor/edit/main/";
        const includedFrom: Record<string, string> = {
          "reference/rule-lifecycle.md": "docs/RULE-LIFECYCLE.md",
          "reference/sarif.md": "docs/SARIF-INTEGRATION.md",
          "reference/contributing.md": "CONTRIBUTING.md",
        };
        return edit + (includedFrom[filePath] ?? `site/${filePath}`);
      },
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright:
        'Built by <a href="https://www.linkedin.com/in/sergeybar/" target="_blank" rel="noreferrer">Sergey Bar</a>',
    },
  },
});
