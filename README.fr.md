<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Les tests vous disent ce qui a réussi. Mjölnir vous dit à quoi vous pouvez vous fier." width="100%" />

<br />

Mjölnir trouve les tests qui ne peuvent pas échouer et les pipelines qui ne peuvent pas passer au rouge,<br />
puis évalue jusqu'où le résultat mérite confiance, avec la preuve de chaque point.

<br />

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![downloads](https://img.shields.io/npm/dm/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0A1119)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Sergey-Bar/Mjolnir?style=flat-square&color=1F6F7C&labelColor=0A1119&label=coverage)](https://codecov.io/gh/Sergey-Bar/Mjolnir)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Sergey-Bar/Mjolnir/badge)](https://scorecard.dev/viewer/?uri=github.com/Sergey-Bar/Mjolnir)
[![license](https://img.shields.io/badge/license-MIT-1F6F7C.svg?style=flat-square&labelColor=0A1119)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-1F6F7C.svg?style=flat-square&labelColor=0A1119)](https://nodejs.org)

```bash
npx mjolnir-qa@3.0.0
```

[Le voir à l'œuvre](#le-voir-à-lœuvre) · [Démarrage rapide](#démarrage-rapide) · [Ce qu'il trouve](#ce-que-mjölnir-trouve) · [Score](#le-score-de-fiabilité) · [Preuves](#le-modèle-de-preuves) · [Forensique](#forensique-dexécution) · [CI](#intégrité-de-la-ci) · [Agents](#agents-ia) · [Sécurité](#confiance-et-sécurité) · [Limites](#ce-que-mjölnir-ne-peut-pas-vous-dire) · [Docs](#documentation)

<details>
<summary>Lire dans une autre langue — 22 traductions</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | Français | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-26.

<!-- Source hash: `de04dfb1677b` -->

</details>

</div>

<br />

## Release status (English canonical)

The published line is `3.0.0`; this working tree is the `4.0.0-rc.1`
candidate. `3.0.0` must not be republished or retagged. The M26–M50 program is
tracked in
[`docs/ROADMAP.yaml`](docs/ROADMAP.yaml); provisional capability contracts
are not automatically enabled or certified. Repository-owned checks pass, but
Trust certification remains `NOT_CERTIFIED` until the protected holdout,
real-world, platform/consumer, remote-workflow, support-matrix, and corpus
evidence gates pass. Run `npm run m26:readiness` before treating any candidate
as releasable. This document does not publish a tag or authorize a release.

> Machine-assisted canonical text. Translate this block before treating it as localized copy.

## Une coche verte est une affirmation, pas une preuve

Une coche verte signifie que le pipeline n'a pas échoué. Elle ne signifie pas que les tests ont tourné, ni qu'ils auraient pu échouer. Chacun de ces cas passe au vert :

- un `.only` commité qui a exécuté 3 tests au lieu de 900
- `continue-on-error: true` sur le job censé servir de barrière
- `|| true` après la commande de test
- un test qui n'affirme rien, ou dont le corps est vide
- un wrapper de relance qui transforme un vrai échec en réussite chanceuse
- un rapport que le workflow téléverse mais n'a jamais généré
- un sleep fixe qui maintient une condition de concurrence

Aucun ne fait passer le pipeline au rouge, et chacun semble délibéré en revue. C'est pour cela qu'ils survivent. Voici Mjölnir lisant un cas réel :

<p align="center">
  <img src="assets/readme/scan.svg" alt="Le workflow CI du dépôt de démonstration, lu ligne par ligne. Mjölnir signale chaque constat à la ligne rapportée, avec sa règle, ce qui ne va pas, son niveau de preuve et son taux de faux positifs mesuré." width="800" />
</p>

<sub>Chaque constat que le scan de démonstration a rapporté pour ce workflow, à la ligne rapportée. Généré par `npm run docs:readme-brand` à partir de [`demo-report.json`](assets/readme/demo-report.json) et verrouillé contre toute dérive en CI.</sub>

**Mode strict.** Les détections les plus agressives — `.only`, `continue-on-error`, tests vides, abus de retry — vivent dans le niveau quarantaine. Elles ne tournent qu'avec `--strict` et sont limitées à la sévérité `info` : elles signalent, ne bloquent jamais. Le scan par défaut (`npx mjolnir-qa@3.0.0` sans `--strict`) ne couvre que les règles core et extended. Ajoutez `--strict` quand vous voulez aussi la couche consultative.

Mjölnir lit la suite, les workflows CI et, si vous en avez un, le rapport d'une exécution réelle. Il n'exécute pas vos tests, n'installe pas vos dépendances et n'exécute pas le code qu'il analyse. Et quand il n'a pas de preuve, il le dit au lieu d'inventer de la confiance :

| Situation                                              | Ce que Mjölnir rapporte                                         |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Aucune déclaration de test trouvée                     | Score `null`, affiché comme **UNKNOWN**. Jamais un 100 inventé. |
| Aucune baseline ni révision comparable                 | **UNKNOWN**, avec la raison indiquée. Jamais un 0 supposé.      |
| Scan interrompu (budget de temps, fichiers illisibles) | **PARTIAL**, sortie `2`. Jamais présenté comme propre.          |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Comment fonctionne Mjölnir. Il lit la suite de tests et le pipeline CI de manière statique, ainsi que le rapport d'une exécution réelle quand il y en a un. Il pondère chaque constat par son niveau de preuve et son niveau de confiance, où seule une exécution réelle peut atteindre L3 à L5, et produit des constats, un score de fiabilité et une barrière CI aux codes de sortie figés. Dans la boucle d'agent, l'IA écrit le correctif et Mjölnir relance le scan pour le prouver." width="880" />
</p>

<sub>Composé pour cette page et affiché à 1:1. Généré par `npm run docs:readme-brand` et verrouillé contre toute dérive en CI ; le score, les décomptes et l'ID de règle proviennent de [`script.demo.json`](assets/video/script.demo.json), de [`demo-report.json`](assets/readme/demo-report.json) et du registre des règles, jamais saisis à la main. La même image en affiche : [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Le voir à l'œuvre

Un vrai scan de [`examples/demo-repo`](examples/demo-repo), une petite suite Playwright avec un workflow CI. Voici où sont partis ses points :

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Le détail des déductions de Mjölnir : WORTHINESS 80/100 WORTHY, le score par catégorie, l'encadré des déductions par sévérité et une liste FIX THIS FIRST" width="520" />
</p>

<sub>Généré par `npm run docs:hero` à partir d'un vrai scan et verrouillé contre toute dérive en CI. Le rapport `--verbose` complet du même scan est [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Le regarder</strong> — un scan, le correctif qu'il affiche et le nouveau scan qui le prouve</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Une image de l'enregistrement de démonstration : npx mjolnir-qa@3.0.0 analysant le dépôt de démonstration dans une fenêtre de terminal" width="900" />
  </a>
</p>

<sub>Rendu image par image à partir d'un vrai scan par `npm run docs:video` ; jamais enregistré à l'écran. Sélectionnez l'image pour ouvrir [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Un constat, de près

Chaque constat répond à quatre questions : où il se trouve, à quel point Mjölnir est sûr, à quelle fréquence la règle se trompe, et comment le corriger.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Le premier constat du scan de démonstration, exactement tel que le terminal l'affiche, avec ses quatre parties repérées : où, à quel point c'est sûr, à quelle fréquence la règle se trompe, et le correctif." width="100%" />
</p>

`mjolnir explain QA-CI-001` affiche tout le dossier de confiance d'une règle, y compris son taux de faux positifs mesuré et le niveau que ce taux lui a valu :

```text
  ▍ QA-CI-001 — continue-on-error masks a failing verification gate

Severity:    error
Confidence:  high
Tier:        quarantine
Evidence:    E2
QA impact:   False-green risk (FALSE-GREEN)
Measured FP: 11% (19 hand-classified corpus verdicts)
FP risk:     low (author estimate)
Languages:   yaml
Frameworks:  github-actions, azure-pipelines

WHAT WAS FOUND (real detector output, not a mockup)
  Job `security-scan` runs a verification gate under `continue-on-error: true`.

WHY IT MATTERS
  This job can fail every day and CI will still show green. The checkmark on
  this workflow cannot be trusted.

HOW TO FIX
  Remove continue-on-error, or scope it to individual non-blocking steps only.

  Example from this rule's own must-fire fixture: QA-CI-001/must-fire/masked.yml

WHAT WOULD CHANGE THE VERDICT
  - a run report next to the scan target (mjolnir.report.json or test-results/)
  corroborating this file lifts its findings to L3–L5
  - a documented suppression (mjolnir.config.json) lowers the finding count
  without claiming correctness
  - quarantine findings run only under --strict and are advisory (E0) — they can
  never gate CI

NEXT ACTION
  Fix the first occurrence, then re-run: `mjolnir --scope changed`. Every
  occurrence of this rule is listed in the scan output.

HOW TO VERIFY THE FIX
  Re-run `mjolnir` on the changed file(s) — this finding should no longer
  appear. `mjolnir --scope changed` scopes the check to just what you touched.

Docs: mjolnir rules --md   (full catalog, this rule included)
```

Voilà l'unité de valeur : un endroit où la CI rapporte une réussite qu'elle n'a pas méritée.

<br />

## Démarrage rapide

```bash
npx mjolnir-qa@3.0.0
```

Il analyse le répertoire courant et affiche le Trust Report : ce qu'il a trouvé, jusqu'où vous pouvez vous y fier, pourquoi, et quoi faire ensuite. Il sort avec `0` quand rien n'a été trouvé au niveau de la barrière ou au-dessus.

En CI, n'analysez que ce que la branche a introduit, pour qu'une suite historique ne noie pas votre première pull request :

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

`mjolnir ci install` l'écrit sous forme de workflow GitHub Actions, en utilisant l'[action](https://github.com/Sergey-Bar/Mjolnir#readme) épinglée sur le tag majeur `v3` (ou un simple `npx` avec `--no-action`). Il reste consultatif jusqu'à ce que vous décidiez qu'il doit bloquer.

| Commande                                      | Ce qu'elle fait                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `mjolnir`                                     | Trust Report : verdict, confiance, prochaine action                     |
| `mjolnir --scope changed`                     | Uniquement ce que votre branche a introduit (la forme CI)               |
| `mjolnir ci install`                          | Génère le workflow de PR consultatif (basé sur l'action)                |
| `mjolnir business-case`                       | ROI estimate: projected savings per finding                             |
| `mjolnir release-report`                      | Release readiness: GO, CONDITIONAL GO, or NO-GO                         |
| `mjolnir release-trust`                       | 12-dimension release assurance verdict                                  |
| `mjolnir report`                              | Generate a Playwright-compatible report                                 |
| `mjolnir trend`                               | Record, show, or diff local quality snapshots                           |
| `mjolnir policy`                              | Initialize, validate, or check policy gates                             |
| `mjolnir quarantine`                          | Review deterministic proposals (prototype)                              |
| `mjolnir analyze --cross-file`                | Bounded cross-file analysis                                             |
| `mjolnir ci-adapter github .`                 | Generate CI templates for supported providers                           |
| `mjolnir dashboard`                           | Generate a self-contained quality dashboard                             |
| `mjolnir exec-report`                         | Executive KPIs and recommendations (advisory)                           |
| `mjolnir enterprise`                          | Self-hosted templates (prototype)                                       |
| `mjolnir maturity`                            | Assess maturity or display maturity levels                              |
| `mjolnir mutation tests/mutation-report.json` | Analyze mutation reports; never promotes trust                          |
| `mjolnir mcp`                                 | Read-only MCP tools over stdio                                          |
| `mjolnir explain QA-CI-001`                   | Quoi, pourquoi et correctif, plus le taux de FP mesuré                  |
| `mjolnir why src/a.spec.ts:42`                | Pourquoi cette ligne précise a été signalée. Ne bloque jamais.          |
| `mjolnir forensics ./test-results/`           | Preuves d'exécution tirées d'une exécution réelle                       |
| `mjolnir trust-report`                        | Trust Artifact autonome (md + json)                                     |
| `mjolnir handoff`                             | Plan de remédiation pour un agent de code                               |
| `mjolnir --json` / `--format sarif`           | Sortie lisible par machine, GitHub Code Scanning                        |
| `mjolnir --format codequality`                | Rapport GitLab Code Quality (artefact du widget de MR)                  |
| `mjolnir --strict`                            | Exécute aussi les règles du niveau quarantine (risque de FP plus élevé) |

<details>
<summary><strong>Toutes les autres commandes</strong> — tri des tests instables, rapports, gouvernance</summary>

<br />

| Commande                            | Ce qu'elle fait                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `mjolnir --classic`                 | La bannière de score d'avant le Trust Report                                     |
| `mjolnir explain verdict`           | Pourquoi le verdict du scan enregistré est ce qu'il est                          |
| `mjolnir triage ./test-results/`    | Tri guidé. Chaque ligne se termine par une prochaine action.                     |
| `mjolnir pw-report ./test-results/` | Résumé d'exécution Playwright : relances, tests instables, les plus lents        |
| `mjolnir doctor:playwright`         | Scan approfondi dédié à Playwright plus Selector Health Score                    |
| `mjolnir fix --dry-run` / `fix`     | Correctifs automatiques sûrs, chacun re-scanné pour prouver qu'il s'est appliqué |
| `mjolnir baseline` / `diff`         | Photographie les constats, puis ne rapporte que les nouveaux ou les aggravés     |
| `mjolnir impact --since <ref>`      | Ce qu'un commit a introduit et résolu                                            |
| `mjolnir summary`                   | Annotations CI et résumé d'étape à partir d'un rapport                           |
| `mjolnir pr-comment`                | Un commentaire de PR ciblé, en Markdown                                          |
| `mjolnir debt`                      | Registre de la dette de tests avec un modèle de coût                             |
| `mjolnir handover`                  | Carte d'intégration de la suite pour un nouvel ingénieur QA                      |
| `mjolnir init`                      | Détecte les frameworks, affiche une checklist d'installation                     |
| `mjolnir suppressions`              | Liste les constats supprimés, pour la gouvernance                                |
| `mjolnir rules --unmeasured`        | Les règles qui reposent sur une hypothèse, pas sur une mesure                    |
| `mjolnir rules --md`                | Catalogue complet des règles (JSON ou Markdown)                                  |
| `mjolnir doctor`                    | Auto-audit de la base de règles de Mjölnir                                       |
| `mjolnir create-rule <ID>`          | Crée le squelette d'une nouvelle règle et de ses fixtures                        |
| `mjolnir stats`                     | Compteurs locaux cumulés des correctifs observés                                 |
| `mjolnir badge`                     | JSON d'endpoint shields.io et extrait                                            |
| `mjolnir --cache`                   | Re-scans incrémentaux via un cache local des verdicts                            |
| `mjolnir --format mermaid`          | Diagramme d'architecture de tests pour un commentaire de PR                      |

`mjolnir help <command>` affiche l'usage, des exemples et la prochaine étape pour chacune d'elles.

</details>

Nécessite **Node.js ≥ 22.18** sous Windows, macOS ou Linux. Vous préférez une installation globale ? `npm i -g mjolnir-qa`. Ce minimum vient de la chaîne de build (tsdown le cible et le pipeline de publication fait des tests de fumée dessus) ; les dépendances d'exécution n'en demandent pas davantage.

<br />

## Ce que Mjölnir trouve

<p align="center">
  <img src="assets/readme/stack.svg" alt="Fonctionne avec votre stack : les langages, frameworks de test et systèmes CI couverts par ses règles, d'après le registre des règles." width="100%" />
</p>

**79 règles** en quatre familles — hygiène des tests, qualité des tests, Playwright et intégrité de la CI — pour TypeScript et JavaScript, Python, Java, C# et le YAML de GitHub Actions. Elles couvrent Playwright dans ses quatre bindings, ainsi que pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest et Mocha, avec une couverture de départ pour Cypress et Selenium. Neuf d'entre elles, pour donner une idée :

| ID           | Règle                                                                  | Sévérité | Niveau     |
| ------------ | ---------------------------------------------------------------------- | -------- | ---------- |
| QA-CI-001    | `continue-on-error` masque une barrière de vérification en échec       | error    | quarantine |
| QA-CI-009    | Code de sortie des tests non propagé (`\|` sans pipefail, chaînes `;`) | error    | extended   |
| QA-TEST-001  | Test ciblé commité (`.only`, `fit`)                                    | error    | quarantine |
| QA-TEST-003  | Test sans assertion                                                    | error    | quarantine |
| QA-TQUAL-009 | Assertion de promesse sans await                                       | error    | quarantine |
| QA-PW-002    | Assertion de locator sans await                                        | error    | core       |
| QA-PW-004    | Sélecteurs CSS/XPath fragiles                                          | warning  | quarantine |
| QA-PY-002    | Test ignoré (`skip`, `xfail` non strict)                               | warning  | core       |
| QA-CS-103    | Méthode de test sans assertion                                         | error    | core       |

Le catalogue complet est généré depuis le registre, jamais maintenu à la main : `mjolnir rules --md`, [`docs/rules/`](docs/rules/), ou le [guide de ce qu'il vérifie](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Toutes les règles citées dans ce README</strong>, dans un seul tableau</summary>

<br />

> Les règles `quarantine` ne tournent que sous `--strict` et ne bloquent jamais (elles sont plafonnées à info). La sévérité indiquée est celle définie par l'auteur.

| ID           | Famille    | Règle                                                        | Sévérité | Niveau     |
| ------------ | ---------- | ------------------------------------------------------------ | -------- | ---------- |
| QA-TEST-001  | Hygiène    | Test ciblé commité (`.only`, `fit`)                          | error    | quarantine |
| QA-TEST-002  | Hygiène    | Test ignoré. Passe à `error` sans raison suivie.             | warning  | quarantine |
| QA-TEST-003  | Hygiène    | Test sans assertion                                          | error    | quarantine |
| QA-TEST-004  | Hygiène    | Sleep fixe (`waitForTimeout`, `sleep()`, `delay()`)          | warning  | extended   |
| QA-TEST-006  | Hygiène    | Abus de relances masquant l'instabilité                      | warning  | quarantine |
| QA-TEST-010  | Hygiène    | Corps de test vide                                           | error    | quarantine |
| QA-TQUAL-002 | Qualité    | Assertion tautologique                                       | error    | quarantine |
| QA-TQUAL-009 | Qualité    | Assertion de promesse sans await                             | error    | quarantine |
| QA-TQUAL-011 | Qualité    | Tests commentés                                              | warning  | extended   |
| QA-PW-002    | Playwright | Assertion de locator sans await                              | error    | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` commité                       | error    | core       |
| QA-PW-004    | Playwright | Sélecteurs CSS/XPath fragiles                                | warning  | quarantine |
| QA-PW-123    | Playwright | URL d'environnement codées en dur                            | warning  | quarantine |
| QA-PW-140    | Playwright | Capture d'écran sans `maxDiffPixelRatio`                     | warning  | core       |
| QA-CI-001    | CI         | `continue-on-error` masque une barrière en échec             | error    | quarantine |
| QA-CI-002    | CI         | `\|\| true` avale les codes de sortie                        | error    | extended   |
| QA-CI-005    | CI         | Rapport consommé mais jamais généré                          | error    | quarantine |
| QA-CI-007    | CI         | Wrappers de relance autour des tests                         | warning  | extended   |
| QA-CI-008    | CI         | Étape toujours réussie qui masque les échecs                 | error    | quarantine |
| QA-CI-009    | CI         | Code de sortie non propagé (`\|` sans pipefail, chaînes `;`) | error    | extended   |
| QA-CI-010    | CI         | Tests ignorés là où ils doivent bloquer                      | error    | quarantine |
| QA-PY-002    | Python     | Test ignoré (`skip`, `xfail` non strict)                     | warning  | core       |
| QA-PY-003    | Python     | Fonction de test sans assertion                              | error    | quarantine |
| QA-PY-005    | Python     | `time.sleep()` dans les tests                                | warning  | extended   |
| QA-PY-012    | Python     | Assertion tautologique                                       | error    | quarantine |
| QA-JV-101    | Java       | Test désactivé (`@Disabled`)                                 | warning  | core       |
| QA-JV-102    | Java       | Sleep fixe (`Thread.sleep()`)                                | warning  | extended   |
| QA-JV-103    | Java       | Méthode de test sans assertion                               | error    | extended   |
| QA-JV-105    | Java       | Sleep fixe via `waitForTimeout()` de Playwright              | warning  | core       |
| QA-JV-106    | Java       | Sélecteur fragile au lieu d'un locator par rôle              | warning  | quarantine |
| QA-CS-101    | C#         | Test ignoré (`[Ignore]`, `[Fact(Skip=)]`)                    | warning  | core       |
| QA-CS-102    | C#         | Sleep fixe (`Thread.Sleep` / `Task.Delay`)                   | warning  | core       |
| QA-CS-103    | C#         | Méthode de test sans assertion                               | error    | core       |
| QA-CS-105    | C#         | Sleep fixe via `WaitForTimeoutAsync()`                       | warning  | extended   |
| QA-CS-106    | C#         | Sélecteur fragile au lieu d'un locator par rôle              | warning  | quarantine |

Python fournit aussi QA-PY-001…012 (hygiène pytest) et QA-PY-101…108 (Playwright pour Python). Cypress et Selenium disposent de jeux de départ de trois règles chacun.

</details>

Chaque règle est livrée avec une fixture must-fire **et** une fixture must-not-fire, et une règle qui se déclenche sur sa propre fixture négative ne peut pas être livrée. C'est le pare-feu anti-faux-positifs ; `mjolnir doctor` l'applique dans la CI de ce dépôt.

### Selector Health Score

`mjolnir doctor:playwright` note chaque locator selon la façon dont il trouve un élément : comme le ferait un utilisateur (rôle, libellé, texte), par un contrat explicite (`data-testid`), ou par un accident structurel (chaînes CSS, XPath). Chaque fichier reçoit un score de 0 à 100 :

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Cela mesure la **robustesse, pas l'exactitude**. `.btn.btn-primary > div:nth-child(2)` passe aujourd'hui et continue de passer jusqu'à ce que quelqu'un touche au balisage. Un score bas n'affirme jamais que le test est cassé, seulement qu'il dépend d'un balisage que personne n'a promis de conserver.

<br />

## Le score de fiabilité

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="L'échelle de fiabilité de 0 à 100, avec un marqueur qui parcourt chaque score : UNWORTHY sous 50, NEEDS WORK de 50 à 79, WORTHY de 80 à 99, FORGED à 100" width="720" />
</p>

<sub>Chaque score de 0 à 100, placé par le vrai `deriveScoreState`. Généré par `npm run docs:gauge` et verrouillé contre toute dérive en CI.</sub>

| Score     | Verdict                                          |
| --------- | ------------------------------------------------ |
| `0 – 49`  | **UNWORTHY**                                     |
| `50 – 79` | **NEEDS WORK**                                   |
| `80 – 99` | **WORTHY**                                       |
| `100`     | **FORGED**                                       |
| `null`    | **UNKNOWN** : aucune déclaration de test trouvée |

**Comment il est calculé.** La sévérité fixe une déduction de base (`error −8`, `warning −3`, `info −1`) et le niveau de preuve la réduit : E2 compte en entier, E1 à moitié (arrondi à l'inférieur), E0 pas du tout. Le total est normalisé par l'exposition de la suite, c'est-à-dire en déductions par déclaration de test plutôt que par fichier. Le terminal affiche les mêmes nombres réduits que ceux utilisés par le score ; il n'y a pas de second modèle caché. Détails : [docs/SCORING.md](docs/SCORING.md) et le [guide du score](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Ce que 100 ne veut pas dire.** Cela ne veut pas dire que le logiciel est correct, que la suite est suffisante ou que le produit est exempt de défauts. Cela veut dire une seule chose : **aucune des règles évaluées par Mjölnir n'a produit de déduction avec ce scan et ce modèle de preuves.**

<br />

## Le modèle de preuves

Chaque constat porte deux étiquettes : à quel point Mjölnir est sûr, et jusqu'où le constat a été vérifié. C'est la différence entre un outil qui signale des motifs et un outil sur lequel on peut conditionner une release.

**À quel point c'est sûr — le niveau de preuve.**

| Niveau | Nom                 | Signifie                                                       | Déduction |
| ------ | ------------------- | -------------------------------------------------------------- | --------- |
| **E2** | Preuve déterministe | Le défaut est présent dans le code tel qu'il est écrit         | Totale    |
| **E1** | Preuve par motif    | Un motif fortement lié au défaut a correspondu                 | Moitié    |
| **E0** | Observation         | Bon à savoir. Pas une affirmation que quelque chose ne va pas. | Nulle     |

La confiance dans une détection n'est pas la force de la preuve. Une règle peut être certaine d'avoir trouvé ce qu'elle cherchait tout en regardant une heuristique. Les constats E1 sont là pour être lus et jugés, jamais appliqués aveuglément, et cette limite est inscrite sur le constat dans le terminal, le JSON et le passage de relais à l'agent.

**Jusqu'où c'est vérifié — le niveau de confiance.** La plupart des constats viennent de la lecture de votre code. Donnez à Mjölnir le rapport d'une vraie exécution de tests et il pourra confirmer que le code a bien tourné.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="L'échelle de confiance de L0 à L5. L0 à L2 viennent de la lecture du code ; L3 à L5 exigent le rapport d'une exécution réelle, marqué par une rupture dans l'échelle." width="100%" />
</p>

| Niveau | En clair              | Ce qu'il faut                                                         |
| ------ | --------------------- | --------------------------------------------------------------------- |
| **L0** | Noté                  | Lire le code                                                          |
| **L1** | Ressemble au problème | Lire le code : un motif a correspondu                                 |
| **L2** | Prouvé dans le code   | Lire le code : le défaut est structurel                               |
| **L3** | Le fichier a tourné   | Un rapport d'exécution montre que le fichier du constat a été exécuté |
| **L4** | Le test a tourné      | Un rapport d'exécution montre que le test du constat a été exécuté    |
| **L5** | L'exécution concorde  | Le résultat même de l'exécution confirme la classe de défaut          |

Un scan statique s'arrête à L2. Seul le rapport d'une exécution réelle (Playwright JSON, Jest ou Vitest JSON, JUnit XML) peut élever un constat à L3 ou plus, si bien qu'un constat qu'on n'a jamais vu tourner ne peut jamais prétendre l'avoir fait. Définitions : [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Quelle part est mesurée

**74 règles sur 79 ont un taux de faux positifs mesuré sur du vrai code OSS** (au moins 10 constats classés à la main chacune ; voir [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Les 5 autres reposent sur l'estimation de l'auteur et le disent, règle par règle, dans `mjolnir explain`. `mjolnir rules --unmeasured` les liste, et le pied de chaque scan indique combien des règles qui se sont réellement _déclenchées_ sont mesurées.

Les taux restent publics quand ils sont mauvais. QA-TEST-001 (un `.only` commité) obtient un mauvais audit sur des dépôts réels et se trouve en quarantine pour cette raison. Le chiffre actuel de chaque règle, QA-PW-141 comprise, figure dans l'audit.

### Niveaux de confiance des règles

Les niveaux suivent le taux de faux positifs mesuré, pas une opinion :

| Niveau         | FP mesuré                      | Comportement                                             |
| -------------- | ------------------------------ | -------------------------------------------------------- |
| **core**       | ≤ 10%                          | Rapport par défaut, bloque                               |
| **extended**   | ≤ 30%                          | Rapport par défaut, confiance moindre                    |
| **quarantine** | > 30% ou explicitement déclaré | Uniquement `--strict`, plafonné à info, ne bloque jamais |
| _non mesurée_  | n < 10                         | Ne peut être promue en core avant d'être mesurée         |

Les bandes de FP ne peuvent que rétrograder un niveau — elles ne promeuvent jamais une règle hors de `quarantine` si elle y a été explicitement déclarée. Une règle explicitement mise en quarantine y reste quelle que soit son taux de FP mesuré.

Promotion, rétrogradation et maturité par langage : [cycle de vie des règles](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Pourquoi ce n'est pas un linter

Les linters vous disent si le code suit des règles. Mjölnir vous dit si votre vérification mérite confiance.

|                                                                  | Linters (ESLint, SonarQube) | Outils de couverture | Revue de code par IA |   **Mjölnir**    |
| ---------------------------------------------------------------- | :-------------------------: | :------------------: | :------------------: | :--------------: |
| Note le **système de vérification**, pas le code produit         |             Non             |         Non          |         Non          |       Oui        |
| Intégrité des workflows CI (`continue-on-error`, `\|\| true`)    |             Non             |         Non          |  seulement le diff   |       Oui        |
| Note la robustesse des locators Playwright (Selector Health)     |             Non             |         Non          |         Non          |       Oui        |
| Lit de vraies données d'exécution pour les verdicts `TRUE-FLAKE` |             Non             |         Non          |         Non          |       Oui        |
| Publie un taux de faux positifs mesuré par règle                 |             Non             |         Non          |         Non          |       Oui        |
| Signale les tests sans assertion                                 |            Oui\*            |         Non          |       parfois        |       Oui        |
| Détecte les sleeps fixes (`waitForTimeout`, `time.sleep`)        |            Oui\*            |         Non          |       parfois        |       Oui        |
| Déterministe (même entrée, même sortie)                          |             Oui             |         Oui          |         Non          |       Oui        |
| Coût par scan                                                    |           gratuit           |       gratuit        |        tokens        | **zéro** (local) |

<sub>\*Couvert par `eslint-plugin-jest` et `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) ainsi que par les propres règles d'assertion de SonarQube. Les colonnes décrivent le comportement par défaut pour la vérification de suites de tests ; les plugins, les offres payantes et les règles personnalisées changent certaines réponses. C'est un résumé de positionnement, pas un benchmark.</sub>

Utilisez aussi la revue par IA. Elle saisit les nuances, l'intention et les défauts de conception qu'aucun motif ne peut trouver. Mjölnir détecte ce que la revue par IA laisse passer parce que cela semble intentionnel : un `.only` commité, un code de sortie avalé, un `continue-on-error` sur un job de tests. Cela demande un scan, pas un raisonnement.

<br />

## Forensique d'exécution

L'analyse statique raisonne sur du code qui n'a jamais tourné. La forensique lit ce qui s'est réellement passé : Playwright JSON, Jest JSON, Vitest JSON et JUnit XML de n'importe quel runner.

```bash
mjolnir forensics ./test-results/
```

```text
  ▍ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE completes checkout with saved card (e2e/checkout.spec.ts)
           ████████████████████ 6.0s · 2 attempts
FAILING    declines an expired card (e2e/checkout.spec.ts)
           ████░░░░░░░░░░░░░░░░ 1.1s · 1 attempt
```

`TRUE-FLAKE` ne signifie pas que le test a été relancé. Cela signifie que le test **a échoué au moins une tentative puis a terminé au vert** : une réussite chanceuse, signalée quoi que dise la coche finale. `mjolnir triage` transforme cet historique en proposition de quarantaine, et `mjolnir pw-report` résume une exécution. Ce sont ces mêmes rapports d'exécution qui élèvent les constats aux niveaux de confiance L3 et au-delà.

<br />

## Intégrité de la CI

Un test peut réussir alors que le pipeline qui l'entoure ne peut pas échouer. Mjölnir lit aussi les workflows : `continue-on-error`, `|| true`, les codes de sortie jamais propagés, les étapes toujours réussies, les rapports consommés mais jamais générés, et les barrières ignorées sur les événements qui devraient bloquer. Chaque constat nomme le job, l'étape et la ligne, et porte son propre niveau de preuve.

Générez le workflow de PR, consultatif par défaut :

```bash
mjolnir ci install
```

Ou ajoutez l'action du Marketplace à un workflow existant :

```yaml
- uses: Sergey-Bar/Mjolnir@v3
  with:
    scope: changed
    fail-on: error
```

Épinglez `@v3` pour suivre la ligne majeure, ou un tag exact (`@v0.5.32`) pour une barrière reproductible. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) couvre le Marketplace, Smithery et les registres MCP.

Pour envoyer les constats dans GitHub Code Scanning, téléversez le SARIF (nécessite `security-events: write` au niveau du workflow ou du job) :

```yaml
- run: npx mjolnir-qa@3.0.0 --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

Sur GitLab, `--format codequality` écrit le rapport Code Quality que lisent le widget de MR et les annotations du diff ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Configuration de l'éditeur et du pipeline : [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Attribution sur le périmètre modifié

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

Les constats sont attribués aux lignes ajoutées par votre branche, mesurées par rapport à la **merge-base**. Le périmètre est le même ensemble de fichiers qu'un scan complet découvre (specs TS/JS et configurations d'adaptateurs, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), plus les modifications non commitées et non suivies, si bien que cela fonctionne avant le commit. La base est résolue selon `main → master → origin/main → origin/master → origin/HEAD` ; remplacez-la avec `--base <ref>`.

Quand la merge-base ne peut pas être résolue (un clone superficiel, un HEAD détaché, une cible hors de git), les constats se replient sur une attribution au fichier entier **et le rapport le dit.** Un repli silencieux serait exactement le type de défaut que cet outil existe pour détecter.

<br />

## Agents IA

Les constats ne valent quelque chose que si quelque chose agit dessus.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**L'IA écrit le correctif. Mjölnir le vérifie.** La preuve vient du nouveau scan, jamais du propre compte rendu de réussite de l'agent.

| Commande          | Ce que reçoit l'agent                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | Un serveur [MCP](https://modelcontextprotocol.io) sur stdio. `scan`, `explain` et `diff` deviennent des outils appelables.                                                            |
| `mjolnir handoff` | Un rapport `--json` enregistré devient un plan Markdown déterministe : ce qui a été détecté, la limite de preuve de chaque constat, ce qui ne doit **pas** changer, comment vérifier. |
| `mjolnir install` | Écrit dans les surfaces d'agent que votre dépôt possède déjà (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) pour que l'agent relance le scan avant d'affirmer qu'il a terminé.       |

Ajoutez-le à un client qui fournit sa propre CLI :

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@3.0.0 mcp
```

Ou à tout client qui accepte un bloc `mcpServers` :

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@3.0.0", "mcp"] }
  }
}
```

**Le garde-fou compte plus que la commodité.** Chaque constat d'un passage de relais porte sa limite. **E2** dit _déterministe : vérifiez l'emplacement et appliquez le correctif_. **E1** dit _CONFIRMATION REQUISE : l'observation seule ne prouve pas le défaut_. Un agent qui corrige un E1 aveuglément, supprime une règle ou modifie une règle pour faire monter le score fait exactement ce que cet outil existe pour détecter ; le passage de relais le dit donc dans le prompt, à côté du constat.

<br />

## Confiance et sécurité

**Local d'abord, zéro télémétrie.** Aucune API capable d'accéder au réseau (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) n'existe nulle part dans `src/`, et [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) fait échouer le build si l'une d'elles apparaît. Il interdit aussi `eval` et `new Function`. Analyser du code non fiable ne l'exécute jamais : l'analyse statique lit du texte source, et la forensique analyse des fichiers de rapport déjà présents sur le disque.

Deux réserves : `npx` lui-même télécharge le paquet avant que quoi que ce soit ne tourne, et la garantie couvre `src/`, pas les plugins tiers.

**Les plugins ne sont pas isolés dans un bac à sable.** Les plugins JS (`mjolnir-rules/*.mjs`, ou les paquets npm listés sous `"plugins"`) tournent avec tous les privilèges de Node, le même modèle de confiance que les plugins ESLint ou Vitest. Les charger est un choix explicite **par scan** : sans `--enable-plugins` (ou `MJOLNIR_ENABLE_PLUGINS=1`), leurs sources ne sont jamais chargées, et un avis sur stderr liste ce qui a été ignoré. Les manifestes de règles JSON n'exécutent aucun code, et les préfixes d'ID des règles core sont réservés pour qu'un plugin ne puisse pas se faire passer pour l'une d'elles. Signalez les vulnérabilités via [SECURITY.md](SECURITY.md).

**Il s'analyse lui-même.** Un moteur de confiance de vérification n'a aucune légitimité s'il n'est pas lui-même vérifiable. Chaque exécution de la CI analyse ce dépôt avec le build produit par cette même exécution. La barrière échoue sur tout constat de sévérité error, ainsi que sur un scan **partiel** ou une **règle qui plante**, parce qu'un auto-scan tronqué qui ne rapporte rien est exactement le faux vert que ce projet existe pour détecter. `mjolnir doctor` ré-audite la base de règles dans la même exécution (pare-feu des fixtures, honnêteté des niveaux, plafond du niveau core), et une vérification INCONCLUSIVE échoue exactement comme une vérification en échec. Les deux rapports sont téléversés comme artefacts de build.

### Codes de sortie et contrat machine

Figés, pour que vous puissiez bâtir de la logique CI dessus :

| Code de sortie | Signification                                                                  |
| -------------- | ------------------------------------------------------------------------------ |
| `0`            | Propre : aucun constat au niveau de la barrière ou au-dessus                   |
| `1`            | Constats au niveau de la barrière ou au-dessus                                 |
| `2`            | Scan partiel (budget de temps atteint, fichiers illisibles). Ne bloque jamais. |
| `10`           | Erreur d'utilisation (option invalide, cible manquante)                        |
| `20`           | Erreur interne                                                                 |

`2` est volontairement distinct de `0` : un scan qui n'a pas terminé n'a pas « rien trouvé ». Il n'a pas fini de chercher.

Tout ce qu'une machine consomme (résultats des outils MCP, `--json`, SARIF 2.1) provient d'un unique résultat canonique sous un schéma versionné et **uniquement additif** (`schemaVersion: 1`, `contractVersion: 1`), si bien qu'aucun consommateur n'a à reconstruire le sens à partir du texte affiché. Voir [le contrat machine](docs/machine-contract.md). Les ID de règle (`QA-<FAMILY>-NNN`) sont immuables une fois publiés et ne sont jamais réutilisés.

<br />

## Ce que Mjölnir ne peut pas vous dire

- **Il n'exécute pas vos tests.** Un scan propre n'est pas une suite qui passe.
- **Il ne peut pas vous dire qu'une assertion est _fausse_.** `expect(total).toBe(41)` a l'air saine. Mjölnir trouve les tests qui _ne peuvent pas échouer_ et les pipelines qui _ne peuvent pas passer au rouge_, pas les tests qui vérifient la mauvaise chose.
- **Il ne prouve pas l'exactitude métier.** Rien ici ne dit que votre produit fait ce que l'exigence demandait.
- **Un 100 n'est pas la preuve d'une bonne suite.** Savoir si votre suite couvre votre risque réel est une autre question, et cet outil n'y répond pas.
- **5 règles sur 79 reposent sur une estimation**, pas sur un taux mesuré. Chacune le dit sur son propre constat.
- **E1 n'est pas E2.** Les constats heuristiques méritent d'être lus, pas d'être appliqués aveuglément.
- **Un dépôt vide obtient `null`, jamais 100.**
- **Un fichier nommé `*.spec.ts` sans déclaration de test ne compte pas comme couverture.** Un dépôt dont les seuls fichiers spec contiennent des imports ou des types (zéro appel `it`/`test`) obtient `null`, pas 100.

<br />

## Documentation

Le site de documentation complet se trouve sur <https://sergey-bar.github.io/Mjolnir/>.

| Document                                               | Contenu                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalisation du score et pondération des preuves           |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Vocabulaire canonique : un mot par concept                  |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Taux de faux positifs mesurés et méthode                    |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | États des règles, niveaux, suppression, dépréciation        |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Politique semver, surfaces figées, cycle de dépréciation    |
| [docs/machine-contract.md](docs/machine-contract.md)   | Le résultat canonique lisible par machine                   |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Sortie SARIF et configuration de l'éditeur ou de la CI      |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab : rapport Code Quality, recette de MR, barrière      |
| [docs/rules/](docs/rules/)                             | Catalogue généré par règle                                  |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Environnement de développement et processus de contribution |
| [SUPPORT.md](SUPPORT.md)                               | Où poser des questions, signaler et obtenir de l'aide       |
| [SECURITY.md](SECURITY.md)                             | Signalement des vulnérabilités                              |
| [CHANGELOG.md](CHANGELOG.md)                           | Historique des versions                                     |

### Statut

**Version 3.0.0.** Le schéma JSON et les codes de sortie sont des contrats figés. TypeScript et Python ont la couverture mesurée la plus large. Java et C# sont plus récents ; lisez-les à travers le [tableau de maturité](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). La suite, sans dates inventées : [la feuille de route publique](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Contribuer

Les nouvelles règles sont la première contribution la plus facile. Une commande crée le squelette de la règle avec ses fixtures must-fire **et** must-not-fire. La règle générée échoue volontairement sur ses propres fixtures tant qu'une vraie détection n'est pas écrite, parce qu'un stub livré est une règle que personne n'a mesurée :

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

L'environnement de développement, les commandes des barrières permanentes et les lois anti-creep et du pare-feu des fixtures se trouvent dans [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Lancez-le sur votre dépôt." width="100%" />

```bash
npx mjolnir-qa@3.0.0
```

[Lire le guide](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Site de documentation](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Ne demandez pas si les tests ont réussi.<br />
Demandez si les preuves montrent qu'ils méritent la confiance.

<sub>Créé par [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · Licence MIT</sub>

</div>
