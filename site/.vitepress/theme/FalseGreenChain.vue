<script setup lang="ts">
import { withBase } from "vitepress";

/**
 * The CI false-green chain, as a diagram (site UX plan G9).
 *
 * The four-step mental model — REAL FAILURE → MASKED BY CI → GREEN CHECK
 * → FALSE TRUST — used to exist only as prose in guide/ci.md. Each mask
 * is annotated with the real registry rule that catches it (rule IDs and
 * titles come from docs/rules/*.md, generated from the live registry —
 * gen-rules.mjs regenerates them on every build, so a renamed rule
 * breaks the build rather than rotting the page).
 *
 * Conceptual diagram: no numbers, so site law's generated-data rule does
 * not bind. Static HTML/CSS — readable with no JS, no animation.
 */
const stages = [
  {
    name: "Real failure",
    desc: "A test fails. The exit code says so.",
    mask: null,
  },
  {
    name: "Masked by CI",
    desc: "A workflow pragma swallows the failure before anyone sees it.",
    mask: null,
  },
  {
    name: "Green check",
    desc: "The Checks API reports success — the branch looks mergeable.",
    mask: null,
  },
  {
    name: "False trust",
    desc: "The team merges on green. The bug ships with a clean record.",
    mask: null,
  },
];

/** The named mechanisms, each tied to its real QA-CI rule. */
const masks = [
  {
    mech: "continue-on-error: true",
    rule: "QA-CI-001",
    ruleTitle: "continue-on-error masks a failing verification gate",
  },
  {
    mech: "|| true",
    rule: "QA-CI-002",
    ruleTitle: "Ignored exit code (|| true)",
  },
  {
    mech: "missing pipefail",
    rule: "QA-CI-009",
    ruleTitle: "Test command does not propagate exit code",
  },
  {
    mech: "if: skip-on-PR",
    rule: "QA-CI-010",
    ruleTitle: "Tests skipped where they must block",
  },
];
</script>

<template>
  <div class="fgc">
    <ol class="fgc-chain">
      <li v-for="(s, i) in stages" :key="s.name" class="fgc-stage">
        <span class="fgc-arrow" aria-hidden="true">→</span>
        <span class="fgc-num">{{ i + 1 }}</span>
        <span class="fgc-name">{{ s.name }}</span>
        <span class="fgc-desc">{{ s.desc }}</span>
      </li>
    </ol>

    <div class="fgc-masks">
      <p class="fgc-masks-lead">The masks — and the rule that strips each:</p>
      <ul class="fgc-mask-list">
        <li v-for="m in masks" :key="m.rule" class="fgc-mask">
          <code class="fgc-mech">{{ m.mech }}</code>
          <span class="fgc-rule">
            <a :href="withBase('/rules/' + m.rule)">{{ m.rule }}</a>
            <span class="fgc-rule-title">{{ m.ruleTitle }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.fgc {
  margin: 1.2rem 0 1.6rem;
}
.fgc-chain {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.8rem;
}
.fgc-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.9rem 1rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-alt);
  min-width: 0;
}
.fgc-stage:last-child {
  border-color: rgba(236, 107, 102, 0.45);
  background: linear-gradient(
    180deg,
    rgba(236, 107, 102, 0.09),
    transparent 70%
  );
}
.fgc-num {
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  color: var(--vp-c-brand-1);
}
.fgc-name {
  font-family: var(--mj-display);
  font-weight: 600;
  font-size: 0.98rem;
  color: var(--vp-c-text-1);
}
.fgc-stage:last-child .fgc-name {
  color: var(--mj-unworthy);
}
.fgc-desc {
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.fgc-arrow {
  position: absolute;
  right: -0.72rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vp-c-brand-1);
  font-size: 0.9rem;
  z-index: 1;
}
.fgc-stage:last-child .fgc-arrow {
  color: var(--mj-unworthy);
}

.fgc-masks {
  margin-top: 1.1rem;
  padding: 0.9rem 1.1rem 1rem;
  border-radius: 10px;
  border: 1px dashed rgba(224, 180, 67, 0.4);
}
.fgc-masks-lead {
  margin: 0 0 0.6rem;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.fgc-mask-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem 1.4rem;
}
.fgc-mask {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.7rem;
  font-size: 0.82rem;
}
.fgc-mech {
  font-size: 0.78rem;
  white-space: nowrap;
}
.fgc-rule {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  min-width: 0;
}
.fgc-rule a {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
}
.fgc-rule-title {
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
  min-width: 0;
}

@media (max-width: 860px) {
  .fgc-chain {
    grid-template-columns: 1fr;
  }
  .fgc-arrow {
    right: auto;
    top: -0.55rem;
    left: 1.1rem;
    transform: rotate(90deg);
  }
  .fgc-mask-list {
    grid-template-columns: 1fr;
  }
}
</style>
