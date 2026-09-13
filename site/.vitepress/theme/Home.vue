<script setup lang="ts">
import { ref } from "vue";
import { withBase } from "vitepress";
import { TRUST_RUNGS } from "../../../src/brand/symbols";
import StreamTerm from "./StreamTerm.vue";
import Term from "./Term.vue";
import { LOGOS } from "./logos";
import { data } from "./home.data";

const COMMAND = "npx mjolnir-qa@latest";
const CI_COMMAND = `${COMMAND} --scope changed`;
const MCP_COMMAND = "claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp";
const ACTION = [
  "- uses: Sergey-Bar/Mjolnir@v1",
  "  with:",
  "    scope: changed",
  "    fail-on: error",
].join("\n");

const copied = ref("");
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  copied.value = text;
  setTimeout(() => {
    if (copied.value === text) copied.value = "";
  }, 1600);
}

/** Tools Simple Icons has no mark for get their initials, never a fake logo. */
const MONOGRAM: Record<string, string> = {
  Playwright: "PW",
  TestNG: "NG",
  NUnit: "NU",
  xUnit: "xU",
  MSTest: "MS",
  "Azure Pipelines": "AP",
};
const monogram = (name: string) => MONOGRAM[name] ?? name.slice(0, 2);

const CHAPTERS = [
  {
    id: "ch-ci",
    title: "CI integrity",
    body: "The workflow tricks that keep a failed run green.",
  },
  {
    id: "ch-findings",
    title: "Findings",
    body: "Where each one is, how sure it is, and the fix.",
  },
  {
    id: "ch-score",
    title: "Worthiness score",
    body: "One number, with the arithmetic shown.",
  },
  {
    id: "ch-trust",
    title: "Evidence and trust",
    body: "Read from your code, or seen in a real run.",
  },
  {
    id: "ch-runtime",
    title: "Runtime forensics",
    body: "True flakes and fragile selectors, from real runs.",
  },
  {
    id: "ch-rules",
    title: "Measured rules",
    body: "A published false-positive rate for each rule.",
  },
  {
    id: "ch-ship",
    title: "CI and AI agents",
    body: "Gate the pull request, and verify the agent's fix.",
  },
];
const num = (i: number) => String(i + 1).padStart(2, "0");

/** The page walks the aurora top to bottom: green, then cyan, then violet. */
const STOPS = [
  "var(--mj-aurora-green)",
  "var(--mj-aurora-cyan)",
  "var(--mj-aurora-violet)",
];
function chColor(i: number) {
  const t = i / (CHAPTERS.length - 1);
  const [from, to, local] =
    t <= 0.5
      ? [STOPS[0], STOPS[1], t / 0.5]
      : [STOPS[1], STOPS[2], (t - 0.5) / 0.5];
  return `color-mix(in oklch, ${from} ${Math.round((1 - local) * 100)}%, ${to})`;
}
const chStyle = (id: string) => ({
  "--ch": chColor(CHAPTERS.findIndex((c) => c.id === id)),
});
const chapter = (id: string) => {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return { n: num(i), ...CHAPTERS[i] };
};

const PLAIN: Record<string, { name: string; body: string }> = {
  L0: {
    name: "Noted",
    body: "Worth knowing. Not a claim that anything is wrong.",
  },
  L1: {
    name: "Looks like it",
    body: "A pattern that usually means the problem was matched.",
  },
  L2: { name: "Proven in code", body: "The code as written has the problem." },
  L3: {
    name: "The file ran",
    body: "A real run executed the file the finding is in.",
  },
  L4: {
    name: "The test ran",
    body: "A real run executed the test the finding is in.",
  },
  L5: {
    name: "The run agrees",
    body: "The run's own result confirms the problem.",
  },
};
const levels = TRUST_RUNGS.map((r, i) => ({ ...r, ...PLAIN[r.level], i }));
const fromCode = levels.filter((l) => !l.runtime);
const fromRun = levels.filter((l) => l.runtime);

const s = data.score;
const span = (b: { min: number; max: number }) =>
  `${((b.max - b.min + 1) / (s.outOf + 1)) * 100}%`;
const marker = `${((s.demo.score + 0.5) / (s.outOf + 1)) * 100}%`;

const EXIT_CODES = [
  { code: 0, meaning: "Clean at the gate" },
  { code: 1, meaning: "Findings at or above the gate" },
  { code: 2, meaning: "Partial scan. Never blocks." },
  { code: 10, meaning: "Usage error" },
  { code: 20, meaning: "Internal error" },
];

const LIMITS = [
  {
    claim: "It does not run your tests.",
    detail: "A clean scan is not a passing suite.",
  },
  {
    claim: "It cannot tell when an assertion checks the wrong value.",
    code: "expect(total).toBe(41)",
    detail: "looks healthy to it.",
  },
  {
    claim: "A perfect score means zero findings.",
    detail: "Whether the suite covers your real risk is a separate question.",
  },
  {
    claim: "An empty repo scores null.",
    detail: "With no tests to read, it has nothing to score.",
  },
];
</script>

<template>
  <main class="mj">
    <!-- ============ HERO ============ -->
    <section class="hero-band" aria-labelledby="mj-title">
      <div class="sky" aria-hidden="true" />
      <div class="hero wrap">
        <h1 id="mj-title" class="title">
          <span class="was">Tests tell you what passed.</span>
          <span>Mjölnir tells you what you can trust.</span>
        </h1>
        <div class="hero-grid">
          <div>
            <p class="lede">
              Mjölnir finds tests that cannot fail and pipelines that cannot go
              red, then scores how far you can trust the result.
            </p>
            <div class="actions">
              <div class="key">
                <code>{{ COMMAND }}</code>
                <button
                  type="button"
                  :aria-label="`Copy ${COMMAND}`"
                  @click="copy(COMMAND)"
                >
                  {{ copied === COMMAND ? "Copied" : "Copy" }}
                </button>
              </div>
              <a :href="withBase('/guide/getting-started')">Read the guide</a>
            </div>
          </div>
          <div>
            <StreamTerm
              :command="data.stream.command"
              :lines="data.stream.lines"
              title="demo-repo"
            />
            <p class="fine">A real scan of the demo repo, replayed.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ WORKS WITH ============ -->
    <section class="wrap" aria-labelledby="mj-stack">
      <div class="stack">
        <h2 id="mj-stack" class="stack-title">Works with your stack</h2>
        <div v-for="g in data.stack" :key="g.label" class="stack-group">
          <p class="stack-label">{{ g.label }}</p>
          <ul class="logos">
            <li v-for="name in g.items" :key="name" class="logo">
              <svg
                v-if="LOGOS[name]"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path :d="LOGOS[name]" fill="currentColor" />
              </svg>
              <span v-else class="mono" aria-hidden="true">{{
                monogram(name)
              }}</span>
              <span class="logo-name">{{ name }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ============ OVERVIEW ============ -->
    <section class="wrap overview" aria-labelledby="mj-overview">
      <h2 id="mj-overview" class="overview-title">What a scan covers</h2>
      <ol class="toc">
        <li
          v-for="(c, i) in CHAPTERS"
          :key="c.id"
          :style="{ '--ch': chColor(i) }"
        >
          <a :href="`#${c.id}`">
            <span class="toc-n">{{ num(i) }}</span>
            <span class="toc-text">
              <span class="toc-title">{{ c.title }}</span>
              <span class="toc-body">{{ c.body }}</span>
            </span>
            <svg class="toc-go" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 3v10M3.5 8.5 8 13l4.5-4.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
          </a>
        </li>
      </ol>
    </section>

    <!-- ============ 01 CI INTEGRITY ============ -->
    <section
      :id="'ch-ci'"
      class="chapter wrap"
      :style="chStyle('ch-ci')"
      aria-labelledby="mj-ci"
    >
      <header class="ch-side">
        <p class="ch-tag">
          <span>{{ chapter("ch-ci").n }}</span
          >{{ chapter("ch-ci").title }}
        </p>
        <h2 id="mj-ci">Catches the CI tricks that keep a failed run green.</h2>
        <p>
          Each of these lines looks deliberate in review. Mjölnir reads the
          workflow and flags every one on the line that causes it.
        </p>
        <a class="more" :href="withBase('/guide/ci')">Read the CI guide</a>
      </header>
      <div class="ch-main">
        <ul class="masks">
          <li v-for="m in data.masks" :key="m.id">
            <code class="snip">{{ m.code }}</code>
            <p>{{ m.effect }}</p>
            <a :href="withBase(`/rules/${m.id}`)"
              ><span class="rule">{{ m.id }}</span> {{ m.title }}</a
            >
          </li>
        </ul>
        <figure class="anno">
          <figcaption>{{ data.annotation.file }}</figcaption>
          <div class="anno-body">
            <template v-for="l in data.annotation.context" :key="l.n">
              <div class="acl" :class="{ hit: l.n === data.annotation.line }">
                <span class="aln">{{ l.n }}</span>
                <span class="als">{{ l.s }}</span>
              </div>
              <div v-if="l.n === data.annotation.line" class="acard">
                <p class="acard-head">
                  <span class="acard-by">Mjölnir</span>
                  <a :href="withBase(`/rules/${data.annotation.rule}`)">{{
                    data.annotation.rule
                  }}</a>
                  <span>{{ data.annotation.title }}</span>
                </p>
                <p class="acard-stamp">{{ data.annotation.stamp }}</p>
                <p class="acard-msg">{{ data.annotation.message }}</p>
                <p class="acard-fix">
                  <span>Fix</span>{{ data.annotation.fix }}
                </p>
              </div>
            </template>
          </div>
        </figure>
        <p class="fine">
          The real finding from the demo repo, on the line that caused it. With
          SARIF upload or <code class="ic">mjolnir summary</code>, this is how
          it shows up in a pull request.
        </p>
      </div>
    </section>

    <!-- ============ 02 FINDINGS ============ -->
    <section
      :id="'ch-findings'"
      class="chapter wrap"
      :style="chStyle('ch-findings')"
      aria-labelledby="mj-findings"
    >
      <header class="ch-side">
        <p class="ch-tag">
          <span>{{ chapter("ch-findings").n }}</span
          >{{ chapter("ch-findings").title }}
        </p>
        <h2 id="mj-findings">
          Every finding says where, how sure, and how to fix it.
        </h2>
        <p>
          These are the first findings from the demo repo scan, exactly as the
          terminal prints them.
        </p>
        <a class="more" :href="withBase('/guide/what-it-checks')"
          >See what it checks</a
        >
      </header>
      <div class="ch-main">
        <Term :lines="data.findings" title="Findings" />
        <dl class="legend">
          <div>
            <dt>Where</dt>
            <dd>
              <code class="tok">{{ data.legend.where }}</code>
              The rule, and the exact file and line.
            </dd>
          </div>
          <div>
            <dt>How sure</dt>
            <dd>
              <code class="tok">{{ data.legend.evidence }}</code>
              E2 is proven in code and counts in full. E1 is a matching pattern
              and counts half. E0 is an observation and costs nothing.
            </dd>
          </div>
          <div>
            <dt>How often the rule is wrong</dt>
            <dd>
              <code class="tok">{{ data.legend.fp }}</code>
              Measured on hand-checked findings from open-source repos.
            </dd>
          </div>
          <div>
            <dt>The fix</dt>
            <dd>
              <code class="tok">Fix</code>
              The change that closes the finding. Re-run the scan to confirm it.
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- ============ 03 SCORE ============ -->
    <section
      :id="'ch-score'"
      class="chapter wrap"
      :style="chStyle('ch-score')"
      aria-labelledby="mj-score"
    >
      <header class="ch-side">
        <p class="ch-tag">
          <span>{{ chapter("ch-score").n }}</span
          >{{ chapter("ch-score").title }}
        </p>
        <h2 id="mj-score">One score, with the arithmetic shown.</h2>
        <p>
          The score measures the test suite, not your product. Every point it
          takes off is listed, and the formula has no hidden second model.
        </p>
        <a class="more" :href="withBase('/guide/scoring')"
          >Read how the score works</a
        >
      </header>
      <div class="ch-main">
        <figure class="scale">
          <div class="scale-bar">
            <span
              v-for="b in s.bands"
              :key="b.min"
              class="scale-seg"
              :class="`tone-${b.tone}`"
              :style="{ width: span(b) }"
            />
            <span class="scale-mark" :style="{ left: marker }">
              <span class="scale-pin" />
              <span class="scale-read">demo repo · {{ s.demo.score }}</span>
            </span>
          </div>
          <div class="scale-legend">
            <span
              v-for="b in s.bands"
              :key="b.min"
              class="scale-key"
              :style="{ width: span(b) }"
            >
              <span class="scale-verdict" :class="`tone-${b.tone}`">{{
                b.verdict
              }}</span>
              <span class="scale-range">{{
                b.min === b.max ? b.min : `${b.min}–${b.max}`
              }}</span>
            </span>
          </div>
        </figure>

        <div class="math">
          <p class="math-title">The demo repo, step by step</p>
          <dl>
            <div>
              <dt>Deductions</dt>
              <dd>
                <b>{{ s.demo.raw }}</b> points across
                <b>{{ s.demo.declarations }}</b> test declarations
              </dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>
                {{ s.demo.raw }} ÷ ({{ s.demo.declarations }} +
                {{ s.demo.smoothing }}) = <b>{{ s.demo.rate }}</b>
              </dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd>
                {{ s.outOf }} − min({{ s.outOf }}, {{ s.demo.rate }} ×
                {{ s.demo.k }}) = <b>{{ s.outOf - s.demo.cut }}</b>
                <span class="tone-warning">{{ s.demo.verdict }}</span>
              </dd>
            </div>
          </dl>
          <p class="fine">
            Dividing by test declarations means adding empty spec files cannot
            raise the score. Three ceilings then cap it, and the scoring guide
            lists them.
          </p>
        </div>
      </div>
    </section>

    <!-- ============ 04 EVIDENCE AND TRUST ============ -->
    <section
      :id="'ch-trust'"
      class="chapter wrap"
      :style="chStyle('ch-trust')"
      aria-labelledby="mj-trust"
    >
      <header class="ch-side">
        <p class="ch-tag">
          <span>{{ chapter("ch-trust").n }}</span
          >{{ chapter("ch-trust").title }}
        </p>
        <h2 id="mj-trust">
          Knows the difference between reading code and seeing it run.
        </h2>
        <p>
          Most findings come from reading your code. Give Mjölnir the report of
          a real test run and it can confirm the code actually ran.
        </p>
        <a class="more" :href="withBase('/reference/terminology')"
          >Read the definitions</a
        >
      </header>
      <div class="ch-main">
        <div class="stamps">
          <div>
            <Term :lines="data.staticCard" title="Read from the code" />
            <p class="fine">
              Mjölnir read the workflow file. Nothing ran, so this finding stays
              at L2, proven in code.
            </p>
          </div>
          <div>
            <Term :lines="data.runtimeCard" title="Seen in a real run" />
            <p class="fine">
              The Playwright report shows this spec file ran, so the finding
              reaches L3.
            </p>
          </div>
        </div>
        <div class="levels">
          <div>
            <h3>From your code</h3>
            <ol>
              <li v-for="l in fromCode" :key="l.level">
                <span
                  class="lv-bar"
                  :style="{ height: `${10 + l.i * 5}px`, background: l.color }"
                  aria-hidden="true"
                />
                <span class="lv-code">{{ l.level }}</span>
                <span class="lv-name">{{ l.name }}</span>
                <span class="lv-body">{{ l.body }}</span>
              </li>
            </ol>
          </div>
          <div class="run">
            <h3>From a real run</h3>
            <ol>
              <li v-for="l in fromRun" :key="l.level">
                <span
                  class="lv-bar"
                  :style="{ height: `${10 + l.i * 5}px`, background: l.color }"
                  aria-hidden="true"
                />
                <span class="lv-code">{{ l.level }}</span>
                <span class="lv-name">{{ l.name }}</span>
                <span class="lv-body">{{ l.body }}</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 05 RUNTIME ============ -->
    <section
      :id="'ch-runtime'"
      class="chapter wrap"
      :style="chStyle('ch-runtime')"
      aria-labelledby="mj-runtime"
    >
      <header class="ch-side">
        <p class="ch-tag">
          <span>{{ chapter("ch-runtime").n }}</span
          >{{ chapter("ch-runtime").title }}
        </p>
        <h2 id="mj-runtime">Reads what actually ran.</h2>
        <p>
          Point it at a folder of test results. Playwright JSON, Jest and Vitest
          JSON, and JUnit XML from any runner all work.
        </p>
        <a class="more" :href="withBase('/guide/forensics')"
          >Read the forensics guide</a
        >
      </header>
      <div class="ch-main stack-v">
        <div>
          <Term
            :lines="data.forensics"
            title="mjolnir forensics ./test-results/"
          />
          <p class="fine">
            TRUE-FLAKE means the test failed at least once and then passed.
            Mjölnir flags it even though the final check was green.
          </p>
        </div>
        <div>
          <Term :lines="data.selectors" title="mjolnir doctor:playwright" />
          <p class="fine">
            Selector health grades how each locator finds its element. It
            measures resilience, not correctness.
          </p>
        </div>
      </div>
    </section>

    <!-- ============ 06 MEASURED RULES ============ -->
    <section
      :id="'ch-rules'"
      class="chapter wrap"
      :style="chStyle('ch-rules')"
      aria-labelledby="mj-rules"
    >
      <header class="ch-side">
        <p class="ch-tag">
          <span>{{ chapter("ch-rules").n }}</span
          >{{ chapter("ch-rules").title }}
        </p>
        <h2 id="mj-rules">
          {{ data.rules.measured }} of {{ data.rules.total }} rules are measured
          on real code.
        </h2>
        <p>
          Each rate comes from at least 10 hand-classified findings in
          open-source repos. Rules with bad rates stay listed, in quarantine.
        </p>
        <a class="more" :href="withBase('/rules/')"
          >See all {{ data.rules.total }} rules</a
        >
      </header>
      <div class="ch-main">
        <div class="table-wrap">
          <table class="rules">
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">Catches</th>
                <th scope="col" class="n">False positives</th>
                <th scope="col" class="n">Sample</th>
              </tr>
            </thead>
            <tbody v-for="g in data.rules.groups" :key="g.tier">
              <tr>
                <th scope="rowgroup" colspan="4">{{ g.label }}</th>
              </tr>
              <tr v-for="r in g.rows" :key="r.id">
                <td>
                  <a :href="withBase(`/rules/${r.id}`)">{{ r.id }}</a>
                </td>
                <td>{{ r.title }}</td>
                <td class="n" :class="`fp-${r.tone}`">{{ r.rate }}%</td>
                <td class="n sample">n={{ r.n }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ============ 07 CI AND AGENTS ============ -->
    <section
      :id="'ch-ship'"
      class="chapter wrap"
      :style="chStyle('ch-ship')"
      aria-labelledby="mj-ship"
    >
      <header class="ch-side">
        <p class="ch-tag">
          <span>{{ chapter("ch-ship").n }}</span
          >{{ chapter("ch-ship").title }}
        </p>
        <h2 id="mj-ship">Gates the pull request, and checks the agent.</h2>
        <p>
          Scan only what a branch touched, or hand the findings to an AI agent
          and let the re-scan prove the fix.
        </p>
        <a class="more" :href="withBase('/guide/agents')">Connect an agent</a>
      </header>
      <div class="ch-main">
        <div class="flows">
          <div class="flow">
            <h3>In CI</h3>
            <p>
              With <code class="ic">--scope changed</code> it scans the files
              the branch touched and exits non-zero on new findings.
            </p>
            <div class="key">
              <code>{{ CI_COMMAND }}</code>
              <button
                type="button"
                :aria-label="`Copy ${CI_COMMAND}`"
                @click="copy(CI_COMMAND)"
              >
                {{ copied === CI_COMMAND ? "Copied" : "Copy" }}
              </button>
            </div>
            <p class="fine">Or add the GitHub Action:</p>
            <pre class="snippet"><code>{{ ACTION }}</code></pre>
          </div>
          <div class="flow">
            <h3>With an AI agent</h3>
            <p>
              The agent writes the fix and Mjölnir re-scans to prove it. Each
              finding in the handoff says whether it is safe to apply or needs a
              person to confirm.
            </p>
            <div class="key">
              <code>{{ MCP_COMMAND }}</code>
              <button
                type="button"
                :aria-label="`Copy ${MCP_COMMAND}`"
                @click="copy(MCP_COMMAND)"
              >
                {{ copied === MCP_COMMAND ? "Copied" : "Copy" }}
              </button>
            </div>
          </div>
        </div>
        <dl class="codes">
          <div v-for="c in EXIT_CODES" :key="c.code">
            <dt>{{ c.code }}</dt>
            <dd>{{ c.meaning }}</dd>
          </div>
        </dl>
        <p class="fine">
          Exit codes are frozen, so you can build CI logic on them.
        </p>
      </div>
    </section>

    <!-- ============ LIMITS + CLOSE ============ -->
    <section class="wrap closing" aria-labelledby="mj-limits">
      <div class="limits-box">
        <h2 id="mj-limits">Where the score stops</h2>
        <ul class="limits">
          <li v-for="l in LIMITS" :key="l.claim">
            {{ l.claim }}
            <span class="lim-detail"
              ><code v-if="l.code" class="ic">{{ l.code }}</code>
              {{ l.detail }}</span
            >
          </li>
        </ul>
      </div>
      <div class="cta">
        <h2 id="mj-run">Run it on your repo.</h2>
        <div class="key">
          <code>{{ COMMAND }}</code>
          <button
            type="button"
            :aria-label="`Copy ${COMMAND}`"
            @click="copy(COMMAND)"
          >
            {{ copied === COMMAND ? "Copied" : "Copy" }}
          </button>
        </div>
        <div class="close-links">
          <a :href="withBase('/guide/getting-started')">Read the guide</a>
          <a href="https://github.com/Sergey-Bar/Mjolnir">View on GitHub</a>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.mj {
  --edge: clamp(20px, 5vw, 48px);
  --well: var(--mj-ink-950);
  --line: var(--vp-c-divider);
  --line-2: var(--vp-c-border);
  --t1: var(--vp-c-text-1);
  --t2: var(--vp-c-text-2);
  --t3: var(--vp-c-text-3);
  --settle: cubic-bezier(0.2, 0, 0, 1);
  color: var(--t1);
  font-family: var(--vp-font-family-base);
  line-height: 1.7;
  overflow-x: clip;
}

/* The page sits inside .vp-doc; take back its prose defaults. */
.mj :is(h1, h2, h3) {
  margin: 0;
  padding: 0;
  border: 0;
  font-family: var(--vp-font-family-base);
  text-wrap: balance;
}
.mj h2::before {
  content: none;
}
/* :where keeps this at class weight, so each component's own margins win. */
.mj :where(p, ul, ol, dl, dd, figure) {
  margin: 0;
  line-height: inherit;
}
.mj :is(ul, ol) {
  padding: 0;
  list-style: none;
}
.mj li + li {
  margin-top: 0;
}
.mj a {
  color: inherit;
  font-weight: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-decoration-color: var(--line-2);
  text-underline-offset: 0.24em;
  transition:
    text-decoration-color 120ms var(--settle),
    color 120ms var(--settle);
}
.mj a:hover {
  text-decoration-color: var(--t1);
}
.mj code {
  padding: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font-family: var(--vp-font-family-mono);
  font-size: inherit;
}
.mj .ic {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-size: 0.88em;
}

.wrap {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--edge);
}
.n {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rule {
  font-family: var(--vp-font-family-mono);
  font-size: 0.92em;
  color: var(--t2);
}
.fine {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--t3);
}
.more {
  display: inline-block;
  margin-top: 20px;
  font-size: 15px;
  color: var(--t2);
}
.mj h3 {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--t1);
}

.tone-critical {
  color: var(--mj-unworthy);
}
.tone-warning {
  color: var(--mj-needswork);
}
.tone-trusted {
  color: var(--mj-trusted);
}
.tone-forged {
  color: var(--mj-forged-hot);
}

/* ---- the command key: the page's one primary action ---- */
.key {
  display: inline-flex;
  max-width: 100%;
  border: 1px solid var(--line-2);
  border-radius: 6px;
  background: var(--well);
  overflow: hidden;
}
.key code {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 20px;
  color: var(--t1);
  white-space: nowrap;
  overflow-x: auto;
}
.key code::before {
  content: "$ ";
  color: var(--t3);
}
.key button {
  flex: none;
  min-width: 84px;
  min-height: 44px;
  padding: 0 18px;
  border-left: 1px solid var(--line-2);
  background: var(--t1);
  color: var(--mj-ink-950);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    opacity 120ms var(--settle),
    transform 120ms var(--settle);
}
.key button:hover {
  opacity: 0.9;
}
.key button:active {
  transform: scale(0.98);
}

/* ---- hero ---- */
.hero {
  padding-top: calc(var(--vp-nav-height) + clamp(40px, 6vw, 80px));
  padding-bottom: clamp(48px, 6vw, 72px);
}
.title {
  font-size: clamp(34px, 4.4vw, 54px);
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: -0.035em;
  color: var(--t1);
}
.title span {
  display: block;
}
.title .was {
  color: var(--t3);
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 6fr);
  gap: clamp(32px, 5vw, 64px);
  align-items: start;
  margin-top: clamp(32px, 4.5vw, 52px);
}
.lede {
  max-width: 34ch;
  font-size: 18px;
  line-height: 1.6;
  color: var(--t2);
}
.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  margin-top: 32px;
  font-size: 15px;
  color: var(--t2);
}

/* ---- works with ---- */
.stack {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 9fr);
  column-gap: clamp(32px, 5vw, 72px);
  row-gap: 22px;
  padding-block: 36px;
  border-block: 1px solid var(--line);
}
.mj .stack-title {
  grid-row: 1 / span 3;
  font-size: 15px;
  font-weight: 500;
  color: var(--t2);
}
.stack-group {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.stack-label {
  padding-top: 6px;
  font-size: 13px;
  color: var(--t3);
}
.logos {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}
.logo {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 6px 12px 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  color: var(--t3);
  transition:
    color 200ms var(--settle),
    border-color 200ms var(--settle),
    background-color 200ms var(--settle);
}
.logo svg {
  width: 20px;
  height: 20px;
  flex: none;
  opacity: 0.7;
  transition:
    opacity 200ms var(--settle),
    filter 200ms var(--settle);
}
.mono {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex: none;
  border: 1px solid currentColor;
  border-radius: 5px;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0;
  /* Colour, not opacity: axe composites opacity into the ratio, and at
     0.7 these six tiles measured below AA. */
  color: var(--vp-c-text-2);
  transition: color 200ms var(--settle);
}
.logo:hover {
  color: var(--t1);
  border-color: var(--line-2);
  background: var(--vp-c-bg-soft);
}
.logo:hover svg,
.logo:hover .mono {
  opacity: 1;
}
.logo:hover svg {
  filter: drop-shadow(
    0 0 6px color-mix(in srgb, var(--vp-c-text-1) 45%, transparent)
  );
}

/* ---- overview ---- */
.overview {
  padding-block: clamp(56px, 7vw, 88px) clamp(24px, 3vw, 40px);
}
.mj .overview-title {
  font-size: clamp(24px, 2.6vw, 30px);
  font-weight: 500;
  letter-spacing: -0.02em;
}
.toc {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: clamp(32px, 5vw, 64px);
  margin-top: 28px;
}
.toc li {
  border-top: 1px solid var(--line);
}
.mj .toc a {
  display: grid;
  grid-template-columns: 3ch minmax(0, 1fr) 16px;
  gap: 16px;
  align-items: start;
  padding: 18px 0;
  text-decoration: none;
}
.toc-n {
  padding-top: 2px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--t3);
}
.toc-text {
  display: grid;
  gap: 2px;
}
.toc-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--t1);
}
.toc-body {
  font-size: 14px;
  line-height: 1.5;
  color: var(--t2);
}
.toc-go {
  width: 16px;
  height: 16px;
  margin-top: 4px;
  color: var(--t3);
  transition:
    transform 200ms var(--settle),
    color 200ms var(--settle);
}
.mj .toc a:hover .toc-go {
  color: var(--t1);
  transform: translateY(3px);
}

/* ---- chapters: one frame for every feature ---- */
.chapter {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 9fr);
  gap: clamp(32px, 4vw, 56px);
  padding-block: clamp(56px, 7vw, 96px);
  scroll-margin-top: var(--vp-nav-height);
}
.chapter::before,
.closing::before {
  content: "";
  position: absolute;
  top: 0;
  left: var(--edge);
  right: var(--edge);
  border-top: 1px solid var(--line);
}
.overview + .chapter {
  margin-top: clamp(24px, 3vw, 40px);
}
.ch-side {
  position: sticky;
  top: calc(var(--vp-nav-height) + 32px);
  align-self: start;
}
.ch-tag {
  display: flex;
  gap: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--t2);
}
.ch-tag span {
  font-family: var(--vp-font-family-mono);
  font-weight: 400;
  color: var(--t3);
}
.ch-side h2 {
  margin-top: 14px;
  font-size: clamp(22px, 2.2vw, 27px);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--t1);
}
.ch-side > p:not(.ch-tag) {
  margin-top: 14px;
  font-size: 16px;
  line-height: 1.65;
  color: var(--t2);
}
.ch-main {
  min-width: 0;
}
.stack-v {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
}

/* 01 ---- the tricks ---- */
.masks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px 32px;
  margin-bottom: 36px;
}
.masks li {
  display: grid;
  gap: 8px;
  align-content: start;
}
.mj .snip {
  display: block;
  padding: 11px 14px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--well);
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--t1);
  white-space: nowrap;
  overflow-x: auto;
}
.masks p {
  font-size: 15px;
  line-height: 1.55;
  color: var(--t2);
}
.masks a {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--t3);
}
.anno {
  border: 1px solid var(--line-2);
  border-radius: 8px;
  background: var(--well);
  overflow: hidden;
}
.anno figcaption {
  padding: 10px 18px;
  border-bottom: 1px solid var(--line);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--t3);
}
.anno-body {
  padding: 10px 0;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.8;
}
.acl {
  display: grid;
  grid-template-columns: 5ch minmax(0, 1fr);
  min-width: fit-content;
  color: var(--t2);
}
.acl.hit {
  background: color-mix(in srgb, var(--mj-unworthy) 12%, var(--well));
  color: var(--t1);
}
.aln {
  padding-right: 16px;
  text-align: right;
  color: var(--t3);
  user-select: none;
}
.als {
  padding-right: 18px;
  white-space: pre;
}
.acard {
  margin: 10px 18px 12px calc(5ch + 16px);
  padding: 14px 16px;
  border: 1px solid var(--line-2);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  font-family: var(--vp-font-family-base);
  font-size: 14px;
  line-height: 1.6;
  color: var(--t2);
}
.acard-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  color: var(--t1);
}
.acard-by {
  font-weight: 600;
}
.acard-head a {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}
.acard-stamp {
  margin-top: 2px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--t3);
}
.acard-msg {
  margin-top: 10px;
  color: var(--t1);
}
.acard-fix {
  margin-top: 6px;
}
.acard-fix span {
  margin-right: 10px;
  font-weight: 500;
  color: var(--t1);
}

/* 02 ---- findings legend ---- */
.legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px 32px;
  margin-top: 28px;
}
.legend dt {
  font-size: 15px;
  font-weight: 500;
  color: var(--t1);
}
.legend dd {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--t2);
}
.mj .tok {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 8px;
  padding: 3px 8px;
  border: 1px solid var(--line-2);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--t1);
  overflow-wrap: anywhere;
}

/* 03 ---- score ---- */
.scale {
  padding: 28px 24px 24px;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  background: var(--well);
}
.scale-bar {
  position: relative;
  display: flex;
  height: 10px;
  margin-top: 36px;
}
.scale-seg {
  display: block;
  min-width: 6px;
  height: 100%;
  background: currentColor;
}
.scale-seg + .scale-seg {
  margin-left: 2px;
}
.scale-mark {
  position: absolute;
  bottom: 0;
  transform: translateX(-50%);
}
.scale-pin {
  display: block;
  width: 2px;
  height: 22px;
  margin: 0 auto;
  background: var(--t1);
}
.scale-read {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  white-space: nowrap;
  color: var(--t1);
}
.scale-legend {
  position: relative;
  display: flex;
  margin-top: 14px;
}
.scale-key {
  display: grid;
  gap: 2px;
  min-width: 6px;
  padding-right: 8px;
}
.scale-key + .scale-key {
  margin-left: 2px;
}
.scale-key:last-child {
  position: absolute;
  top: 0;
  right: 0;
  width: auto !important;
  justify-items: end;
  padding-right: 0;
}
.scale-verdict {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  white-space: nowrap;
}
.scale-range {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--t3);
}
.math {
  margin-top: 28px;
}
.math-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--t1);
}
.math dl {
  display: grid;
  margin-top: 12px;
  border-top: 1px solid var(--line);
}
.math dl > div {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.math dt {
  font-size: 14px;
  color: var(--t3);
}
.math dd {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--t2);
}
.math b {
  font-weight: 500;
  color: var(--t1);
}
.math dd .tone-warning {
  margin-left: 10px;
  font-family: var(--vp-font-family-base);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

/* 04 ---- trust ---- */
.stamps {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}
.levels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(24px, 3vw, 40px);
  margin-top: 40px;
}
.levels > div {
  padding-top: 18px;
  border-top: 1px solid var(--line-2);
}
.levels > .run {
  border-top-color: var(--mj-aurora);
}
.levels ol {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}
.levels li {
  display: grid;
  grid-template-columns: 6px 3ch minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 14px;
  align-items: end;
}
.lv-bar {
  grid-row: 1 / 3;
  align-self: end;
  width: 6px;
  border-radius: 1px;
}
.lv-code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--t3);
}
.run .lv-code {
  color: var(--mj-aurora-bright);
}
.lv-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--t1);
}
.lv-body {
  grid-column: 3;
  font-size: 14px;
  line-height: 1.55;
  color: var(--t2);
}

/* 06 ---- measured rules ---- */
.table-wrap {
  overflow-x: auto;
}
.mj .rules {
  display: table;
  width: 100%;
  min-width: 560px;
  margin: 0;
  border-collapse: collapse;
  font-size: 15px;
}
.mj .rules :is(tr, th, td) {
  border: 0;
  background: none;
}
.rules thead th {
  padding: 0 16px 12px 0;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  color: var(--t3);
}
.rules tbody {
  border-top: 1px solid var(--line);
}
.rules tbody th {
  padding: 18px 0 6px;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  color: var(--t2);
}
.rules td {
  padding: 8px 16px 8px 0;
  vertical-align: baseline;
  color: var(--t2);
}
.rules td:first-child {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  white-space: nowrap;
  color: var(--t1);
}
.rules .n {
  text-align: right;
  white-space: nowrap;
}
.rules td.n {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
}
.fp-zero {
  color: var(--t1);
}
.fp-mid {
  color: var(--mj-needswork);
}
.fp-high {
  color: var(--mj-unworthy);
}
.rules td.sample {
  padding-right: 0;
  color: var(--t3);
}

/* 07 ---- ci and agents ---- */
.flows {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
}
.flow + .flow {
  padding-top: 32px;
  border-top: 1px solid var(--line);
}
.flow {
  display: grid;
  gap: 14px;
  justify-items: start;
  align-content: start;
  min-width: 0;
}
.flow > p:not(.fine) {
  font-size: 15px;
  line-height: 1.6;
  color: var(--t2);
}
.flow .fine {
  margin-top: 0;
}
.snippet {
  width: 100%;
  margin: 0;
  padding: 14px 18px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--well);
  font-size: 13px;
  line-height: 1.7;
  color: var(--t1);
  overflow-x: auto;
}
.codes {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 24px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.codes dt {
  font-family: var(--vp-font-family-mono);
  font-size: 28px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--t1);
}
.codes dd {
  margin-top: 10px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--t2);
}

/* ---- limits and close ---- */
.closing {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: clamp(32px, 5vw, 72px);
  padding-block: clamp(56px, 7vw, 96px) clamp(96px, 10vw, 140px);
}
.closing h2 {
  font-size: clamp(22px, 2.4vw, 28px);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--t1);
}
.limits {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 32px;
  margin-top: 22px;
}
.limits li {
  font-size: 15.5px;
  line-height: 1.5;
  color: var(--t1);
}
.lim-detail {
  display: block;
  margin-top: 4px;
  font-size: 14px;
  color: var(--t2);
}
.cta {
  align-self: start;
  padding: 28px;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  background: var(--well);
}
.cta .key {
  margin-top: 20px;
}
.close-links {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 18px;
  font-size: 15px;
  color: var(--t2);
}

/* ---- the aurora: color that places you, never color that judges ---- */
.hero-band {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.sky {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(
      52% 40% at 14% 14%,
      color-mix(in srgb, var(--mj-aurora-green) 30%, transparent),
      transparent 72%
    ),
    radial-gradient(
      44% 34% at 52% 10%,
      color-mix(in srgb, var(--mj-aurora-cyan) 24%, transparent),
      transparent 72%
    ),
    radial-gradient(
      40% 38% at 90% 14%,
      color-mix(in srgb, var(--mj-aurora-violet) 30%, transparent),
      transparent 72%
    );
}
.sky::before {
  content: "";
  position: absolute;
  inset: 0 0 40%;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 22px,
    color-mix(in srgb, var(--mj-aurora-green) 8%, transparent) 22px 24px
  );
  mask-image: radial-gradient(70% 90% at 38% 8%, #000, transparent 75%);
}
/* The horizon: one lit hairline where the sky meets the page, and the
   faint bloom it throws. Drawn, not illustrated. */
.sky::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--mj-aurora-green) 18%,
    var(--mj-aurora-cyan) 50%,
    var(--mj-aurora-violet) 82%,
    transparent
  );
  opacity: 0.75;
  box-shadow: 0 0 28px 3px
    color-mix(in srgb, var(--mj-aurora-cyan) 30%, transparent);
}
.hero {
  padding-bottom: clamp(72px, 9vw, 128px);
}

.logo:hover svg,
.logo:hover .mono {
  color: var(--mj-aurora-bright);
}
.logo:hover svg {
  filter: drop-shadow(
    0 0 8px color-mix(in srgb, var(--mj-aurora-bright) 55%, transparent)
  );
}

.toc-n,
.mj .toc a:hover .toc-go {
  color: var(--ch);
}

.ch-tag,
.ch-tag span {
  color: var(--ch);
}
.chapter::after {
  content: "";
  position: absolute;
  top: -1px;
  left: var(--edge);
  width: 72px;
  height: 2px;
  background: var(--ch);
}
.mj .ch-side .more {
  text-decoration-color: color-mix(in srgb, var(--ch) 70%, transparent);
}
.ch-main :deep(.term),
.ch-main .anno,
.ch-main .scale {
  border-top: 2px solid var(--ch);
}

.cta {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--well), var(--well)) padding-box,
    linear-gradient(
        120deg,
        var(--mj-aurora-green),
        var(--mj-aurora-cyan) 50%,
        var(--mj-aurora-violet)
      )
      border-box;
}

@media (max-width: 960px) {
  .chapter,
  .closing,
  .stack {
    grid-template-columns: minmax(0, 1fr);
  }
  .ch-side {
    position: static;
  }
  .mj .stack-title {
    grid-row: auto;
  }
}
@media (max-width: 880px) {
  .hero-grid,
  .toc,
  .masks,
  .levels,
  .flows,
  .legend,
  .limits {
    grid-template-columns: minmax(0, 1fr);
  }
  .codes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .key code {
    padding-inline: 12px;
    font-size: 12.5px;
  }
  .stack-group {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .acard {
    margin-left: 18px;
  }
  .scale-verdict {
    font-size: 10px;
    letter-spacing: 0.06em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mj a,
  .key button,
  .logo,
  .logo svg,
  .toc-go {
    transition: none;
  }
}
</style>
