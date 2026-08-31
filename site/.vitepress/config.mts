import { defineConfig } from "vitepress";

// Project site served from https://sergey-bar.github.io/Mjolnir/
export default defineConfig({
  title: "Mjölnir",
  description:
    "Verification Trust Engine for QA — audits test suites and CI pipelines, reports a worthiness score and prioritized findings.",
  base: "/Mjolnir/",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  // Included docs (docs/*.md) carry links relative to the repo, not the site.
  ignoreDeadLinks: true,
  head: [["meta", { name: "theme-color", content: "#B45309" }]],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Rules", link: "/guide/what-it-checks" },
      { text: "Reference", link: "/reference/exit-codes" },
      { text: "npm", link: "https://www.npmjs.com/package/mjolnir-qa" },
    ],
    sidebar: [
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
    socialLinks: [
      { icon: "github", link: "https://github.com/Sergey-Bar/Mjolnir" },
    ],
    search: { provider: "local" },
    editLink: {
      pattern:
        "https://github.com/Sergey-Bar/Mjolnir/edit/main/site/:path",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Built by Sergey Bar",
    },
  },
});
