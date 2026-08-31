<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { withBase } from "vitepress";

/* ----- static, SSR-stable data ----------------------------------------- */

const runes = [
  { g: "ᛏ", x: 8, y: 18, s: 3.4, d: 0 },
  { g: "ᛗ", x: 82, y: 12, s: 2.6, d: 1.5 },
  { g: "ᚦ", x: 66, y: 62, s: 4.2, d: 0.6 },
  { g: "ᚨ", x: 15, y: 72, s: 2.9, d: 2.2 },
  { g: "ᛟ", x: 91, y: 44, s: 2.2, d: 1 },
  { g: "ᛉ", x: 40, y: 8, s: 2, d: 3 },
  { g: "ᚹ", x: 52, y: 84, s: 2.4, d: 1.8 },
  { g: "ᛒ", x: 27, y: 40, s: 2, d: 2.7 },
  { g: "ᛃ", x: 74, y: 26, s: 1.8, d: 0.3 },
  { g: "ᛖ", x: 4, y: 50, s: 2.1, d: 3.4 },
];

const features = [
  {
    r: "ᛏ",
    title: "Worthiness Score",
    body: "One number, a transparent deduction table, no black box. Gate a pull request on it.",
    to: "/guide/scoring",
  },
  {
    r: "ᛗ",
    title: "Selector Health",
    body: "Grades your Playwright locators for resilience — not just whether the run went green.",
    to: "/guide/forensics#selector-health-score",
  },
  {
    r: "ᚦ",
    title: "Runtime Forensics",
    body: "Reads real Playwright & JUnit run data to catch TRUE-FLAKE, not a static guess.",
    to: "/guide/forensics",
  },
  {
    r: "ᚨ",
    title: "CI-Integrity Rules",
    body: "Catches continue-on-error, “|| true”, and every other trick that turns red pipelines green.",
    to: "/guide/ci",
  },
  {
    r: "ᛟ",
    title: "Four Languages, One Pass",
    body: "TypeScript, Python, Java and C#/.NET — plus pytest, JUnit / TestNG and CI workflows.",
    to: "/rules/",
  },
  {
    r: "ᛉ",
    title: "Local-First",
    body: "Zero network calls while scanning. Zero telemetry. The whole audit runs in seconds.",
    to: "/reference/exit-codes#trust-model",
  },
];

const report = [
  { t: "▚▞  mjolnir  ./examples/demo-repo  --verbose", c: "cmd" },
  { t: "", c: "" },
  { t: "  WORTHINESS  70 / 100    ⚠ NEEDS WORK", c: "score" },
  { t: "", c: "" },
  { t: "  FIX THIS FIRST", c: "head" },
  {
    t: "  QA-CI-001   continue-on-error masks a failing gate    ci.yml:14",
    c: "err",
  },
  {
    t: "  QA-CI-002   || true swallows the test exit code       ci.yml:22",
    c: "err",
  },
  {
    t: "  QA-PW-118   networkidle wait — flaky by design        checkout.spec.ts:31",
    c: "warn",
  },
  {
    t: "  QA-TEST-004 hard sleep: page.waitForTimeout(3000)     checkout.spec.ts:44",
    c: "warn",
  },
  { t: "", c: "" },
  { t: "  4 rules fired · 1 measured · 3 on assumption", c: "foot" },
];

/* ----- animation (client only) --------------------------------------- */

const score = ref(0);
const dash = ref(339.292); // 2πr, r = 54 — full offset = empty ring
let io: IntersectionObserver | undefined;
let raf = 0;
let revealTimer = 0;

function runGauge() {
  const target = 70;
  const dur = 1500;
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    score.value = Math.round(e * target);
    dash.value = 339.292 * (1 - (e * target) / 100);
    if (p < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

const copied = ref(false);
async function copyCmd() {
  try {
    await navigator.clipboard.writeText("npx mjolnir-qa@latest");
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard blocked — no-op */
  }
}

function revealAll() {
  document
    .querySelectorAll("[data-reveal]")
    .forEach((el) => el.classList.add("is-in"));
  score.value = 70;
  dash.value = 339.292 * 0.3;
}

onMounted(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No IntersectionObserver (or reduced motion): just show everything.
  if (!("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add("is-in");
        if (en.target.hasAttribute("data-gauge") && !reduce) runGauge();
        else if (en.target.hasAttribute("data-gauge")) {
          score.value = 70;
          dash.value = 339.292 * 0.3;
        }
        io?.unobserve(en.target);
      }
    },
    { threshold: 0.3 },
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => io?.observe(el));

  // Safety net: never leave content stuck invisible.
  revealTimer = window.setTimeout(revealAll, 4000);
});

onBeforeUnmount(() => {
  io?.disconnect();
  cancelAnimationFrame(raf);
  clearTimeout(revealTimer);
});
</script>

<template>
  <div class="mj">
    <!-- ===================== HERO ===================== -->
    <section class="hero">
      <div class="hero-bg" aria-hidden="true">
        <div class="aurora" />
        <div class="forge-glow" />
        <div class="runefield">
          <span
            v-for="(r, i) in runes"
            :key="i"
            class="drift-rune"
            :style="{
              left: r.x + '%',
              top: r.y + '%',
              fontSize: r.s + 'rem',
              animationDelay: r.d + 's',
            }"
            >{{ r.g }}</span
          >
        </div>
        <svg class="bolt" viewBox="0 0 200 400" preserveAspectRatio="none">
          <path
            d="M120 -10 L70 150 L110 150 L60 410"
            fill="none"
            stroke="url(#boltgrad)"
            stroke-width="3"
          />
          <defs>
            <linearGradient id="boltgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#22d3ee" />
              <stop offset="1" stop-color="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div class="hero-inner">
        <p class="eyebrow">
          <span class="tick">ᛏ</span> Verification Trust Engine
        </p>
        <h1 class="wordmark">MJÖLNIR</h1>
        <p class="lede">
          Your tests are lying to you.
          <span class="shimmer">We prove it.</span>
        </p>
        <p class="sub">
          Mjölnir audits test suites and CI pipelines, reports one worthiness
          score, and shows the exact places where trust breaks — across
          TypeScript, Python, Java, C# and your workflows.
        </p>

        <div class="cta-row">
          <a class="btn btn-primary" :href="withBase('/guide/getting-started')">
            Get started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8h9M8 3l5 5-5 5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
          <a
            class="btn btn-ghost"
            href="https://github.com/Sergey-Bar/Mjolnir"
            target="_blank"
            rel="noreferrer"
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
              />
            </svg>
            Star on GitHub
          </a>
        </div>

        <button
          class="cmd"
          :class="{ copied }"
          type="button"
          aria-label="Copy: npx mjolnir-qa@latest"
          @click="copyCmd"
        >
          <span class="prompt">$</span>
          <code>npx mjolnir-qa@latest</code>
          <span class="copy">{{ copied ? "copied ✓" : "copy" }}</span>
        </button>
      </div>

      <div class="scroll-hint" aria-hidden="true"><span /></div>
    </section>

    <RuneDivider rune="ᚦ" />

    <!-- ===================== SHOWCASE ===================== -->
    <section class="showcase" data-reveal>
      <div class="show-grid">
        <div class="show-copy">
          <h2>One command. One verdict.</h2>
          <p>
            In CI, the product is a single line. It scans only what the branch
            touched and exits non-zero on new problems — drop it in a PR check
            and you are done.
          </p>
          <div class="mini-cmd">
            <span class="prompt">$</span>
            <code>npx mjolnir-qa@latest --scope changed</code>
          </div>
          <p class="fine">
            Not a style nit — a place where CI told you something passed when it
            didn't.
          </p>
        </div>

        <div class="gauge-wrap" data-gauge data-reveal>
          <svg class="gauge" viewBox="0 0 140 140">
            <circle class="track" cx="70" cy="70" r="54" />
            <circle
              class="fill"
              cx="70"
              cy="70"
              r="54"
              :stroke-dasharray="339.292"
              :stroke-dashoffset="dash"
            />
          </svg>
          <div class="gauge-num">
            <strong>{{ score }}</strong>
            <span>/ 100</span>
            <em>NEEDS WORK</em>
          </div>
        </div>
      </div>

      <pre class="terminal" data-reveal><code><span
        v-for="(l, i) in report"
        :key="i"
        class="row"
        :class="l.c"
        :style="{ '--i': i }"
      >{{ l.t || " " }}
</span></code></pre>
    </section>

    <RuneDivider rune="ᛗ" />

    <!-- ===================== FEATURES ===================== -->
    <section class="features">
      <h2 class="sect-title" data-reveal>Forged for verification</h2>
      <div class="feat-grid">
        <a
          v-for="(f, i) in features"
          :key="f.title"
          class="feat"
          :href="withBase(f.to)"
          data-reveal
          :style="{ '--i': i }"
        >
          <span class="feat-rune" aria-hidden="true">{{ f.r }}</span>
          <h3>{{ f.title }}</h3>
          <p>{{ f.body }}</p>
          <span class="feat-go" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <RuneDivider rune="ᚨ" />

    <!-- ===================== NOT A LINTER ===================== -->
    <section class="compare" data-reveal>
      <h2 class="sect-title">Not another linter</h2>
      <div class="cmp-grid">
        <div class="cmp cmp-them">
          <h3>Linters &amp; coverage tools</h3>
          <p>tell you whether the code follows rules.</p>
          <ul>
            <li>Blind to CI workflow integrity</li>
            <li>One language, one ecosystem</li>
            <li>No sense of whether a run can be trusted</li>
          </ul>
        </div>
        <div class="cmp cmp-us">
          <span class="cmp-mark" aria-hidden="true">ᛏ</span>
          <h3>Mjölnir</h3>
          <p>tells you whether your verification can be trusted.</p>
          <ul>
            <li>Catches false-green CI tricks structurally</li>
            <li>TS · Python · Java · C# from one pass</li>
            <li>Reads real run data for TRUE-FLAKE verdicts</li>
            <li>Measured false-positive rates, published even when ugly</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ===================== FINAL CTA ===================== -->
    <section class="final" data-reveal>
      <div class="strike" aria-hidden="true">
        <img :src="withBase('/hammer.svg')" alt="" width="72" height="72" />
        <span class="shock" />
      </div>
      <h2>Stop shipping tests you can't trust.</h2>
      <button
        class="cmd big"
        :class="{ copied }"
        type="button"
        aria-label="Copy: npx mjolnir-qa@latest"
        @click="copyCmd"
      >
        <span class="prompt">$</span>
        <code>npx mjolnir-qa@latest</code>
        <span class="copy">{{ copied ? "copied ✓" : "copy" }}</span>
      </button>
      <p class="built">
        Local-first · zero telemetry · MIT · built by
        <a
          href="https://www.linkedin.com/in/sergeybar/"
          target="_blank"
          rel="noreferrer"
          >Sergey Bar</a
        >
      </p>
    </section>
  </div>
</template>

<style scoped>
.mj {
  --edge: clamp(1.2rem, 5vw, 4rem);
  overflow-x: clip;
}
.mj :where(h2, h3, h4) {
  font-family: var(--mj-display);
  font-weight: 600;
  line-height: 1.2;
  border: 0;
  padding: 0;
}
.mj h2 {
  letter-spacing: 0.01em;
}

/* ---------------- HERO ---------------- */
.hero {
  position: relative;
  min-height: min(94vh, 900px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 7rem var(--edge) 5rem;
  isolation: isolate;
  background: var(--mj-hero-ink);
  color: var(--mj-hero-text);
}
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}
.aurora {
  position: absolute;
  inset: -30%;
  background: conic-gradient(
    from 180deg at 50% 50%,
    transparent 0deg,
    rgba(217, 119, 6, 0.22) 60deg,
    transparent 130deg,
    rgba(34, 211, 238, 0.16) 220deg,
    transparent 300deg
  );
  filter: blur(60px);
  animation: spin 26s linear infinite;
}
.forge-glow {
  position: absolute;
  left: 50%;
  bottom: -45%;
  width: 120%;
  aspect-ratio: 1;
  transform: translateX(-50%);
  background: radial-gradient(
    circle,
    rgba(245, 158, 11, 0.28),
    rgba(217, 119, 6, 0.08) 40%,
    transparent 70%
  );
  animation: breathe 7s ease-in-out infinite;
}
.runefield {
  position: absolute;
  inset: 0;
}
.drift-rune {
  position: absolute;
  font-family: var(--mj-display);
  color: rgba(245, 200, 130, 0.14);
  text-shadow: 0 0 24px rgba(245, 158, 11, 0.12);
  animation: floaty 12s ease-in-out infinite;
  user-select: none;
}
.bolt {
  position: absolute;
  top: 0;
  right: 7%;
  height: 100%;
  width: 180px;
  opacity: 0.42;
  filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.5));
  animation: flicker 6s steps(1) infinite;
}
@media (max-width: 860px) {
  .bolt {
    right: -6%;
    opacity: 0.16;
  }
}

.hero-inner {
  max-width: 820px;
  animation: rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.eyebrow {
  font-family: var(--mj-display);
  font-size: 0.82rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--mj-ember-hot);
  margin: 0 0 1.4rem;
}
.eyebrow .tick {
  margin-right: 0.55em;
  text-shadow: 0 0 16px rgba(245, 158, 11, 0.7);
}
.wordmark {
  font-family: var(--mj-display);
  font-weight: 700;
  font-size: clamp(3.2rem, 12vw, 8rem);
  line-height: 0.95;
  letter-spacing: 0.06em;
  margin: 0;
  background: linear-gradient(180deg, #fff7e8 10%, #f6b64a 55%, #b45309 105%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 40px rgba(245, 158, 11, 0.35));
}
.lede {
  font-family: var(--mj-display);
  font-size: clamp(1.15rem, 3.4vw, 1.9rem);
  margin: 1.1rem 0 0;
  color: var(--mj-hero-text);
}
.shimmer {
  background: linear-gradient(
    100deg,
    var(--mj-ember-hot) 0%,
    #fff2d6 20%,
    var(--mj-spark-bright) 40%,
    var(--mj-ember-hot) 60%,
    #fff2d6 80%,
    var(--mj-ember-hot) 100%
  );
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: sweep 5s linear infinite;
}
.sub {
  max-width: 60ch;
  margin: 1.5rem auto 0;
  color: var(--mj-hero-muted);
  font-size: 1.02rem;
  line-height: 1.7;
}

.cta-row {
  display: flex;
  gap: 0.9rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2.4rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.4rem;
  border-radius: 9px;
  font-weight: 600;
  font-size: 0.95rem;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}
.btn-primary {
  color: #1a1206;
  background: linear-gradient(180deg, var(--mj-ember-hot), var(--mj-ember));
  box-shadow:
    0 10px 30px -8px rgba(245, 158, 11, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow:
    0 16px 40px -8px rgba(245, 158, 11, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.btn-ghost {
  color: var(--mj-hero-text);
  border: 1px solid var(--mj-hero-line);
  background: rgba(255, 255, 255, 0.03);
}
.btn-ghost:hover {
  transform: translateY(-2px);
  border-color: rgba(245, 200, 130, 0.4);
  background: rgba(255, 255, 255, 0.06);
}

.cmd {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1.7rem;
  padding: 0.65rem 0.7rem 0.65rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--mj-hero-line);
  background: rgba(10, 9, 8, 0.6);
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  color: var(--mj-hero-text);
  cursor: pointer;
  transition: border-color 0.16s ease;
}
.cmd:hover {
  border-color: rgba(245, 200, 130, 0.35);
}
.cmd .prompt {
  color: var(--mj-ember-hot);
}
.cmd code {
  background: none;
  color: inherit;
  font-size: inherit;
}
.cmd .copy {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mj-hero-muted);
  border: 1px solid var(--mj-hero-line);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
}
.cmd.copied .copy {
  color: var(--mj-ember-hot);
  border-color: rgba(245, 158, 11, 0.5);
}

.scroll-hint {
  position: absolute;
  bottom: 1.6rem;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 34px;
  border: 1px solid var(--mj-hero-line);
  border-radius: 12px;
}
.scroll-hint span {
  position: absolute;
  left: 50%;
  top: 7px;
  width: 3px;
  height: 7px;
  margin-left: -1.5px;
  border-radius: 2px;
  background: var(--mj-ember-hot);
  animation: wheel 1.8s ease-in-out infinite;
}

/* ---------------- SHOWCASE ---------------- */
.showcase {
  max-width: 1080px;
  margin: 0 auto;
  padding: 1rem var(--edge) 2rem;
}
.show-grid {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: clamp(1.5rem, 5vw, 3.5rem);
  align-items: center;
}
.show-copy h2 {
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  margin: 0 0 0.9rem;
}
.show-copy p {
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
.show-copy .fine {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
}
.mini-cmd,
.mini-cmd code {
  font-family: var(--vp-font-family-mono);
}
.mini-cmd {
  display: inline-flex;
  gap: 0.55rem;
  margin: 1rem 0;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  font-size: 0.86rem;
}
.mini-cmd .prompt {
  color: var(--mj-ember);
}

.gauge-wrap {
  position: relative;
  width: min(240px, 60vw);
  margin: 0 auto;
  aspect-ratio: 1;
}
.gauge {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.gauge .track {
  fill: none;
  stroke: var(--vp-c-bg-soft);
  stroke-width: 10;
}
.gauge .fill {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  stroke: var(--mj-ember-bright);
  filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.5));
  transition: stroke-dashoffset 0.1s linear;
}
.gauge-num {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--mj-display);
}
.gauge-num strong {
  font-size: 2.8rem;
  line-height: 1;
  color: var(--vp-c-text-1);
}
.gauge-num span {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}
.gauge-num em {
  margin-top: 0.4rem;
  font-style: normal;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  color: var(--mj-ember);
}

.terminal {
  margin: 2.4rem 0 0;
  padding: 1.3rem 1.4rem;
  border-radius: 14px;
  background: var(--mj-forge-950);
  border: 1px solid rgba(245, 200, 130, 0.12);
  box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.6);
  overflow-x: auto;
}
.terminal code {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  line-height: 1.65;
  color: #d8cdb8;
  background: none;
}
.terminal .row {
  display: block;
  white-space: pre;
  opacity: 0;
  transform: translateY(6px);
}
.terminal.is-in .row {
  animation: line-in 0.4s ease forwards;
  animation-delay: calc(var(--i) * 70ms);
}
.terminal .cmd {
  color: #8bd6e0;
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
}
.terminal .score {
  color: var(--mj-ember-hot);
  font-weight: 600;
}
.terminal .head {
  color: #efe3c8;
}
.terminal .err {
  color: #f19a7c;
}
.terminal .warn {
  color: #e6c56b;
}
.terminal .foot {
  color: #8a8272;
}

/* ---------------- FEATURES ---------------- */
.features {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1rem var(--edge) 2rem;
}
.sect-title {
  text-align: center;
  font-size: clamp(1.7rem, 4.5vw, 2.6rem);
  margin: 0 0 2.6rem;
}
.feat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.1rem;
}
.feat {
  position: relative;
  display: block;
  padding: 1.6rem 1.5rem 2.4rem;
  border-radius: 14px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  overflow: hidden;
  color: inherit;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.feat-go {
  position: absolute;
  right: 1.5rem;
  bottom: 1.2rem;
  color: var(--mj-ember-bright);
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.feat:hover .feat-go,
.feat:focus-visible .feat-go {
  opacity: 1;
  transform: none;
}
.feat:focus-visible {
  outline: 2px solid var(--mj-ember-bright);
  outline-offset: 2px;
}
.feat::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    240px circle at var(--mx, 50%) var(--my, 0%),
    rgba(245, 158, 11, 0.14),
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
}
.feat:hover {
  transform: translateY(-4px);
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 24px 50px -28px rgba(245, 158, 11, 0.4);
}
.feat:hover::before {
  opacity: 1;
}
.feat-rune {
  font-family: var(--mj-display);
  font-size: 1.7rem;
  color: var(--mj-ember-bright);
  text-shadow: 0 0 20px rgba(245, 158, 11, 0.35);
}
.feat h3 {
  margin: 0.7rem 0 0.4rem;
  font-size: 1.12rem;
  font-family: var(--mj-display);
  font-weight: 600;
}
.feat p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

/* ---------------- COMPARE ---------------- */
.compare {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem var(--edge) 2rem;
}
.cmp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  align-items: start;
}
.cmp {
  padding: 1.7rem 1.6rem;
  border-radius: 14px;
  border: 1px solid var(--vp-c-border);
}
.cmp h3 {
  margin: 0 0 0.2rem;
  font-family: var(--mj-display);
  font-size: 1.1rem;
  font-weight: 600;
}
.cmp > p {
  margin: 0 0 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.92rem;
}
.cmp ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.cmp li {
  position: relative;
  padding: 0.4rem 0 0.4rem 1.4rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  border-top: 1px solid var(--vp-c-gutter);
}
.cmp li::before {
  position: absolute;
  left: 0;
  top: 0.4rem;
}
.cmp-them {
  background: var(--vp-c-bg-alt);
}
.cmp-them li::before {
  content: "✕";
  color: var(--vp-c-text-3);
}
.cmp-us {
  position: relative;
  background: linear-gradient(
    180deg,
    rgba(245, 158, 11, 0.08),
    transparent 70%
  );
  border-color: rgba(245, 158, 11, 0.35);
}
.cmp-us li::before {
  content: "ᛏ";
  font-family: var(--mj-display);
  color: var(--mj-ember-bright);
}
.cmp-mark {
  position: absolute;
  top: 1rem;
  right: 1.2rem;
  font-family: var(--mj-display);
  font-size: 1.6rem;
  color: rgba(245, 158, 11, 0.5);
}

/* ---------------- FINAL ---------------- */
.final {
  text-align: center;
  padding: 4rem var(--edge) 6rem;
  max-width: 780px;
  margin: 0 auto;
}
.final h2 {
  font-size: clamp(1.7rem, 5vw, 2.8rem);
  margin: 2.6rem 0 2rem;
}
.strike {
  position: relative;
  display: block;
  margin-bottom: 0.4rem;
}
.strike img {
  filter: drop-shadow(0 10px 24px rgba(245, 158, 11, 0.4));
}
.final.is-in .strike img {
  animation: hammer 0.9s cubic-bezier(0.3, 1.4, 0.5, 1) both;
}
.strike .shock {
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translateX(-50%);
  border: 2px solid rgba(245, 158, 11, 0.6);
}
.final.is-in .strike .shock {
  animation: shock 0.9s ease-out 0.42s both;
}
.cmd.big {
  font-size: 1rem;
  padding: 0.85rem 0.85rem 0.85rem 1.2rem;
  background: var(--mj-forge-950);
}
.built {
  margin-top: 1.6rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}
.built a {
  color: var(--mj-ember);
  font-weight: 600;
}

/* reveal */
[data-reveal] {
  opacity: 0;
  transform: translateY(26px);
  transition:
    opacity 0.7s ease,
    transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
}
[data-reveal].is-in {
  opacity: 1;
  transform: none;
}
.feat[data-reveal] {
  transition-delay: calc(var(--i) * 80ms);
}

/* ---------------- keyframes ---------------- */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes breathe {
  0%,
  100% {
    opacity: 0.75;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.06);
  }
}
@keyframes floaty {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-18px) rotate(4deg);
  }
}
@keyframes flicker {
  0%,
  100% {
    opacity: 0.15;
  }
  4%,
  8% {
    opacity: 0.7;
  }
  6% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.12;
  }
  52%,
  56% {
    opacity: 0.55;
  }
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
}
@keyframes sweep {
  to {
    background-position: -300% 0;
  }
}
@keyframes wheel {
  0% {
    opacity: 0;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(12px);
  }
}
@keyframes line-in {
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes hammer {
  0% {
    transform: translateY(-40px) rotate(-32deg);
    opacity: 0;
  }
  55% {
    transform: translateY(4px) rotate(6deg);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}
@keyframes shock {
  0% {
    width: 8px;
    height: 8px;
    opacity: 0.9;
  }
  100% {
    width: 220px;
    height: 220px;
    opacity: 0;
  }
}

@media (max-width: 820px) {
  .show-grid,
  .cmp-grid {
    grid-template-columns: 1fr;
  }
  .gauge-wrap {
    order: -1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .aurora,
  .forge-glow,
  .drift-rune,
  .bolt,
  .shimmer,
  .scroll-hint span {
    animation: none !important;
  }
  [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .terminal .row {
    opacity: 1;
    transform: none;
  }
}
</style>
