import { defineConfig } from "vitepress";

// Project site served from https://sergey-bar.github.io/Mjolnir/
const BASE = "/Mjolnir/";
const REPO_BLOB = "https://github.com/Sergey-Bar/Mjolnir/blob/main/";

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
  description:
    "Verification Trust Engine for QA — audits test suites and CI pipelines, reports a worthiness score and prioritized findings.",
  base: BASE,
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  appearance: "dark",
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
    ["meta", { name: "theme-color", content: "#B45309" }],
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
  ],
  themeConfig: {
    logo: "/hammer.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Rules", link: "/guide/what-it-checks" },
      { text: "Reference", link: "/reference/exit-codes" },
      { text: "npm", link: "https://www.npmjs.com/package/mjolnir-qa" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "What Mjölnir checks", link: "/guide/what-it-checks" },
            { text: "How the score works", link: "/guide/scoring" },
            { text: "CI integration", link: "/guide/ci" },
            { text: "Configuration", link: "/guide/configuration" },
          ],
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
      ],
      "/reference/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "What Mjölnir checks", link: "/guide/what-it-checks" },
            { text: "How the score works", link: "/guide/scoring" },
            { text: "CI integration", link: "/guide/ci" },
            { text: "Configuration", link: "/guide/configuration" },
          ],
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
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/Sergey-Bar/Mjolnir" },
    ],
    search: { provider: "local" },
    editLink: {
      pattern: "https://github.com/Sergey-Bar/Mjolnir/edit/main/site/:path",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Built by Sergey Bar",
    },
  },
});
