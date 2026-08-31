import { defineConfig } from "vitepress";

// Project site served from https://sergey-bar.github.io/Mjolnir/
const BASE = "/Mjolnir/";
const ORIGIN = "https://sergey-bar.github.io";
const SITE_URL = ORIGIN + BASE;
const REPO_BLOB = "https://github.com/Sergey-Bar/Mjolnir/blob/main/";
const TAGLINE =
  "Verification Trust Engine for QA — audits test suites and CI pipelines, reports a worthiness score and prioritized findings.";

const SIDEBAR = [
  {
    text: "Guide",
    items: [
      { text: "Getting started", link: "/guide/getting-started" },
      { text: "What Mjölnir checks", link: "/guide/what-it-checks" },
      { text: "How the score works", link: "/guide/scoring" },
      { text: "Runtime forensics", link: "/guide/forensics" },
      { text: "CI integration", link: "/guide/ci" },
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
      { text: "Exit codes & contracts", link: "/reference/exit-codes" },
      { text: "False-positive audit", link: "/reference/fp-audit" },
      { text: "Rule lifecycle", link: "/reference/rule-lifecycle" },
      { text: "SARIF integration", link: "/reference/sarif" },
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
  title: "Mjölnir",
  titleTemplate: ":title · Mjölnir",
  description: TAGLINE,
  base: BASE,
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  appearance: "dark",
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
    ["meta", { name: "theme-color", content: "#0b0f17" }],
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
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;450;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
    // Link previews (Slack, X, LinkedIn, Discord) — without these a
    // shared link renders as a bare URL.
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Mjölnir" }],
    [
      "meta",
      { property: "og:title", content: "Mjölnir — Verification Trust Engine" },
    ],
    ["meta", { property: "og:description", content: TAGLINE }],
    ["meta", { property: "og:url", content: SITE_URL }],
    ["meta", { property: "og:image", content: SITE_URL + "social-card.png" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    [
      "meta",
      { name: "twitter:title", content: "Mjölnir — Verification Trust Engine" },
    ],
    ["meta", { name: "twitter:description", content: TAGLINE }],
    ["meta", { name: "twitter:image", content: SITE_URL + "social-card.png" }],
  ],
  themeConfig: {
    logo: "/apple-touch-icon.png",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Rules", link: "/rules/", activeMatch: "^/rules/" },
      { text: "Reference", link: "/reference/exit-codes" },
      { text: "npm", link: "https://www.npmjs.com/package/mjolnir-qa" },
    ],
    // One sidebar for every docs section (the landing page opts out via
    // `sidebar: false` in its frontmatter).
    sidebar: {
      "/guide/": SIDEBAR,
      "/reference/": SIDEBAR,
      "/rules/": SIDEBAR,
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/Sergey-Bar/Mjolnir" },
      { icon: "npm", link: "https://www.npmjs.com/package/mjolnir-qa" },
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
        const edit = "https://github.com/Sergey-Bar/Mjolnir/edit/main/";
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
      copyright: "Built by Sergey Bar",
    },
  },
});
