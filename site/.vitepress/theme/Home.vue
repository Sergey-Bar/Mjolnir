<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { withBase } from "vitepress";
import { TRUST_RUNGS } from "../../../src/brand/symbols";
import DiagnosticGrid from "./DiagnosticGrid.vue";
import StreamTerm from "./StreamTerm.vue";
import Term from "./Term.vue";
import { LOGOS } from "./logos";
import { data } from "./home.data";
import { MONOGRAM } from "./stack";

const TITLE = [
  "Tests tell you what passed.",
  "QA Doctor tells you what you can trust.",
].map((l) => l.split(" "));
const OFF = [0, TITLE[0].length];
const booted = ref(false);

/** Tools Simple Icons has no mark for get their initials, never a fake logo. */
const monogram = (name: string) => MONOGRAM[name] ?? name.slice(0, 2);

const STACK_GROUPS = data.stack;

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
    title: "Test Health score",
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

/** Sections move from risk, through review, to a healthy test suite. */
const STOPS = ["var(--qa-info)", "var(--qa-steel)", "var(--qa-healthy)"];
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

/* ---- 01: the scanned file ---- */
const SCAN = data.scan;
const N = SCAN.lines.length;
const SEV_COLOR: Record<string, string> = {
  error: "var(--qa-critical)",
  warning: "var(--qa-attention)",
  info: "var(--qa-info)",
};
function yaml(src: string): { t: string; k?: boolean }[] {
  const m = /^(\s*)(- )?([\w.-]+)(:)(.*)$/.exec(src);
  if (!m) return [{ t: src || " " }];
  return [
    { t: m[1] },
    { t: m[2] ?? "" },
    { t: m[3], k: true },
    { t: m[4] },
    { t: m[5] },
  ].filter((x) => x.t);
}
const LINES = SCAN.lines.map((src, i) => {
  const n = i + 1;
  const hits = SCAN.findings.filter((f) => f.line === n);
  const sev = hits.some((f) => f.severity === "error")
    ? "error"
    : hits.some((f) => f.severity === "warning")
      ? "warning"
      : hits.length
        ? "info"
        : "";
  return { n, tokens: yaml(src), hits, sev };
});
const hasWarn = SCAN.findings.some((f) => f.severity === "warning");
// Rendered complete, so the file reads with no script at all; the scan
// only rewinds once a client is there to drive it.
const scanned = ref(N);
const scanLive = ref(false);
const tally = computed(() => {
  const t = { e: 0, w: 0, i: 0 };
  for (const f of SCAN.findings) {
    if (f.line > scanned.value) continue;
    if (f.severity === "error") t.e++;
    else if (f.severity === "warning") t.w++;
    else t.i++;
  }
  return t;
});
const posLabel = computed(() =>
  scanLive.value && scanned.value < N
    ? `line ${Math.max(1, scanned.value)}`
    : `${SCAN.findings.length} findings`,
);

/* ---- 02: the anatomy of one finding ---- */
const ANATOMY = [
  {
    part: "where",
    title: "Where",
    token: data.legend.where,
    body: "The rule, and the exact file and line.",
  },
  {
    part: "sure",
    title: "How sure",
    token: data.legend.evidence,
    body: "E2 is proven in code and counts in full. E1 is a matching pattern and counts half. E0 is an observation and costs nothing.",
  },
  {
    part: "fp",
    title: "How often the rule is wrong",
    token: data.legend.fp,
    body: "Measured on hand-checked findings from open-source repos.",
  },
  {
    part: "fix",
    title: "The fix",
    token: "Fix",
    body: "The change that closes the finding. Re-run the scan to confirm it.",
  },
];
const lit = ref("");
let alive = true;
let holding = false;
const holdPart = (p: string) => {
  if (!alive) return;
  holding = true;
  lit.value = p;
};
const release = () => {
  if (!alive) return;
  holding = false;
};

/* ---- 03: the score ---- */
const s = data.score;
const marker = `${(s.demo.score / s.outOf) * 100}%`;
const demoTone =
  s.bands.find((b) => s.demo.score >= b.min && s.demo.score <= b.max)?.tone ??
  "warning";

/* ---- 04: trust ---- */
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
const boundary = Math.max(
  0,
  levels.findIndex((l) => l.runtime),
);
/** Ordinal, not a quantity: the step at the runtime boundary is the point. */
const rungHeight = (i: number, runtime: boolean) =>
  runtime ? 64 + (i - boundary) * 18 : 18 + i * 12;

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

/* ---- motion ---- */
const root = ref<HTMLElement>();
const progEl = ref<HTMLElement>();
const scanEl = ref<HTMLElement>();
const viewEl = ref<HTMLElement>();
const innerEl = ref<HTMLElement>();
const beamEl = ref<HTMLElement>();
const anatEl = ref<HTMLElement>();
const counts = reactive<Record<string, number>>({});
const shown = (k: string, v: number) => counts[k] ?? v;
const cleanups: (() => void)[] = [];
let motion = true;

function countUp(k: string, to: number) {
  if (!motion || !Number.isInteger(to)) {
    delete counts[k];
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / 1100);
    counts[k] = Math.round(to * (1 - (1 - p) ** 4));
    if (p < 1) requestAnimationFrame(step);
    else delete counts[k];
  };
  requestAnimationFrame(step);
}

function onReveal(el: HTMLElement) {
  // An attribute, not a class: Vue rewrites `class` whenever a binding
  // on the element changes, which would silently un-reveal it.
  el.setAttribute("data-in", "");
  for (const c of el.querySelectorAll<HTMLElement>("[data-ck]"))
    countUp(c.dataset.ck ?? "", Number(c.dataset.to));
}

/** Spotlight: every card in the grid tracks the pointer, not just the hovered one. */
function spot(e: PointerEvent) {
  const grid = e.currentTarget as HTMLElement;
  for (const c of grid.querySelectorAll<HTMLElement>(".card")) {
    const b = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - b.left}px`);
    c.style.setProperty("--my", `${e.clientY - b.top}px`);
  }
}
function unspot(e: PointerEvent) {
  release();
  const grid = e.currentTarget as HTMLElement;
  for (const c of grid.querySelectorAll<HTMLElement>(".card")) {
    c.style.removeProperty("--mx");
    c.style.removeProperty("--my");
  }
}

function startScan() {
  if (!motion) return;
  const sec = scanEl.value;
  const view = viewEl.value;
  const inner = innerEl.value;
  const beam = beamEl.value;
  if (!sec || !view || !inner || !beam) return;
  const lines = [...inner.querySelectorAll<HTMLElement>(".ln")];
  let raf = 0;
  let active = false;
  let camY = 0;
  const frame = () => {
    raf = 0;
    if (!active) return;
    const total = sec.offsetHeight - (window.innerHeight || 0);
    const raw =
      total > 0
        ? Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / total))
        : 1;
    const p = Math.min(1, Math.max(0, (raw - 0.05) / 0.82));
    const at = p * N;
    const idx = Math.floor(at);
    const y =
      idx >= N
        ? lines[N - 1].offsetTop + lines[N - 1].offsetHeight
        : lines[idx].offsetTop + (at - idx) * lines[idx].offsetHeight;
    beam.style.transform = `translateY(${y.toFixed(1)}px)`;
    const count = Math.max(0, Math.min(N, Math.ceil(at - 0.001)));
    if (count !== scanned.value) scanned.value = count;
    // The file scrolls under a fixed window so the beam holds just
    // above the middle of it.
    const H = view.clientHeight;
    const target = Math.min(
      Math.max(0, y - H * 0.45),
      Math.max(0, inner.offsetHeight - H),
    );
    camY += (target - camY) * 0.16;
    if (Math.abs(target - camY) < 0.3) camY = target;
    inner.style.transform = `translateY(${(-camY).toFixed(1)}px)`;
    raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver((es) => {
    active = es.some((e) => e.isIntersecting);
    if (active && !raf) raf = requestAnimationFrame(frame);
  });
  io.observe(sec);
  cleanups.push(() => {
    io.disconnect();
    cancelAnimationFrame(raf);
  });
}

onMounted(async () => {
  const el = root.value;
  if (!el) return;
  motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(
    () => {
      booted.value = true;
    },
    motion ? 1050 : 0,
  );

  let tick = 0;
  const paint = () => {
    tick = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progEl.value)
      progEl.value.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  const onScroll = () => {
    if (!tick) tick = requestAnimationFrame(paint);
  };
  addEventListener("scroll", onScroll, { passive: true });
  paint();
  cleanups.push(() => removeEventListener("scroll", onScroll));

  const targets = [...el.querySelectorAll<HTMLElement>("[data-reveal]")];
  if (motion) {
    for (const c of el.querySelectorAll<HTMLElement>("[data-ck]"))
      if (Number.isInteger(Number(c.dataset.to)))
        counts[c.dataset.ck ?? ""] = 0;
  }
  if (!motion || !("IntersectionObserver" in window)) {
    targets.forEach(onReveal);
  } else {
    let fired = false;
    const io = new IntersectionObserver(
      (es) => {
        fired = true;
        for (const e of es) {
          if (!e.isIntersecting) continue;
          onReveal(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    // Nothing may stay hidden because an observer never reported.
    const safety = setTimeout(() => {
      if (!fired) targets.forEach(onReveal);
    }, 1500);
    cleanups.push(() => {
      io.disconnect();
      clearTimeout(safety);
    });
  }

  if (motion && anatEl.value) {
    const parts = ANATOMY.map((a) => a.part);
    let i = -1;
    let timer = 0;
    const next = () => {
      if (holding) return;
      i = (i + 1) % parts.length;
      lit.value = parts[i];
    };
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.some((e) => e.isIntersecting);
        if (vis && !timer) {
          next();
          timer = window.setInterval(next, 2200);
        } else if (!vis && timer) {
          clearInterval(timer);
          timer = 0;
        }
      },
      { threshold: 0.35 },
    );
    io.observe(anatEl.value);
    cleanups.push(() => {
      io.disconnect();
      clearInterval(timer);
    });
  }

  if (motion) {
    scanLive.value = true;
    scanned.value = 0;
    await nextTick();
    startScan();
  }
});

onBeforeUnmount(() => {
  alive = false;
  cleanups.forEach((f) => f());
});
</script>

<template>
  <main ref="root" class="qa">
    <Transition name="boot">
      <div v-if="!booted" class="boot-screen" aria-hidden="true">
        <div class="boot-sequence">
          <span class="boot-corner tl" /><span class="boot-corner tr" />
          <span class="boot-corner bl" /><span class="boot-corner br" />
          <svg class="boot-mark" viewBox="0 0 64 64" fill="none">
            <path
              class="boot-ring"
              d="M32 8a24 24 0 1 0 0 48a24 24 0 1 0 0-48"
            />
            <path class="boot-check" d="M42 42l7 7 11-15" />
          </svg>
          <i class="boot-scan" />
        </div>
        <p class="boot-wordmark">QA DOCTOR</p>
      </div>
    </Transition>
    <div ref="progEl" class="progress" aria-hidden="true" />

    <!-- ============ HERO ============ -->
    <section class="hero-band" aria-labelledby="qa-title">
      <DiagnosticGrid />
      <div class="hero wrap">
        <h1 id="qa-title" class="title">
          <template v-for="(line, li) in TITLE" :key="li"
            ><span class="line" :class="{ was: li === 0 }"
              ><template v-for="(w, wi) in line" :key="wi"
                ><span class="w" :style="{ '--d': OFF[li] + wi }">{{ w }}</span
                >{{ " " }}</template
              ></span
            >{{ " " }}</template
          >
        </h1>
        <div class="hero-grid">
          <div>
            <p class="lede">
              QA Doctor finds tests that cannot fail and pipelines that cannot
              go red, then scores how far you can trust the result.
            </p>
            <div class="actions">
              <a class="hero-action" href="#ch-ci">Explore the diagnosis</a>
              <a
                class="more"
                href="https://github.com/Sergey-Bar/qa-doctor"
                target="_blank"
                rel="noreferrer"
                >View on GitHub</a
              >
            </div>
          </div>
          <div>
            <StreamTerm
              command="qa-doctor ."
              :lines="data.stream.lines"
              title="demo-repo"
              full
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ============ QUICK START ============ -->
    <section class="quick-start wrap" aria-labelledby="qa-quick-start">
      <header>
        <p class="section-label">QUICK START</p>
        <h2 id="qa-quick-start">From first scan to evidence.</h2>
        <p>
          Start in the repository you already have. QA Doctor explains every
          finding before asking your CI to enforce it.
        </p>
      </header>
      <ol class="quick-steps">
        <li>
          <span class="quick-n">01</span>
          <div>
            <h3>Run a baseline</h3>
            <p>Scan the repository and establish its current test health.</p>
            <a class="more" href="#ch-ci">Explore the live report</a>
          </div>
        </li>
        <li>
          <span class="quick-n">02</span>
          <div>
            <h3>Read the diagnosis</h3>
            <p>Open the exact rule, line, evidence level, and suggested fix.</p>
            <a class="more" :href="withBase('/guide/getting-started')"
              >See a sample report</a
            >
          </div>
        </li>
        <li>
          <span class="quick-n">03</span>
          <div>
            <h3>Protect the next change</h3>
            <p>
              Scan only changed files and make new high-confidence failures
              block the pull request.
            </p>
            <a class="more" :href="withBase('/guide/ci')"
              >Review the CI workflow</a
            >
          </div>
        </li>
      </ol>
    </section>

    <!-- ============ WORKS WITH ============ -->
    <section class="wrap" aria-labelledby="qa-stack">
      <div class="stack">
        <h2 id="qa-stack" class="stack-title">Works with your stack</h2>
        <div class="stack-detail" aria-label="Supported technologies">
          <div
            v-for="group in STACK_GROUPS"
            :key="group.label"
            class="stack-group"
          >
            <span>{{ group.label }}</span>
            <ul>
              <li v-for="name in group.items" :key="name">
                <svg
                  v-if="LOGOS[name]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path :d="LOGOS[name]" fill="currentColor" />
                </svg>
                <b v-else class="mono" aria-hidden="true">{{
                  monogram(name)
                }}</b>
                {{ name }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ OVERVIEW ============ -->
    <section class="wrap overview" aria-labelledby="qa-overview">
      <h2 id="qa-overview" class="overview-title" data-reveal>
        What a scan covers
      </h2>
      <ol class="toc" data-reveal>
        <li
          v-for="(c, i) in CHAPTERS"
          :key="c.id"
          :style="{ '--ch': chColor(i), '--i': i }"
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

    <!-- ============ 01 CI INTEGRITY: the scan ============ -->
    <section
      id="ch-ci"
      ref="scanEl"
      class="scan"
      :class="{ live: scanLive }"
      :style="chStyle('ch-ci')"
      aria-labelledby="qa-ci"
    >
      <div class="wrap scan-sticky">
        <div class="scan-copy">
          <p class="ch-tag">
            <span>{{ chapter("ch-ci").n }}</span
            >{{ chapter("ch-ci").title }}
          </p>
          <h2 id="qa-ci">
            Catches the CI tricks that keep a failed run green.
          </h2>
          <p class="scan-lede">
            Each of these lines looks deliberate in review. QA Doctor reads the
            workflow and flags each one with its rule and a fix.
          </p>
          <div class="tally">
            <div class="t-err">
              <b>{{ tally.e }}</b
              >{{ tally.e === 1 ? "error" : "errors" }}
            </div>
            <div v-if="hasWarn" class="t-warn">
              <b>{{ tally.w }}</b
              >{{ tally.w === 1 ? "warning" : "warnings" }}
            </div>
            <div class="t-info">
              <b>{{ tally.i }}</b
              >{{ tally.i === 1 ? "note" : "notes" }}
            </div>
            <div>
              <b>{{ scanned }}</b
              >of {{ N }} lines read
            </div>
          </div>
          <ul class="found">
            <li
              v-for="(f, i) in SCAN.findings"
              :key="i"
              :class="{ shown: f.line <= scanned }"
            >
              <span class="sev" :class="f.severity">{{
                f.severity.toUpperCase()
              }}</span>
              <span
                ><a :href="withBase(`/rules/${f.rule}`)">{{ f.rule }}</a>
                {{ f.message }}</span
              >
            </li>
          </ul>
          <a class="more" :href="withBase('/guide/ci')">Read the CI guide</a>
        </div>
        <figure class="file">
          <figcaption class="file-head">
            <span>{{ SCAN.file }}</span
            ><span class="pos">{{ posLabel }}</span>
          </figcaption>
          <div ref="viewEl" class="file-view">
            <div ref="innerEl" class="file-inner">
              <div ref="beamEl" class="beam" aria-hidden="true" />
              <template v-for="ln in LINES" :key="ln.n">
                <div
                  class="ln"
                  :class="[
                    ln.sev,
                    {
                      done: ln.n <= scanned,
                      hit: !!ln.sev && ln.n <= scanned,
                    },
                  ]"
                >
                  <span class="n">{{ ln.n }}</span
                  ><span class="s"
                    ><span
                      v-for="(tk, k) in ln.tokens"
                      :key="k"
                      :class="{ k: tk.k }"
                      >{{ tk.t }}</span
                    ></span
                  >
                </div>
                <div
                  v-for="(f, j) in ln.hits"
                  :key="`${ln.n}-${j}`"
                  class="chip"
                  :class="{ open: ln.n <= scanned }"
                >
                  <div>
                    <p
                      class="chip-card"
                      :style="{
                        '--sevc': SEV_COLOR[f.severity] ?? SEV_COLOR.info,
                      }"
                    >
                      <a :href="withBase(`/rules/${f.rule}`)">{{ f.rule }}</a>
                      {{ f.message }}
                      <span class="stamp">{{ f.stamp }}</span>
                    </p>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </figure>
      </div>
    </section>
    <div class="wrap masks-band" :style="chStyle('ch-ci')">
      <h3 class="masks-title" data-reveal>
        Lines that look deliberate in review
      </h3>
      <ul class="masks">
        <li
          v-for="(m, i) in data.masks"
          :key="m.id"
          data-reveal
          :style="{ '--i': i }"
        >
          <code class="snip">{{ m.code }}</code>
          <p>{{ m.effect }}</p>
          <a :href="withBase(`/rules/${m.id}`)"
            ><span class="rule">{{ m.id }}</span> {{ m.title }}</a
          >
        </li>
      </ul>
      <p class="fine" data-reveal>
        Above: every finding the demo repo scan reported for
        <code class="ic">{{ SCAN.file }}</code
        >, at the line it reported. With SARIF upload or
        <code class="ic">qa-doctor summary</code>, this is how they show up in a
        pull request.
      </p>
    </div>

    <!-- ============ 02 FINDINGS ============ -->
    <section
      id="ch-findings"
      class="chapter stacked wrap"
      :style="chStyle('ch-findings')"
      aria-labelledby="qa-findings"
    >
      <header class="ch-side" data-reveal>
        <p class="ch-tag">
          <span>{{ chapter("ch-findings").n }}</span
          >{{ chapter("ch-findings").title }}
        </p>
        <h2 id="qa-findings">
          Every finding says where, how sure, and how to fix it.
        </h2>
        <p>
          This is the first finding from the demo repo scan, exactly as the
          terminal prints it. Each part of it answers one question.
        </p>
        <a class="more" :href="withBase('/guide/what-it-checks')"
          >See what it checks</a
        >
      </header>
      <div
        ref="anatEl"
        class="anatomy"
        @pointermove="spot"
        @pointerleave="unspot"
      >
        <figure class="card wide" data-reveal>
          <pre
            class="anat-term"
            tabindex="0"
          ><span v-for="(l, i) in data.anatomy" :key="i" class="tl"><span v-for="(sp, j) in l" :key="j" :class="{ tb: sp.b, part: !!sp.part, lit: !!sp.part && sp.part === lit }" :style="sp.c ? { color: sp.c } : undefined">{{ sp.t }}</span></span></pre>
        </figure>
        <article
          v-for="(p, i) in ANATOMY"
          :key="p.part"
          class="card"
          :class="{ lit: lit === p.part }"
          :style="{ '--i': i + 1 }"
          tabindex="0"
          data-reveal
          @pointerenter="holdPart(p.part)"
          @focus="holdPart(p.part)"
          @blur="release"
        >
          <h3 class="card-k">{{ p.title }}</h3>
          <code class="tok">{{ p.token }}</code>
          <p>{{ p.body }}</p>
        </article>
      </div>
    </section>

    <!-- ============ 03 SCORE ============ -->
    <section
      id="ch-score"
      class="chapter wrap"
      :style="chStyle('ch-score')"
      aria-labelledby="qa-score"
    >
      <header class="ch-side" data-reveal>
        <p class="ch-tag">
          <span>{{ chapter("ch-score").n }}</span
          >{{ chapter("ch-score").title }}
        </p>
        <h2 id="qa-score">One signal for the health of your test suite.</h2>
        <p>
          See the result at a glance, then open the findings that explain what
          lowered it. The score measures the test suite, not your product.
        </p>
        <a class="more" :href="withBase('/guide/scoring')"
          >Read how the score works</a
        >
      </header>
      <div class="ch-main">
        <div class="score-top" data-reveal>
          <p class="odo">{{ s.demo.score }}</p>
          <p class="score-meta">
            <span class="outof">/{{ s.outOf }}</span
            ><span class="verdict" :class="`tone-${demoTone}`">{{
              s.demo.verdict
            }}</span>
          </p>
        </div>
        <figure class="scale" data-reveal :style="{ '--i': 1 }">
          <div class="meter-head">
            <span>TEST HEALTH</span>
            <span :class="`tone-${demoTone}`"
              >{{ s.demo.verdict }} · {{ s.demo.score }}/{{ s.outOf }}</span
            >
          </div>
          <div
            class="scale-bar"
            role="meter"
            aria-label="Test health score"
            aria-valuemin="0"
            :aria-valuemax="s.outOf"
            :aria-valuenow="s.demo.score"
          >
            <span class="meter-fill" :style="{ width: marker }" />
            <span class="scale-threshold at-50" />
            <span class="scale-threshold at-80" />
            <span class="scale-mark" :style="{ left: marker }">
              <span class="scale-read">{{ s.demo.score }}</span>
            </span>
          </div>
          <div class="meter-axis" aria-hidden="true">
            <span>0</span><span>50</span><span>80</span><span>100</span>
          </div>
          <figcaption class="scale-legend">
            <span v-for="b in s.bands" :key="b.min" class="scale-key">
              <i :class="`tone-${b.tone}`" />
              <span>
                <b>{{ b.verdict }}</b>
                <small>{{
                  b.min === b.max ? b.min : `${b.min}–${b.max}`
                }}</small>
              </span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- ============ 04 EVIDENCE AND TRUST ============ -->
    <section
      id="ch-trust"
      class="chapter stacked wrap"
      :style="chStyle('ch-trust')"
      aria-labelledby="qa-trust"
    >
      <header class="ch-side" data-reveal>
        <p class="ch-tag">
          <span>{{ chapter("ch-trust").n }}</span
          >{{ chapter("ch-trust").title }}
        </p>
        <h2 id="qa-trust">
          Knows the difference between reading code and seeing it run.
        </h2>
        <p>
          Most findings come from reading your code. Give QA Doctor the report
          of a real test run and it can confirm the code actually ran.
        </p>
        <a class="more" :href="withBase('/reference/terminology')"
          >Read the definitions</a
        >
      </header>
      <div class="stamps">
        <div data-reveal>
          <Term :lines="data.staticCard" title="Read from the code" />
          <p class="fine">
            QA Doctor read the workflow file. Nothing ran, so this finding stays
            at L2, proven in code.
          </p>
        </div>
        <div data-reveal :style="{ '--i': 1 }">
          <Term :lines="data.runtimeCard" title="Seen in a real run" />
          <p class="fine">
            The Playwright report shows this spec file ran, so the finding
            reaches L3.
          </p>
        </div>
      </div>
      <ol
        class="ladder"
        data-reveal
        :style="{ '--n': levels.length, '--b': boundary }"
      >
        <li
          v-for="l in levels"
          :key="l.level"
          class="rung"
          :class="{ run: l.runtime }"
          :style="{
            '--h': `${rungHeight(l.i, l.runtime)}%`,
            '--c': l.color,
            '--i': l.i,
          }"
        >
          <span class="bar-box" aria-hidden="true"><span class="bar" /></span>
          <span class="lv-code">{{ l.level }}</span>
          <span class="lv-name">{{ l.name }}</span>
          <span class="lv-body">{{ l.body }}</span>
        </li>
        <li class="runline" aria-hidden="true">
          <span>A real run starts here</span>
        </li>
      </ol>
    </section>

    <!-- ============ 05 RUNTIME ============ -->
    <section
      id="ch-runtime"
      class="chapter wrap"
      :style="chStyle('ch-runtime')"
      aria-labelledby="qa-runtime"
    >
      <header class="ch-side" data-reveal>
        <p class="ch-tag">
          <span>{{ chapter("ch-runtime").n }}</span
          >{{ chapter("ch-runtime").title }}
        </p>
        <h2 id="qa-runtime">Reads what actually ran.</h2>
        <p>
          Point it at a folder of test results. Playwright JSON, Jest and Vitest
          JSON, and JUnit XML from any runner all work.
        </p>
        <a class="more" :href="withBase('/guide/forensics')"
          >Read the forensics guide</a
        >
      </header>
      <div class="ch-main stack-v">
        <div class="streams" data-reveal>
          <Term
            :lines="data.forensics"
            title="qa-doctor forensics ./test-results/"
          />
          <p class="fine">
            TRUE-FLAKE means the test failed at least once and then passed. QA
            Doctor flags it even though the final check was green.
          </p>
        </div>
        <div class="streams" data-reveal>
          <Term :lines="data.selectors" title="qa-doctor doctor:playwright" />
          <p class="fine">
            Selector health grades how each locator finds its element. It
            measures resilience, not correctness.
          </p>
        </div>
      </div>
    </section>

    <!-- ============ 06 MEASURED RULES ============ -->
    <section
      id="ch-rules"
      class="chapter wrap"
      :style="chStyle('ch-rules')"
      aria-labelledby="qa-rules"
    >
      <header class="ch-side" data-reveal>
        <p class="ch-tag">
          <span>{{ chapter("ch-rules").n }}</span
          >{{ chapter("ch-rules").title }}
        </p>
        <h2 id="qa-rules">
          A published <span class="nowrap">false-positive</span> rate for each
          rule.
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
        <div class="big" data-reveal>
          <p class="big-count">
            <b data-ck="measured" :data-to="data.rules.measured">{{
              shown("measured", data.rules.measured)
            }}</b
            ><span>of</span
            ><b data-ck="total" :data-to="data.rules.total">{{
              shown("total", data.rules.total)
            }}</b>
          </p>
          <p class="fine">rules measured on real code</p>
        </div>
        <div class="table-wrap" data-reveal :style="{ '--i': 1 }">
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
              <tr v-for="r in g.rows" :key="r.id" class="row">
                <td>
                  <a :href="withBase(`/rules/${r.id}`)">{{ r.id }}</a>
                </td>
                <td>{{ r.title }}</td>
                <td class="n fp-cell" :class="`fp-${r.tone}`">
                  <span class="fp"
                    ><span class="fp-track" aria-hidden="true"
                      ><span
                        class="fp-fill"
                        :style="{ '--w': `${Math.min(100, r.rate)}%` }" /></span
                    >{{ r.rate }}%</span
                  >
                </td>
                <td class="n sample">n={{ r.n }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ============ 07 CI AND AGENTS ============ -->
    <section
      id="ch-ship"
      class="chapter wrap"
      :style="chStyle('ch-ship')"
      aria-labelledby="qa-ship"
    >
      <header class="ch-side" data-reveal>
        <p class="ch-tag">
          <span>{{ chapter("ch-ship").n }}</span
          >{{ chapter("ch-ship").title }}
        </p>
        <h2 id="qa-ship">Gates the pull request, and checks the agent.</h2>
        <p>
          Scan only what a branch touched, or hand the findings to an AI agent
          and let the re-scan prove the fix.
        </p>
        <a class="more" :href="withBase('/guide/agents')">Connect an agent</a>
      </header>
      <div class="ch-main">
        <div class="flows">
          <div class="flow" data-reveal>
            <h3>In CI</h3>
            <p>
              With <code class="ic">--scope changed</code> it scans the files
              the branch touched and exits non-zero on new findings.
            </p>
            <a class="more" :href="withBase('/guide/ci')"
              >Review the CI workflow</a
            >
          </div>
          <div class="flow" data-reveal>
            <h3>With an AI agent</h3>
            <p>
              The agent writes the fix and QA Doctor re-scans to prove it. Each
              finding in the handoff says whether it is safe to apply or needs a
              person to confirm.
            </p>
            <a class="more" :href="withBase('/guide/agents')"
              >Connect an agent</a
            >
          </div>
        </div>
        <dl class="codes" data-reveal>
          <div v-for="(c, i) in EXIT_CODES" :key="c.code" :style="{ '--i': i }">
            <dt>{{ c.code }}</dt>
            <dd>{{ c.meaning }}</dd>
          </div>
        </dl>
        <p class="fine">
          Exit codes are frozen, so you can build CI logic on them.
        </p>
      </div>
    </section>

    <!-- ============ LIMITS ============ -->
    <section class="wrap limits-band" aria-labelledby="qa-limits">
      <div class="limits-box" data-reveal>
        <h2 id="qa-limits">Where the score stops</h2>
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
    </section>

    <!-- ============ CLOSE ============ -->
    <section class="closing" data-reveal aria-labelledby="qa-run">
      <div class="wrap">
        <h2 id="qa-run" class="huge">Run it on your repo.</h2>
        <div class="close-links">
          <a class="more" href="#ch-ci">Explore the diagnosis</a>
          <a class="more" href="https://github.com/Sergey-Bar/qa-doctor"
            >View on GitHub</a
          >
        </div>
      </div>
      <div class="draw" aria-hidden="true" />
    </section>
  </main>
</template>

<style scoped>
.qa {
  --edge: clamp(20px, 5vw, 48px);
  --glass: color-mix(in srgb, var(--qa-ink-850) 58%, transparent);
  --glass-strong: color-mix(in srgb, var(--qa-ink-850) 78%, transparent);
  --well: var(--glass);
  --line: var(--vp-c-divider);
  --line-2: var(--vp-c-border);
  --t1: var(--vp-c-text-1);
  --t2: var(--vp-c-text-2);
  --t3: var(--vp-c-text-3);
  --settle: cubic-bezier(0.2, 0, 0, 1);
  --spring: cubic-bezier(0.34, 1.45, 0.64, 1);
  --sheen: var(--qa-steel);
  color: var(--t1);
  background: color-mix(in srgb, var(--qa-ink-950) 86%, black);
  font-family: var(--vp-font-family-base);
  line-height: 1.7;
  overflow-x: clip;
}

/* The page sits inside .vp-doc; take back its prose defaults. */
.qa :is(h1, h2, h3) {
  margin: 0;
  padding: 0;
  border: 0;
  font-family: var(--vp-font-family-base);
  text-wrap: balance;
}
.qa h2 {
  color: var(--qa-info);
}
.qa h2::before {
  content: none;
}
/* :where keeps this at class weight, so each component's own margins win. */
.qa :where(p, ul, ol, dl, dd, figure) {
  margin: 0;
  line-height: inherit;
}
.qa :is(ul, ol) {
  padding: 0;
  list-style: none;
}
.qa li + li {
  margin-top: 0;
}
.qa a {
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
.qa a:hover {
  text-decoration-color: var(--t1);
}
.qa code {
  padding: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font-family: var(--vp-font-family-mono);
  font-size: inherit;
}
.qa .ic {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-size: 0.88em;
}
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.nowrap {
  white-space: nowrap;
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
.qa .more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  color: var(--t2);
  text-decoration: none;
}
.qa .more::after {
  content: "→";
  transition: transform 240ms var(--settle);
}
.qa .more:hover {
  color: var(--t1);
}
.qa .more:hover::after {
  transform: translateX(4px);
}
.qa h3 {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--t1);
}

.tone-critical {
  color: var(--qa-critical);
}
.tone-warning {
  color: var(--qa-attention);
}
.tone-healthy {
  color: var(--qa-healthy);
}
.tone-excellent {
  color: var(--qa-excellent-hot);
}

/* ---- reveal: an enhancement, gated on the class the head script sets ---- */
.qa-anim [data-reveal] {
  transition:
    opacity 800ms var(--settle),
    transform 800ms var(--settle),
    filter 800ms var(--settle),
    translate 380ms var(--settle),
    border-color 380ms var(--settle);
  transition-delay:
    calc(var(--i, 0) * 80ms), calc(var(--i, 0) * 80ms),
    calc(var(--i, 0) * 80ms), 0s, 0s;
}
.qa-anim [data-reveal]:not([data-in]) {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(6px);
}

/* ---- scroll progress, under the navbar ---- */
.progress {
  position: fixed;
  top: var(--vp-nav-height);
  left: 0;
  right: 0;
  z-index: 29;
  height: 1px;
  background: var(--sheen);
  transform: scaleX(0);
  transform-origin: left;
  pointer-events: none;
}

/* ---- boot: short diagnostic handshake, never a blocking splash screen ---- */
.boot-screen {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: color-mix(in srgb, var(--qa-ink-950) 86%, black);
  color: var(--t1);
}
.boot-sequence {
  position: relative;
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
}
.boot-mark {
  width: 64px;
  height: 64px;
  overflow: visible;
}
.boot-ring,
.boot-check {
  stroke: var(--qa-info);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 160;
  stroke-dashoffset: 160;
  animation: boot-draw 560ms var(--settle) forwards;
}
.boot-check {
  stroke: var(--qa-healthy-bright);
  stroke-dasharray: 34;
  stroke-dashoffset: 34;
  animation-delay: 370ms;
}
.boot-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: color-mix(in srgb, var(--qa-info) 72%, transparent);
  opacity: 0;
  animation: boot-corners 360ms var(--settle) 140ms forwards;
}
.boot-corner.tl {
  top: 6px;
  left: 6px;
  border-top: 1px solid;
  border-left: 1px solid;
}
.boot-corner.tr {
  top: 6px;
  right: 6px;
  border-top: 1px solid;
  border-right: 1px solid;
}
.boot-corner.bl {
  bottom: 6px;
  left: 6px;
  border-bottom: 1px solid;
  border-left: 1px solid;
}
.boot-corner.br {
  right: 6px;
  bottom: 6px;
  border-right: 1px solid;
  border-bottom: 1px solid;
}
.boot-scan {
  position: absolute;
  top: 18px;
  right: 16px;
  left: 16px;
  height: 1px;
  background: var(--qa-healthy-bright);
  box-shadow: 0 0 14px color-mix(in srgb, var(--qa-info) 70%, transparent);
  opacity: 0;
  animation: boot-scan 500ms linear 440ms forwards;
}
.boot-wordmark {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.28em;
  color: var(--t2);
  opacity: 0;
  transform: translateY(4px);
  animation: boot-wordmark 320ms var(--settle) 520ms forwards;
}
.boot-enter-active,
.boot-leave-active {
  transition: opacity 220ms var(--settle);
}
.boot-leave-to {
  opacity: 0;
}
@keyframes boot-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes boot-corners {
  to {
    opacity: 1;
  }
}
@keyframes boot-scan {
  0% {
    opacity: 0;
    transform: translateY(0);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(76px);
  }
}
@keyframes boot-wordmark {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- hero ---- */
.hero-band {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: color-mix(in srgb, var(--qa-ink-950) 86%, black);
  border-bottom: 1px solid var(--line);
}
.hero-band::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: var(--qa-info);
  opacity: 0.44;
}
.hero-band::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.28;
  background: color-mix(in srgb, var(--qa-info) 8%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 55%, transparent);
}
.hero {
  padding-top: calc(var(--vp-nav-height) + clamp(48px, 7vw, 104px));
  padding-bottom: clamp(72px, 9vw, 128px);
}
.title {
  font-size: clamp(36px, 4.9vw, 64px);
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: 0;
  color: var(--t1);
}
.title .line {
  display: block;
}
.title .line:not(.was) {
  color: var(--qa-info);
}
.title .was {
  color: var(--t1);
}
/* Pure CSS and never below 0.15 opacity: the headline is the page's
   largest paint, so it cannot wait on a script or start invisible. */
.title .w {
  display: inline-block;
  animation: word-in 900ms var(--settle) both;
  animation-delay: calc(var(--d) * 65ms);
}
@keyframes word-in {
  from {
    opacity: 0.15;
    filter: blur(12px);
    transform: translateY(0.3em);
  }
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 6fr);
  gap: clamp(32px, 5vw, 64px);
  align-items: start;
  margin-top: clamp(36px, 5vw, 56px);
}
.lede {
  max-width: 34ch;
  font-size: 18px;
  line-height: 1.6;
  color: var(--t2);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin-top: 32px;
}
.qa .hero-action {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 6px;
  background: var(--t1);
  color: var(--qa-ink-950);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 180ms var(--settle),
    transform 180ms var(--settle);
}
.qa .hero-action:hover {
  background: var(--qa-steel);
  color: var(--qa-ink-950);
  transform: translateY(-1px);
}

/* ---- quick start: actionable before the deep product tour ---- */
.quick-start {
  display: grid;
  grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr);
  gap: clamp(32px, 7vw, 96px);
  padding-block: clamp(64px, 9vw, 112px);
  border-bottom: 1px solid var(--line);
}
.section-label {
  margin-bottom: 14px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--qa-info);
}
.quick-start header h2 {
  max-width: 13ch;
  font-size: clamp(28px, 3.2vw, 42px);
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: 0;
}
.quick-start header > p:last-child {
  max-width: 34ch;
  margin-top: 18px;
  color: var(--t2);
}
.quick-steps {
  border-top: 1px solid var(--line);
}
.quick-steps li {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 18px;
  padding: 22px 0 24px;
  border-bottom: 1px solid var(--line);
  transition:
    padding-left 180ms var(--settle),
    background-color 180ms var(--settle);
}
.quick-steps li:hover {
  padding-left: 12px;
  background: color-mix(in oklch, var(--qa-steel) 4%, transparent);
}
.quick-n {
  padding-top: 2px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--qa-info);
}
.quick-steps h3 {
  font-size: 17px;
}
.quick-steps p {
  max-width: 46ch;
  margin-top: 4px;
  margin-bottom: 14px;
  font-size: 14px;
  color: var(--t2);
}

/* ---- works with: compatibility should be visible at a glance ---- */
.stack {
  display: flex;
  align-items: flex-start;
  gap: 32px;
  padding-block: 28px;
  border-bottom: 1px solid var(--line);
}
.stack-detail {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  padding: 24px;
  border: 1px solid var(--line-2);
  background: var(--glass);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 5%, transparent);
  backdrop-filter: blur(18px) saturate(1.15);
}
.stack-group > span {
  display: block;
  margin-bottom: 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--qa-info);
}
.stack-group ul {
  display: grid;
  gap: 8px;
}
.stack-group li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--t2);
}
.stack-group svg {
  width: 17px;
  height: 17px;
  color: var(--qa-steel);
}
.stack-group .mono {
  width: 17px;
  height: 17px;
  font-size: 7px;
}
.qa .stack-title {
  flex: none;
  width: 10rem;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--t2);
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
     0.7 these tiles measured below AA. */
  color: var(--vp-c-text-2);
}
.logo:hover {
  color: var(--t1);
  border-color: var(--line-2);
  background: var(--vp-c-bg-soft);
}
.logo:hover svg {
  opacity: 1;
  color: var(--qa-healthy);
  filter: none;
}

/* ---- overview ---- */
.overview {
  padding-block: clamp(56px, 7vw, 88px) clamp(24px, 3vw, 40px);
}
.qa .overview-title {
  font-size: clamp(24px, 2.6vw, 30px);
  font-weight: 500;
  letter-spacing: 0;
}
.toc {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: clamp(32px, 5vw, 64px);
  margin-top: 28px;
}
.toc li {
  border-top: 1px solid var(--line);
  transition:
    opacity 600ms var(--settle),
    transform 600ms var(--settle);
  transition-delay: calc(var(--i) * 60ms);
}
.qa-anim .toc[data-reveal]:not([data-in]) li {
  opacity: 0;
  transform: translateY(10px);
}
.qa .toc a {
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
  color: var(--ch);
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
.qa .toc a:hover .toc-go {
  color: var(--ch);
  transform: translateY(3px);
}

/* ---- chapters: one frame for every feature ---- */
.chapter {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 9fr);
  gap: clamp(32px, 4vw, 56px);
  padding-block: clamp(64px, 8vw, 112px);
  scroll-margin-top: var(--vp-nav-height);
}
.chapter::before,
.scan::before {
  content: "";
  position: absolute;
  top: 0;
  left: var(--edge);
  right: var(--edge);
  border-top: 1px solid var(--line);
}
.chapter::after,
.scan::after {
  content: "";
  position: absolute;
  top: -1px;
  left: var(--edge);
  width: 72px;
  height: 2px;
  background: var(--ch);
}
.chapter.stacked {
  grid-template-columns: minmax(0, 1fr);
  gap: 40px;
}
.chapter.stacked .ch-side {
  position: static;
  max-width: 760px;
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
  color: var(--ch);
}
.ch-tag span {
  font-family: var(--vp-font-family-mono);
  font-weight: 400;
  color: var(--ch);
}
.qa :is(.ch-side, .scan-copy) h2 {
  margin-top: 14px;
  font-size: clamp(24px, 2.5vw, 32px);
  font-weight: 500;
  line-height: 1.16;
  letter-spacing: 0;
  color: var(--qa-info);
}
.ch-side > p:not(.ch-tag),
.scan-lede {
  margin-top: 14px;
  max-width: 40ch;
  font-size: 16px;
  line-height: 1.65;
  color: var(--t2);
}
.ch-side .more,
.scan-copy .more {
  margin-top: 22px;
}
.qa .ch-side .more,
.qa .scan-copy .more {
  text-decoration-color: color-mix(in srgb, var(--ch) 70%, transparent);
}
.ch-main {
  min-width: 0;
}
.stack-v {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
}
.ch-main :deep(.term),
.stamps :deep(.term),
.scale,
.file {
  border-top: 2px solid var(--ch);
}

/* 01 ---- the scan: the real workflow, read line by line ---- */
.scan {
  position: relative;
  scroll-margin-top: var(--vp-nav-height);
}
.scan-sticky {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: clamp(32px, 4vw, 64px);
  align-items: start;
  padding-block: clamp(64px, 8vw, 112px) 40px;
}
.scan.live {
  height: 330vh;
}
.scan.live .scan-sticky {
  position: sticky;
  top: var(--vp-nav-height);
  height: calc(100vh - var(--vp-nav-height));
  height: calc(100svh - var(--vp-nav-height));
  align-items: center;
  padding-block: 24px;
}
.tally {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--t3);
}
.tally b {
  display: block;
  margin-bottom: 2px;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  color: var(--t1);
}
.tally .t-err b {
  color: var(--qa-critical);
}
.tally .t-warn b {
  color: var(--qa-attention);
}
.tally .t-info b {
  color: var(--qa-info);
}
.found {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}
.found li {
  display: grid;
  grid-template-columns: 4.8rem minmax(0, 1fr);
  gap: 12px;
  align-items: baseline;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--t2);
  opacity: 0;
  visibility: hidden;
  transform: translateX(-10px);
  transition:
    opacity 360ms var(--settle),
    transform 360ms var(--settle),
    visibility 0s linear 360ms;
}
.found li.shown {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}
.found a {
  margin-right: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--t1);
}
.sev {
  justify-self: start;
  padding: 2px 7px;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.sev.error {
  color: var(--qa-critical);
  background: color-mix(in srgb, var(--qa-critical) 14%, transparent);
}
.sev.warning {
  color: var(--qa-attention);
  background: color-mix(in srgb, var(--qa-attention) 14%, transparent);
}
.sev.info {
  color: var(--qa-info);
  background: color-mix(in srgb, var(--qa-info) 12%, transparent);
}
.file {
  position: relative;
  min-width: 0;
  border: 1px solid var(--line-2);
  border-top: 2px solid var(--ch);
  border-radius: 10px;
  background: var(--glass-strong);
  backdrop-filter: blur(18px) saturate(1.15);
  overflow: hidden;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.7);
}
.file-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--t3);
}
.pos {
  font-variant-numeric: tabular-nums;
}
.file-view {
  position: relative;
}
.scan.live .file-view {
  height: min(calc(100vh - var(--vp-nav-height) - 150px), 620px);
  overflow: hidden;
}
.file-inner {
  position: relative;
  padding: 12px 0 24px;
}
.scan.live .file-inner {
  will-change: transform;
}
.ln {
  display: grid;
  grid-template-columns: 4.5ch minmax(0, 1fr);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.85;
  color: var(--t3);
  transition:
    color 500ms var(--settle),
    background-color 500ms var(--settle);
}
.ln .n {
  padding-right: 16px;
  text-align: right;
  user-select: none;
  transition: color 400ms var(--settle);
}
.ln .s {
  padding-right: 18px;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ln.done {
  color: var(--t2);
}
.ln.done .k {
  color: var(--qa-steel);
}
.ln.hit {
  color: var(--t1);
}
.ln.hit.error {
  background: color-mix(in srgb, var(--qa-critical) 13%, transparent);
}
.ln.hit.error .n {
  color: var(--qa-critical);
}
.ln.hit.warning {
  background: color-mix(in srgb, var(--qa-attention) 11%, transparent);
}
.ln.hit.warning .n {
  color: var(--qa-attention);
}
.ln.hit.info {
  background: color-mix(in srgb, var(--qa-info) 9%, transparent);
}
.ln.hit.info .n {
  color: var(--qa-info);
}
.chip {
  display: grid;
  grid-template-rows: 1fr;
}
.chip > div {
  min-height: 0;
  overflow: hidden;
}
.chip-card {
  margin: 6px 18px 12px calc(4.5ch + 16px);
  padding: 11px 14px;
  border: 1px solid var(--line-2);
  border-left: 2px solid var(--sevc);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--t2);
  opacity: 0;
  transform: translateY(-6px);
  transition:
    opacity 360ms var(--settle) 120ms,
    transform 360ms var(--settle) 120ms;
}
.chip.open .chip-card {
  opacity: 1;
  transform: none;
}
.chip-card a {
  margin-right: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--t1);
}
.stamp {
  display: block;
  margin-top: 3px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--t3);
}
.beam {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--qa-info) 12%,
    var(--qa-steel) 50%,
    var(--qa-healthy) 88%,
    transparent
  );
  box-shadow: 0 0 20px 2px color-mix(in srgb, var(--qa-info) 34%, transparent);
  pointer-events: none;
}
.beam::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  height: 64px;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--qa-info) 8%, transparent),
    transparent
  );
}
.scan.live .beam {
  display: block;
}

.masks-band {
  padding-block: 8px clamp(56px, 7vw, 96px);
}
.masks-title {
  margin-bottom: 22px;
}
.masks {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px;
}
.masks li {
  display: grid;
  gap: 8px;
  align-content: start;
}
.qa .snip {
  display: block;
  padding: 11px 14px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--well);
  font-size: 13px;
  line-height: 1.5;
  color: var(--t1);
  white-space: nowrap;
  overflow-x: auto;
}
.masks p {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--t2);
}
.masks a {
  font-size: 13px;
  line-height: 1.5;
  color: var(--t3);
}

/* 02 ---- anatomy of a finding ---- */
.anatomy {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.card {
  position: relative;
  padding: 22px 22px 24px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--glass);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
  backdrop-filter: blur(18px) saturate(1.15);
  overflow: hidden;
  --mx: -600px;
  --my: -600px;
}
/* The spotlight: a lit ring where the pointer is, drawn on the border only. */
.card::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: radial-gradient(
    300px circle at var(--mx) var(--my),
    color-mix(in srgb, var(--qa-info) 62%, transparent),
    transparent 45%
  );
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
  pointer-events: none;
}
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    420px circle at var(--mx) var(--my),
    color-mix(in srgb, var(--qa-info) 5%, transparent),
    transparent 55%
  );
  pointer-events: none;
}
.card > * {
  position: relative;
  z-index: 1;
}
.card:hover,
.card.lit {
  translate: 0 -3px;
}
.card.lit {
  border-color: color-mix(in srgb, var(--qa-info) 38%, transparent);
}
.card.wide {
  grid-column: 1 / -1;
  padding: 0;
  background: var(--well);
}
.card.wide:hover {
  translate: none;
}
.qa .card-k {
  font-size: 15px;
  font-weight: 500;
}
.card p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--t2);
}
.qa .tok {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin-top: 14px;
  padding: 4px 9px;
  border: 1px solid var(--line-2);
  border-radius: 5px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--t1);
  overflow-wrap: anywhere;
  transition:
    border-color 350ms var(--settle),
    background-color 350ms var(--settle);
}
.card.lit .tok {
  border-color: color-mix(in srgb, var(--qa-info) 45%, transparent);
  background: color-mix(in srgb, var(--qa-info) 8%, transparent);
}
/* A system monospace on purpose: the Geist Mono web subset has no
   box-drawing glyphs, and this card must match the terminal exactly. */
.anat-term {
  margin: 0;
  padding: 18px 22px;
  overflow-x: auto;
  font-family:
    ui-monospace, "SF Mono", "Cascadia Code", "Cascadia Mono", Consolas,
    "DejaVu Sans Mono", Menlo, monospace;
  font-size: clamp(10px, 2.4vw, 13px);
  line-height: 1.6;
  color: var(--t2);
  white-space: pre;
}
.anat-term .tl {
  display: block;
  min-height: 1.6em;
}
.anat-term .tb {
  font-weight: 700;
}
.anat-term .part {
  border-radius: 3px;
  transition:
    background-color 350ms var(--settle),
    box-shadow 350ms var(--settle);
}
.anat-term .lit {
  background: color-mix(in srgb, var(--qa-info) 12%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--qa-info) 40%, transparent);
}

/* 03 ---- score ---- */
.score-top {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 6px 18px;
}
.odo {
  display: inline-flex;
  font-size: clamp(88px, 10vw, 144px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  color: var(--t1);
}
.score-meta {
  display: grid;
  gap: 4px;
  padding-bottom: 0.7em;
}
.outof {
  font-family: var(--vp-font-family-mono);
  font-size: 20px;
  color: var(--t3);
}
.verdict {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
}
.scale {
  margin-top: 32px;
  padding: 24px;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  background: var(--glass);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
  backdrop-filter: blur(18px) saturate(1.15);
}
.meter-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
}
.meter-head > span:first-child {
  color: var(--t3);
}
.scale-bar {
  position: relative;
  height: 8px;
  margin-top: 34px;
  background: color-mix(in srgb, var(--qa-steel) 12%, transparent);
  box-shadow: inset 0 0 0 1px var(--line);
}
.meter-fill {
  display: block;
  height: 100%;
  background: var(--qa-healthy);
  transform-origin: left;
  transition: width 900ms var(--settle);
}
.qa-anim .scale[data-reveal]:not([data-in]) .meter-fill {
  width: 0 !important;
}
.scale-threshold {
  position: absolute;
  top: -4px;
  width: 1px;
  height: 16px;
  background: color-mix(in srgb, var(--t1) 48%, transparent);
}
.scale-threshold.at-50 {
  left: 50%;
}
.scale-threshold.at-80 {
  left: 80%;
}
.scale-mark {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border: 3px solid var(--qa-ink-850);
  border-radius: 50%;
  background: var(--t1);
  box-shadow: 0 0 0 1px var(--qa-healthy);
  transform: translateX(-50%);
  translate: 0 -50%;
}
.scale-read {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  white-space: nowrap;
  color: var(--t1);
}
.meter-axis {
  position: relative;
  height: 22px;
  margin-top: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--t3);
}
.meter-axis span {
  position: absolute;
  transform: translateX(-50%);
}
.meter-axis span:nth-child(1) {
  left: 0;
  transform: none;
}
.meter-axis span:nth-child(2) {
  left: 50%;
}
.meter-axis span:nth-child(3) {
  left: 80%;
}
.meter-axis span:nth-child(4) {
  right: 0;
  transform: none;
}
.scale-legend {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.scale-key {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  min-width: 0;
}
.scale-key i {
  flex: none;
  width: 6px;
  height: 6px;
  margin-top: 5px;
  border-radius: 50%;
  background: currentColor;
}
.scale-key span {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.scale-key b {
  font-size: clamp(9px, 1vw, 11px);
  font-weight: 600;
  letter-spacing: 0.08em;
  white-space: normal;
  overflow-wrap: anywhere;
  color: var(--t2);
}
.scale-key small {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--t3);
}
/* 04 ---- trust ---- */
.stamps {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}
.qa .ladder {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: 14px;
  padding: 28px 24px 24px;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  background: var(--glass);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
  backdrop-filter: blur(18px) saturate(1.15);
}
.rung {
  display: grid;
  grid-template-rows: 180px auto auto 1fr;
  gap: 4px;
}
.bar-box {
  display: flex;
  align-items: flex-end;
}
.bar {
  position: relative;
  display: block;
  width: 100%;
  height: var(--h);
  overflow: hidden;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--c) 45%, transparent),
    var(--c)
  );
  transform-origin: bottom;
  transition: transform 900ms var(--settle);
  transition-delay: calc(var(--i) * 110ms + 150ms);
}
.qa-anim .ladder[data-reveal]:not([data-in]) .bar {
  transform: scaleY(0);
}
/* One pass of light up the rungs a real run reaches. Once, never looped. */
.rung.run .bar::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    transparent,
    color-mix(in srgb, var(--vp-c-text-1) 45%, transparent),
    transparent
  );
  transform: translateY(100%);
}
.ladder[data-in] .rung.run .bar::after {
  animation: sweep 1.3s var(--settle) both;
  animation-delay: calc(var(--i) * 140ms + 900ms);
}
@keyframes sweep {
  to {
    transform: translateY(-100%);
  }
}
.lv-code {
  margin-top: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--t3);
}
.rung.run .lv-code {
  color: var(--c);
}
.lv-name {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--t1);
}
.lv-body {
  font-size: 13px;
  line-height: 1.5;
  color: var(--t2);
}
.runline {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: calc(24px + var(--b) * (100% - 48px + 14px) / var(--n) - 7px);
  border-left: 1px dashed color-mix(in srgb, var(--qa-info) 55%, transparent);
}
.runline span {
  position: absolute;
  top: 0;
  left: 10px;
  font-size: 12px;
  white-space: nowrap;
  color: var(--qa-healthy-bright);
}

/* 05 ---- runtime: the output streams in ---- */
.streams :deep(.tl) {
  transition: opacity 320ms var(--settle);
  transition-delay: calc(var(--i) * 35ms);
}
.qa-anim .streams[data-reveal]:not([data-in]) :deep(.tl) {
  opacity: 0;
}

/* 06 ---- measured rules ---- */
.big-count {
  font-size: clamp(48px, 5.4vw, 72px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}
.big-count span {
  margin-inline: 0.2em;
  font-size: 0.45em;
  letter-spacing: 0;
  color: var(--t3);
}
.big-count b {
  font-weight: 500;
}
.big .fine {
  margin-top: 8px;
}
.table-wrap {
  margin-top: 32px;
  overflow-x: auto;
}
.qa .rules {
  display: table;
  width: 100%;
  min-width: 560px;
  margin: 0;
  border-collapse: collapse;
  font-size: 15px;
}
.qa .rules :is(tr, th, td) {
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
.rules thead th.n {
  text-align: right;
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
  padding: 9px 16px 9px 0;
  vertical-align: middle;
  color: var(--t2);
}
.qa .rules tr.row {
  transition: background-color 160ms var(--settle);
}
.qa .rules tr.row:hover {
  background: var(--vp-c-bg-alt);
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
.fp-cell {
  width: 1%;
}
.fp {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.fp-track {
  position: relative;
  width: 96px;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--line);
}
.fp-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--w);
  border-radius: 2px;
  background: currentColor;
  transition: width 1100ms var(--settle) 300ms;
}
.qa-anim .table-wrap[data-reveal]:not([data-in]) .fp-fill {
  width: 0;
}
.fp-zero {
  color: var(--t1);
}
.fp-mid {
  color: var(--qa-attention);
}
.fp-high {
  color: var(--qa-critical);
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
.codes > div {
  transition:
    opacity 600ms var(--settle),
    transform 600ms var(--settle);
  transition-delay: calc(var(--i) * 90ms + 150ms);
}
.qa-anim .codes[data-reveal]:not([data-in]) > div {
  opacity: 0;
  transform: translateY(12px);
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

/* ---- limits ---- */
.limits-band {
  position: relative;
  padding-block: clamp(64px, 8vw, 104px) 0;
}
.limits-band::before {
  content: "";
  position: absolute;
  top: 0;
  left: var(--edge);
  right: var(--edge);
  border-top: 1px solid var(--line);
}
.qa .limits-box h2 {
  font-size: clamp(24px, 2.5vw, 30px);
  font-weight: 500;
  letter-spacing: 0;
}
.limits {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 40px;
  margin-top: 24px;
}
.limits li {
  font-size: 16px;
  line-height: 1.5;
  color: var(--t1);
}
.lim-detail {
  display: block;
  margin-top: 4px;
  font-size: 14px;
  color: var(--t2);
}

/* ---- close ---- */
.closing {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding-block: clamp(104px, 13vw, 176px);
  text-align: center;
}
.closing::before {
  content: "";
  position: absolute;
  inset: auto -10% 0 -10%;
  z-index: -1;
  height: 80%;
  background:
    radial-gradient(
      38% 70% at 22% 100%,
      color-mix(in srgb, var(--qa-healthy) 18%, transparent),
      transparent 70%
    ),
    radial-gradient(
      38% 70% at 50% 100%,
      color-mix(in srgb, var(--qa-info) 12%, transparent),
      transparent 70%
    ),
    radial-gradient(
      38% 70% at 78% 100%,
      color-mix(in srgb, var(--qa-steel) 10%, transparent),
      transparent 70%
    );
  animation: breathe 14s ease-in-out infinite alternate;
}
@keyframes breathe {
  from {
    opacity: 0.7;
    transform: translateY(4%);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.qa .huge {
  font-size: clamp(44px, 7.4vw, 104px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
}
.close-key {
  margin-top: 40px;
}
.close-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin-top: 22px;
}
.draw {
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--qa-info) 18%,
    var(--qa-steel) 50%,
    var(--qa-healthy) 82%,
    transparent
  );
  box-shadow: 0 0 28px 3px color-mix(in srgb, var(--qa-info) 20%, transparent);
  transition: transform 1600ms var(--settle) 300ms;
}
.qa-anim .closing[data-reveal]:not([data-in]) .draw {
  transform: scaleX(0);
}

@media (max-width: 960px) {
  .chapter,
  .scan-sticky {
    grid-template-columns: minmax(0, 1fr);
  }
  .ch-side {
    position: static;
  }
  .anatomy,
  .masks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .qa .ladder {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 28px;
  }
  .runline {
    display: none;
  }
  /* The pinned scan keeps going on a phone: the file takes the room the
     prose gives up, and the chips carry the findings inline. */
  .scan.live .scan-sticky {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 16px;
    padding-block: 20px 16px;
  }
  .scan.live :is(.scan-lede, .found, .more) {
    display: none;
  }
  .qa .scan.live .scan-copy h2 {
    font-size: 22px;
  }
  .scan.live .tally {
    margin-top: 14px;
    padding-top: 12px;
  }
  .scan.live .file {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .scan.live .file-view {
    flex: 1;
    height: auto;
  }
  .ln {
    font-size: 11.5px;
  }
  .ln .s {
    padding-left: 4ch;
    text-indent: -4ch;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .chip-card {
    margin-inline: 12px;
  }
}
@media (max-width: 880px) {
  .hero-grid,
  .toc,
  .flows,
  .limits,
  .quick-start {
    grid-template-columns: minmax(0, 1fr);
  }
  .codes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .stack {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
  .qa .stack-title {
    width: auto;
  }
  .stack-detail {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    padding: 0 0 20px;
    border: 0;
    background: none;
  }
  .anatomy,
  .masks {
    grid-template-columns: minmax(0, 1fr);
  }
  .qa .ladder {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rung {
    grid-template-rows: 110px auto auto 1fr;
  }
  .scale-key b {
    font-size: 10px;
    letter-spacing: 0.06em;
  }
  .scale-legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .qa a,
  .toc-go,
  .card,
  .chip,
  .chip-card,
  .ln,
  .ln .n,
  .qa .rules tr.row {
    transition: none;
  }
  .title .w,
  .title .was,
  .found li,
  .closing::before,
  .ladder[data-in] .rung.run .bar::after {
    animation: none;
  }
  .boot-ring,
  .boot-check,
  .boot-corner,
  .boot-scan,
  .boot-wordmark {
    animation: none;
  }
}
</style>
