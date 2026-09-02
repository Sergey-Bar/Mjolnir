<script setup lang="ts">
/**
 * The scan report, rendered as real text.
 *
 * It used to ship as a 1194x3036 <img> displayed at 950x2416 CSS px —
 * 42% of the landing page's height, three and a half viewports of a
 * single static picture whose text could not be selected, copied or
 * searched, and which had to be panned sideways on a phone
 * (`.planning/SITE-REDESIGN-PLAN.md` §2, D2 and D3).
 *
 * Now the colour runs come from generated/report.json, parsed out of the
 * same committed asset the README uses, so the page cannot drift from
 * what the tool prints. The verdict block (51 columns — it fits a phone)
 * is always visible; the 107 lines of individual findings sit behind a
 * disclosure and scroll in their own box rather than stretching the page.
 *
 * The terminal keeps its own dark ground in both themes. It is a
 * faithful rendering of terminal output, and the reporter's palette is
 * built for a dark terminal; recolouring it for light mode would make it
 * a picture of something the tool never printed.
 */
import { ref } from "vue";
import report from "./generated/report.json";

const open = ref(false);
const copied = ref(false);

/** One scan, three output shapes — the same scan in all three. */
const TABS = [
  { id: "terminal", label: "terminal" },
  { id: "json", label: "JSON" },
  { id: "sarif", label: "SARIF" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const active = ref<TabId>("terminal");

/** Left/Right move between tabs, as the tablist pattern expects. */
function onTabKey(e: KeyboardEvent, i: number) {
  const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
  if (!delta) return;
  e.preventDefault();
  const next = (i + delta + TABS.length) % TABS.length;
  active.value = TABS[next].id;
  (e.currentTarget as HTMLElement).parentElement
    ?.querySelectorAll<HTMLElement>("[role=tab]")
    [next]?.focus();
}

/** The plain-text report, exactly as the terminal would have printed it. */
function plainText(): string {
  return [
    report.command,
    "",
    ...report.verdictLines.map((l) => l.text),
    ...report.findingLines.map((l) => l.text),
    ...report.footerLines.map((l) => l.text),
  ].join("\n");
}

function activeText(): string {
  if (active.value === "json") return report.formats.json?.excerpt ?? "";
  if (active.value === "sarif") return report.formats.sarif?.excerpt ?? "";
  return plainText();
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(activeText());
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard blocked — the text is selectable either way */
  }
}
</script>

<template>
  <figure class="term">
    <figcaption class="term-bar">
      <span class="dots" aria-hidden="true"><i /><i /><i /></span>
      <code class="term-cmd">{{ report.command }}</code>
      <button class="term-copy" type="button" @click="copyReport">
        {{ copied ? "copied ✓" : "copy" }}
      </button>
    </figcaption>

    <div class="tabs" role="tablist" aria-label="Report output format">
      <button
        v-for="(t, i) in TABS"
        :key="t.id"
        :id="`tab-${t.id}`"
        role="tab"
        type="button"
        class="tab"
        :class="{ on: active === t.id }"
        :aria-selected="active === t.id"
        :aria-controls="`panel-${t.id}`"
        :tabindex="active === t.id ? 0 : -1"
        @click="active = t.id"
        @keydown="onTabKey($event, i)"
      >
        {{ t.label }}
      </button>
    </div>

    <div
      v-show="active === 'terminal'"
      id="panel-terminal"
      role="tabpanel"
      aria-labelledby="tab-terminal"
      class="term-body"
    >
      <!-- Verdict — always visible, and narrow enough to read on a phone. -->
      <div class="block">
        <div v-for="(l, i) in report.verdictLines" :key="'v' + i" class="ln">
          <span
            v-for="(s, j) in l.spans"
            :key="j"
            :style="s.c ? { color: s.c } : undefined"
            >{{ s.t }}</span
          >
        </div>
      </div>

      <!-- Findings — opt-in, and scrolling inside its own box so the page
           body never scrolls sideways. -->
      <details
        class="more"
        @toggle="open = ($event.target as HTMLDetailsElement).open"
      >
        <summary>
          <span class="chev" aria-hidden="true">›</span>
          {{ open ? "Hide" : "Show" }} all {{ report.findings }} findings
          <span class="muted">({{ report.findingLines.length }} lines)</span>
        </summary>
        <div class="scrollx">
          <div class="block">
            <div
              v-for="(l, i) in report.findingLines"
              :key="'f' + i"
              class="ln"
            >
              <span
                v-for="(s, j) in l.spans"
                :key="j"
                :style="s.c ? { color: s.c } : undefined"
                >{{ s.t }}</span
              >
            </div>
          </div>
        </div>
      </details>

      <!-- Footer — prose, so it wraps rather than scrolling. -->
      <div class="block foot">
        <div
          v-for="(l, i) in report.footerLines"
          :key="'t' + i"
          class="ln wrap"
        >
          <span
            v-for="(s, j) in l.spans"
            :key="j"
            :style="s.c ? { color: s.c } : undefined"
            >{{ s.t }}</span
          >
        </div>
      </div>
    </div>

    <!-- The machine-readable shapes of the same scan. Each is the real
         envelope with the findings array sliced to its first entry, so
         the shape is honest and the page stays light. -->
    <div
      v-for="f in [
        { id: 'json', data: report.formats.json, name: 'demo-report.json' },
        { id: 'sarif', data: report.formats.sarif, name: 'demo-report.sarif' },
      ]"
      v-show="active === f.id"
      :key="f.id"
      :id="`panel-${f.id}`"
      role="tabpanel"
      :aria-labelledby="`tab-${f.id}`"
      class="term-body"
    >
      <div class="scrollx">
        <div class="block">{{ f.data?.excerpt }}</div>
      </div>
      <p class="excerpt-note">
        Excerpt — 1 of {{ f.data?.total }} findings.
        <a :href="f.data?.href" target="_blank" rel="noreferrer"
          >{{ f.name }} in full →</a
        >
      </p>
    </div>
  </figure>
</template>

<style scoped>
/* The reporter's own ground (readme-svg.ts BG / TITLE_BAR_BG), kept in
   both themes — see the component comment. */
.term {
  /* The SAME stack scripts/readme-svg.ts declares on the SVG. The site's
     usual mono is JetBrains Mono from Google Fonts, whose served subsets
     do not carry U+2500 box-drawing or U+2580 block elements — those fell
     back to another font with a different advance, so the deduction table
     and the score bars came out up to 3.6 columns narrow against the rest
     of the line. One font for every glyph keeps the columns true. */
  --term-mono:
    ui-monospace, "SF Mono", "Cascadia Code", "Cascadia Mono", Consolas,
    "DejaVu Sans Mono", Menlo, monospace;

  --term-bg: #14171c;
  --term-bar: #20242b;
  --term-fg: #d7d3c8;
  /* Raised from the reporter's #7c8590, which axe-core measured at
     4.16:1 on the title bar — below AA. This token only paints the
     terminal's own chrome (command line, copy button, disclosure);
     the report's colours still come from report.json, so the
     rendering stays faithful to what the tool actually printed. */
  --term-dim: #949ca8;
  --term-line: rgba(215, 211, 200, 0.14);

  margin: 2.6rem 0 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--term-line);
  background: var(--term-bg);
  color: var(--term-fg);
  box-shadow: 0 40px 80px -40px rgba(0, 0, 0, 0.7);
}

.term-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.9rem;
  background: var(--term-bar);
  border-bottom: 1px solid var(--term-line);
}
.dots {
  display: flex;
  gap: 0.4rem;
  flex: none;
}
.dots i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: rgba(215, 211, 200, 0.25);
}
.term-cmd {
  flex: 1;
  min-width: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--term-dim);
  background: none;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.term-copy {
  flex: none;
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: var(--term-dim);
  background: rgba(215, 211, 200, 0.07);
  border: 1px solid var(--term-line);
  border-radius: 5px;
  padding: 0.22rem 0.55rem;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}
.term-copy:hover {
  color: var(--term-fg);
  border-color: rgba(215, 211, 200, 0.3);
}
.term-copy:focus-visible {
  outline: 2px solid var(--mj-aurora, #37abbd);
  outline-offset: 2px;
}

.tabs {
  display: flex;
  gap: 0.15rem;
  padding: 0 0.55rem;
  background: var(--term-bar);
  border-bottom: 1px solid var(--term-line);
}
.tab {
  appearance: none;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 0.5rem 0.7rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  color: var(--term-dim);
  cursor: pointer;
}
.tab:hover {
  color: var(--term-fg);
}
.tab.on {
  color: var(--term-fg);
  border-bottom-color: var(--mj-gold-bright, #e6bd57);
}
.tab:focus-visible {
  outline: 2px solid var(--mj-aurora, #37abbd);
  outline-offset: -3px;
}

.excerpt-note {
  margin: 0.7rem 0 0;
  padding: 0.7rem 1.1rem 0;
  border-top: 1px solid var(--term-line);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--term-dim);
}
.excerpt-note a {
  color: var(--mj-gold-bright, #e6bd57);
}

.term-body {
  padding: 1rem 0 0.4rem;
}

/* 51 columns for the verdict; the clamp keeps it inside a 360px screen
   without the sideways drag the old image needed. */
.block {
  font-family: var(--term-mono);
  font-size: clamp(0.6rem, 2.55vw, 0.82rem);
  line-height: 1.45;
  white-space: pre;
  padding: 0 1.1rem;
}
.ln {
  min-height: 1.45em;
}
.ln.wrap {
  white-space: pre-wrap;
}

.scrollx {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.4rem;
}

.more {
  margin: 0.9rem 0 0.2rem;
  border-top: 1px solid var(--term-line);
}
.more > summary {
  list-style: none;
  cursor: pointer;
  padding: 0.7rem 1.1rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--term-dim);
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.more > summary::-webkit-details-marker {
  display: none;
}
.more > summary:hover {
  color: var(--term-fg);
}
.more > summary:focus-visible {
  outline: 2px solid var(--mj-aurora, #37abbd);
  outline-offset: -2px;
}
.chev {
  display: inline-block;
  transition: transform 0.18s ease;
}
.more[open] .chev {
  transform: rotate(90deg);
}
.muted {
  /* A dimmer colour, not opacity. `opacity: 0.7` blended --term-dim
     toward the background and dropped this line back under AA — axe
     caught it on the line-count hint after the first contrast fix. */
  color: #8b949f;
}

.foot {
  border-top: 1px solid var(--term-line);
  padding-top: 0.8rem;
  margin-top: 0.4rem;
  color: var(--term-dim);
}

@media (prefers-reduced-motion: reduce) {
  .chev,
  .term-copy {
    transition: none;
  }
}
</style>
