# PR report experience

The report answers three questions in order: what can be concluded, what needs attention, and what to do next. It is a GitHub comment, so use supported Markdown, native alerts, semantic HTML, collapsible details and fenced blocks. Custom fonts, CSS, JavaScript buttons and animated dashboard controls are not part of this surface.

## Reading order

1. Identity and incomplete-analysis warning, when applicable.
2. A status badge and a practical next action. Incomplete analysis takes precedence over the numeric score band.
3. A two-column summary: finding counts and scope, trust depth, score, evidence coverage. Keep score-cap explanations outside the cells.
4. Findings, with errors expanded and warnings/information collapsed. Severity is not a claim about the repository's merge policy.
5. Confidence, baseline changes and artifact identity, available on demand.
6. Exact next commands, followed by an optional AI investigation prompt.
7. A short support footer with documentation, issue, star and social links.

The report does not claim that Mjölnir ran tests, that zero findings prove correctness, or that a comment controls merging. Existing report markers, scan semantics and machine contracts remain authoritative.

## Colour and accessibility

Static status SVGs are generated from `src/brand/tokens.ts` using `npm run brand:pr-status`. Critical, warning, trusted, forged and unmeasured use the canonical score palette; incomplete uses the warning status token. Labels and image alternative text carry the meaning when images are unavailable. Colour is supplementary.

The assets use stable URLs on the project's main branch. New badge assets become available after merge; previews on unmerged branches should use their local copies. GitHub controls comment typography, theme, Markdown sanitization and code-block copy controls.

## AI investigation handover

The collapsed prompt includes scan metadata and explicit placeholders for the report link, disputed behavior and expectations. The agent must reproduce the same version, commit and scope, inspect evidence, distinguish tool defects from configuration issues, and validate a justified fix. It must not suppress findings or weaken tests to improve a score. Publishing an issue or pushing a change requires the user's approval.

Only report metadata is supplied; source files, finding prose and repository URLs are not automatically placed into the prompt. Metadata is serialized as JSON with fence/HTML delimiters escaped. The comment-size guard may omit this optional block on exceptionally large reports.

## Sharing

X, Mastodon, Reddit, LinkedIn and Facebook links open their draft or sharing flows. Every destination receives only the public Mjölnir website URL and, where supported, neutral project copy. No PR URL, scan result or private repository information is embedded. Users review and submit their own posts. A copyable text fallback is provided.

Mastodon uses its official server-selection share service. LinkedIn and Facebook accept the project URL; each platform decides whether and how to display its social preview card. The website already supplies social-card metadata. Neither a prefilled endorsement nor a successful preview-card fetch is guaranteed.

## Large reports

The renderer retains the existing finding limit per severity. If the complete comment exceeds GitHub's character limit, optional actions are removed first, then whole finding entries. HTML containers and code fences remain intact. Exceptionally large metadata is removed as a complete block. A visible truncation notice points to the local verbose/JSON report.

## Validation

Tests cover incomplete scans, score presentation, structural rendering, determinism, CLI integration, social destination encoding, prompt delimiter injection, brand-token parity and complete-block truncation. GitHub's Markdown API can validate sanitization with synthetic examples. A local HTML wrapper is a preview, not a guarantee of GitHub's exact theme or mobile layout. Social login and final posting remain platform-controlled.
