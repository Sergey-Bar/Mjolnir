<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Vos tests vous mentent. Nous le prouvons.

**Verification Trust Engine pour la QA.** Mjölnir audite les suites de
tests et les pipelines CI, rapporte un score de fiabilité et montre
exactement où la confiance se brise.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | Français | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Vos tests sont-ils dignes de confiance ?**

[Le voir en action](#-le-voir-en-action) ·
[Démarrage rapide](#-démarrage-rapide) ·
[Ce qu'il vérifie](#-ce-que-mjölnir-vérifie) ·
[Scoring](#comment-le-score-fonctionne) ·
[CI](#-intégration-ci) · [Configuration](#configuration) ·
[Documentation](#-documentation)

</div>

---

## 🎬 Le voir en action

<p align="center">
  <img src="assets/readme/demo.svg" alt="Le rapport --verbose complet de Mjölnir sur un dépôt de démo : WORTHINESS 75/100 NEEDS WORK, une répartition des diagnostics par catégorie, une liste FIX THIS FIRST, et chaque constat avec son ID de règle et son numéro de ligne à travers CI, Playwright, l'hygiène des tests et les règles Python" width="900" />
</p>

<sub>La sortie complète de `npx mjolnir-qa ./examples/demo-repo --verbose`,
rendue par le vrai reporter — rien de rogné. Régénérée par
`npm run docs:demo` ;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
fait échouer la CI si elle dérive de ce que l'outil imprime.</sub>

**Ce qui vient de se passer :**

1. Mjölnir a découvert les specs Playwright, sa configuration, le
   workflow CI et un fichier de test Python — quatre langages/formats,
   une seule passe.
2. Il a trouvé des preuves qui affaiblissent la confiance dans la suite
   — un `continue-on-error` qui masque un job, un `|| true` qui avale un
   code de sortie, des sleeps en dur, un sélecteur fragile, des URLs de
   staging codées en dur, une attente `networkidle`.
3. Il en a fait un constat concret avec un ID de règle, un emplacement
   et un correctif — et un score unique sur lequel gate une PR.

### Un constat de près

Exécutez `mjolnir explain QA-CI-001` sur le premier constat ci-dessus
et vous obtenez :

```text
▚▞ QA-CI-001 — continue-on-error masks a failing verification gate

Severity:    error
Confidence:  high
Evidence:    E2
Measured FP: not yet measured — this rule ships on assumption (see docs/FP-AUDIT.md)

WHAT WAS FOUND (real detector output, not a mockup)
  Job `security-scan` runs a verification gate under `continue-on-error: true`.

WHY IT MATTERS
  This job can fail every day and CI will still show green. The checkmark
  on this workflow cannot be trusted.

HOW TO FIX
  Remove continue-on-error, or scope it to individual non-blocking steps only.
```

C'est l'unité de valeur : pas une broutille de style, mais un endroit
où votre CI affiche quelque chose comme réussi alors que ça ne l'est
pas.

---

## ⚡ Démarrage rapide

Exécutez-le sur un dépôt pour un rapport complet et un score de
fiabilité :

```bash
npx mjolnir-qa@latest
```

**En CI, le produit tient en une commande.** Il ne scanne que ce que la
branche a touché et sort avec un code non nul sur de nouveaux
problèmes :

```bash
npx mjolnir-qa@latest --scope changed
```

Déposez ça dans un check de PR — `mjolnir ci install` écrit le workflow —
et c'est fini. Tout le reste est optionnel.

| Commande                            | Ce qu'elle fait                                                        |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `mjolnir`                           | Scan complet du dépôt + score de fiabilité                             |
| `mjolnir --scope changed`           | Uniquement ce que votre branche a introduit — la forme CI              |
| `mjolnir ci install`                | Génère le workflow de PR consultatif                                   |
| `mjolnir explain QA-CI-001`         | Quoi / pourquoi / correctif + taux de FP mesuré d'une règle            |
| `mjolnir rules --unmeasured`        | Les règles qui tournent sur hypothèse, pas sur mesure                  |
| `mjolnir --json` / `--format sarif` | Lisible par machine / GitHub Code Scanning                             |
| `mjolnir --strict`                  | Exécute aussi les règles du tier quarantaine (risque de FP plus élevé) |

<details>
<summary><strong>Quand quelque chose est instable</strong></summary>

| Commande                            | Ce qu'elle fait                                                |
| ----------------------------------- | -------------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Vraies données d'exécution → verdicts `TRUE-FLAKE`, `FLAKY.md` |
| `mjolnir triage ./test-results/`    | Proposition de quarantaine issue de l'historique d'exécution   |
| `mjolnir pw-report ./test-results/` | Synthèse de run Playwright — retries / flakes / plus lents     |
| `mjolnir doctor:playwright`         | Scan profond Playwright uniquement + Selector Health Score     |

</details>

<details>
<summary><strong>Occasionnel / rapports</strong></summary>

| Commande                        | Ce qu'elle fait                                                   |
| ------------------------------- | ----------------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Auto-corrections sûres avec preuve                                |
| `mjolnir baseline` / `diff`     | Instantané des constats, puis rapport des seuls nouveaux/aggravés |
| `mjolnir impact --since <ref>`  | Ce qui a changé depuis un commit antérieur                        |
| `mjolnir debt`                  | Registre de dette de test avec un modèle de coût                  |
| `mjolnir handover`              | Carte d'onboarding de la suite pour un nouveau QA                 |
| `mjolnir stats`                 | Compteurs locaux de tous les correctifs vus                       |
| `mjolnir badge`                 | JSON d'endpoint shields.io + snippet                              |
| `mjolnir rules --md`            | Catalogue complet des règles (JSON ou Markdown)                   |
| `mjolnir doctor`                | Auto-audit de la propre base de règles de Mjölnir                 |
| `mjolnir create-rule <ID>`      | Scafholde une nouvelle règle + ses fixtures                       |
| `mjolnir --format mermaid`      | Diagramme d'architecture de test pour un commentaire de PR        |

</details>

Installez-le globalement plutôt qu'en `npx` si vous préférez :
`npm i -g mjolnir-qa`. Requiert Node.js ≥ 22.18. Fonctionne sous
Windows, macOS et Linux.

---

## 👥 À qui ça s'adresse ?

- **QA / SDET** propriétaires d'une suite e2e ou d'intégration qui ont
  besoin de la preuve que la suite mérite vraiment la coche verte
  qu'elle produit.
- **Équipes Plateforme / DevEx** responsables de l'intégrité CI et des
  release gates — celles et ceux pour qui un `continue-on-error` ne
  doit jamais repeindre en vert une pipeline rouge en silence.
- **Mainteneurs OSS** qui veulent un gate de vérification bon marché,
  toujours actif, qui tourne en local et en CI sans aucun appel réseau.

---

## 🔨 Ce que Mjölnir vérifie

|     |                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Score de fiabilité** — un chiffre, une table de déductions transparente, aucune boîte noire                                                   |
| 🎭  | **Selector Health Score** — note vos locators Playwright, pas seulement votre taux de réussite                                                  |
| 🔬  | **Forensique d'exécution** — lit de vraies données de run Playwright/JUnit pour détecter `TRUE-FLAKE`, pas seulement des suppositions statiques |
| 🚨  | **Règles d'intégrité CI** — attrape `continue-on-error`, `\|\| true` et autres astuces à faux vert                                              |
| 🐍  | **Les quatre bindings Playwright** — TypeScript, Python, Java, C#/.NET — plus pytest, JUnit/TestNG et workflows CI                              |
| 🔒  | **Local-first** — zéro appel réseau pendant le scan, zéro télémétrie, s'exécute en secondes                                                     |

### Les règles

Chaque règle est livrée avec des fixtures must-fire **et** must-not-fire.
Une règle qui se déclenche sur sa propre fixture négative ne peut pas
sortir — c'est le pare-feu anti faux positifs.

<details>
<summary><strong>Hygiène des tests</strong></summary>

| ID          | Règle                                                 | Severity |
| ----------- | ----------------------------------------------------- | -------- |
| QA-TEST-001 | Test focalisé commité (`.only`, `fit`)                | error    |
| QA-TEST-002 | Test sauté sans justification                         | error    |
| QA-TEST-002 | Test sauté avec justification tracée                  | warning  |
| QA-TEST-003 | Test sans assertion                                   | error    |
| QA-TEST-004 | Sleep en dur (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Abus de retry masquant l'instabilité                  | warning  |
| QA-TEST-010 | Corps de test vide                                    | error    |

</details>

<details>
<summary><strong>Qualité des tests</strong></summary>

| ID           | Règle                             | Severity |
| ------------ | --------------------------------- | -------- |
| QA-TQUAL-001 | Vérification par mocks uniquement | info     |
| QA-TQUAL-002 | Assertion tautologique            | error    |
| QA-TQUAL-009 | Assertion de promise non awaitée  | error    |
| QA-TQUAL-011 | Tests commentés                   | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Règle                                            | Severity |
| --------- | ------------------------------------------------ | -------- |
| QA-PW-002 | Assertion de locator non awaitée                 | error    |
| QA-PW-003 | `page.pause()` / `test.only()` commités          | error    |
| QA-PW-004 | Sélecteurs CSS/XPath fragiles                    | warning  |
| QA-PW-005 | Logique métier dans `page.evaluate()`            | info     |
| QA-PW-114 | Element handles historiques (`page.$`)           | info     |
| QA-PW-118 | Attentes `networkidle` (instables de conception) | info     |
| QA-PW-123 | URLs d'environnement codées en dur               | warning  |

</details>

<details>
<summary><strong>Intégrité CI</strong></summary>

| ID        | Règle                                                                | Severity |
| --------- | -------------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` masque les échecs                                | error    |
| QA-CI-002 | `\|\| true` avale les codes de sortie                                | error    |
| QA-CI-005 | Rapport consommé mais jamais généré                                  | error    |
| QA-CI-007 | Wrappers de retry autour des tests                                   | warning  |
| QA-CI-008 | Step toujours réussi masquant les échecs                             | error    |
| QA-CI-009 | Code de sortie du test non propagé (`\|` sans pipefail, chaînes `;`) | error    |
| QA-CI-010 | Tests sautés là où ils doivent bloquer (gardes skip-on-PR)           | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Règle                                     | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-PY-002 | Test sauté (`skip`, `xfail` non strict)   | warning  |
| QA-PY-003 | Fonction de test sans assertion           | error    |
| QA-PY-005 | `time.sleep()` dans les tests             | warning  |
| QA-PY-006 | Corps de test vide (`pass`)               | info     |
| QA-PY-010 | Dépendance au hasard/au temps sans freeze | info     |
| QA-PY-012 | Assertion tautologique                    | error    |

20 règles Python au total (QA-PY-001…012 hygiène pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Règle                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-JV-101 | Test désactivé (`@Disabled`)                  | warning  |
| QA-JV-102 | Sleep en dur (`Thread.sleep()`)               | warning  |
| QA-JV-103 | Méthode de test sans assertion                | error    |
| QA-JV-105 | Sleep en dur Playwright `waitForTimeout()`    | warning  |
| QA-JV-106 | Sélecteur fragile au lieu d'un role locator   | warning  |
| QA-JV-108 | URL d'environnement codée en dur dans le test | info     |
| QA-JV-111 | Mock blanket `page.route("**")`               | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Règle                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-CS-101 | Test sauté (`[Ignore]`, `[Fact(Skip=)]`)      | warning  |
| QA-CS-102 | Sleep en dur (`Thread.Sleep` / `Task.Delay`)  | warning  |
| QA-CS-103 | Méthode de test sans assertion                | error    |
| QA-CS-105 | Sleep en dur `WaitForTimeoutAsync()`          | warning  |
| QA-CS-106 | Sélecteur fragile au lieu d'un role locator   | warning  |
| QA-CS-108 | URL d'environnement codée en dur dans le test | info     |
| QA-CS-111 | Mock blanket `page.RouteAsync("**")`          | info     |

</details>

> Le catalogue live complet — chaque règle avec son tier, sa
> confidence, son risque de faux positif et sa disponibilité d'autofix —
> est généré depuis le registre :
>
> ```bash
> mjolnir rules --md
> ```
>
> Les pages par règle vivent sous [`docs/rules/`](docs/rules/).

### Quelle part est mesurée

**74 des 99 règles portent un taux de faux positifs mesuré sur du vrai
code OSS** (≥ 10 constats classés à la main chacun ; voir
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Les 19 autres sortent sur
l'estimation de l'auteur. Chaque pied de scan vous dit combien des
règles _déclenchées_ sont mesurées ; `mjolnir rules --unmeasured` liste
celles qui ne le sont pas ; la page `mjolnir explain` de chaque règle
énonce son statut. Nous publions le taux même quand il est laid —
QA-CS-103 s'audite à 95 % et est mis en quarantaine pour ça. Faire
grandir ce 78 est le travail continu du projet.

### Tiers de règles et maturité par langage

Chaque règle est `core`, `extended` ou `quarantine`, attribué d'après
son taux de faux positifs **mesuré** :

| Tier         | Signification                                    | Scan par défaut | `--strict` |
| ------------ | ------------------------------------------------ | :-------------: | :--------: |
| `core`       | ≤ 10 % de FP mesuré                              |       ✅        |     ✅     |
| `extended`   | ≤ 30 % de FP mesuré                              |       ✅        |     ✅     |
| `quarantine` | au-dessus de 30 %, ou pas encore mesuré (n < 10) |       ❌        |     ✅     |

| Langage         | Adaptateur      | Couverture aujourd'hui                                     |
| --------------- | --------------- | ---------------------------------------------------------- |
| TypeScript / JS | AST compilateur | la plus large, la plus mesurée — surtout `core`/`extended` |
| Python / pytest | Couche regex    | large, auditée sur corpus — surtout `core`/`extended`      |
| Java            | Couche regex    | plus récent — surtout `extended`/`quarantine`              |
| C# / .NET       | Couche regex    | plus récent — surtout `extended`/`quarantine`              |

TypeScript et Python ont la couverture mesurée la plus large. Java et
C# sont livrés, documentés, et restent hors du chiffre vedette tant
qu'une vraie suite consommatrice (pas les propres tests d'une
bibliothèque de binding) n'a pas été auditée.

---

## Comment le score fonctionne

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Sortie terminal de Mjölnir — WORTHINESS 75/100 NEEDS WORK, une répartition des diagnostics par catégorie et une liste FIX THIS FIRST" width="820" />
</p>

<sub>Régénérée par `npm run docs:hero` ;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
fait échouer la CI si elle dérive de ce que le reporter imprime
réellement.</sub>

Le score est transparent : **error −8, warning −3, info −1**, puis
normalisé par l'exposition de la suite (déductions par déclaration de
test). Les déductions pondérées par la preuve signifient que les
signaux faibles coûtent moins cher. Le terminal affiche les mêmes
chiffres actualisés que ceux du score — pas de boîte noire. Méthode
complète : [docs/SCORING.md](docs/SCORING.md).

**Verdicts**

| Score   | Verdict          |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Niveaux de preuve** — chaque constat en porte un ; il fixe le poids
du constat dans le score :

| Niveau | Signification       | Impact sur le score   | Exemple                                                   |
| ------ | ------------------- | --------------------- | --------------------------------------------------------- |
| E2     | Défaut déterministe | Déduction pleine      | `.only` commité — structurellement prouvable              |
| E1     | Motif heuristique   | Déduction moitié      | `sleep()` détecté par regex — signal fort, pas une preuve |
| E0     | Observation         | Zéro (info seulement) | Rapporté mais ne gate jamais la CI ni ne déduit           |

La plupart des règles sont **E1**. Le slogan « we prove it » renvoie à
ce système : les constats E2 sont une preuve structurelle ; les
constats E1 sont des avertissements correctement positionnés, pas des
preuves formelles.

Un dépôt vide obtient `null`, jamais un faux 100 — voir
[Modèle de confiance](#modèle-de-confiance).

---

## 🎭 Selector Health Score

La métrique vedette pour les suites Playwright — la résilience de vos
locators :

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Les locators basés sur les rôles obtiennent la note maximale. Les
chaînes de classes CSS et le XPath effondrent le score — ils cassent à
chaque refonte du DOM sans vous dire quel comportement a régressé.

---

## 🔬 Preuves d'exécution

La détection statique d'instabilité, c'est deviner. Mjölnir lit de
**vraies données d'exécution** — rapports JSON Playwright et XML JUnit
de n'importe quel runner :

```bash
mjolnir forensics ./test-results/
```

```text
▚▞ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE completes checkout with saved card (e2e/checkout.spec.ts)
           ████████████████████ 6.0s · 2 attempts
FAILING    declines an expired card (e2e/checkout.spec.ts)
           ████░░░░░░░░░░░░░░░░ 1.1s · 1 attempt
```

Un test qui ne passe qu'à partir de la tentative ≥ 2 n'est pas un test
qui passe — c'est un test chanceux. Il est marqué `TRUE-FLAKE` quel que
soit le vert final de la coche.

---

## ⚡ Mjölnir n'est pas un linter de plus

Les linters vous disent si le code suit des règles. Mjölnir vous dit si
votre vérification peut être crue.

|                                                               | ESLint / SonarQube | Outils de coverage | Revue manuelle | **Mjölnir** |
| ------------------------------------------------------------- | :----------------: | :----------------: | :------------: | :---------: |
| Intégrité des workflows CI (`continue-on-error`, `\|\| true`) |         ❌         |         ❌         |    rarement    |     ✅      |
| Multi-langage (TS, Python, Java, C#) depuis un seul outil     |         ❌         |         ❌         |       ❌       |     ✅      |
| Note la résilience des locators Playwright (Selector Health)  |         ❌         |         ❌         |    rarement    |     ✅      |
| Signale les tests sans vraies assertions                      |   ✅ (plugin)\*    |         ❌         |    parfois     |     ✅      |
| Détecte les sleeps en dur (`waitForTimeout`, `time.sleep`)    |   ✅ (plugin)\*    |         ❌         |    parfois     |     ✅      |
| Tourne en secondes, zéro appel réseau pendant le scan         |         ✅         |         ✅         |       —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) et `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) couvrent cela pour leurs
frameworks respectifs.

**L'analyse d'exécution** est une catégorie à part du linting
statique :

|                                                             | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ----------------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Lit de vraies données de run pour des verdicts `TRUE-FLAKE` |         partiel\*         |     partiel (tag)     |          ✅           |
| Rapport de triage d'instabilité depuis l'historique         |            ❌             |          ✅           |          ✅           |
| S'intègre au score de fiabilité statique                    |            ❌             |          ❌           |          ✅           |

\*Playwright suit les retries en interne mais ne produit pas de rapport
d'instabilité autonome avec des étiquettes de verdict.

---

## 🤖 Pourquoi pas simplement une revue de code par IA ?

Un problème différent, une autre couche. Une revue IA peut repérer un
changement de test suspect dans un diff ; elle ne prouve pas que le
système de vérification dans son ensemble est digne de confiance — et
elle ne voit que le diff que vous lui montrez.

|                                             |    Revue de code IA (Copilot, etc.)    |            **Mjölnir**            |
| ------------------------------------------- | :------------------------------------: | :-------------------------------: |
| Coût par scan                               | Tokens (évolue avec la taille du diff) |    **Zéro** (local, installé)     |
| Voit toute la suite + toutes les configs CI |     Seulement le diff de PR montré     |      **Tout, à chaque fois**      |
| Déterministe (même entrée → même sortie)    |         ❌ (non déterministe)          |              **✅**               |
| Détecte des motifs dormants depuis des mois |  Seulement s'il est dans le contexte   | **✅** (scanne tous les fichiers) |
| Se souvient des constats entre les runs     |   ❌ (aucune mémoire entre sessions)   |     **✅** (baseline + diff)      |
| Tourne sans déclencheur humain              |     Nécessite une PR ou un prompt      |   **✅** (hook CI, 3 secondes)    |

**Utilisez les deux.** L'IA attrape la nuance, l'intention et les
défauts de conception qu'aucune regex ne trouve. Mjölnir attrape les
motifs structurels que l'IA néglige parce qu'ils semblent
« intentionnels » — un `.only` commité, un code de sortie avalé, un
`continue-on-error` sur un job de test. Ce ne sont pas des bugs qui
demandent du raisonnement ; ce sont des faits qui demandent un scan.

---

## 🤖 Intégration CI

Une commande génère un workflow de PR — consultatif par défaut, jamais
bloquant :

```bash
mjolnir ci install
```

Ou branchez-le nativement dans GitHub Code Scanning via SARIF :

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Configuration éditeur et pipeline pour SARIF :
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Couverture du périmètre modifié

`--scope changed` attribue les constats aux lignes ajoutées dans votre
branche par rapport à la base de fusion avec `main`. Il couvre les
fichiers de tests (`*.spec.*`, `*.test.*`) plus les fichiers de
workflow GitHub et les configurations Playwright du diff. Quand la base
de fusion ne peut pas être résolue — clone superficiel, HEAD détaché,
cible non-git, branche par défaut différente — il dégrade honnêtement :
les constats retombent sur une attribution au fichier entier, et le
rapport le dit. Remplacez la ref de base avec `--base <ref>`.

---

## Configuration

Mjölnir est zéro-config. Un `mjolnir.config.json` optionnel (ou
`.mjolnir.json`) à la racine du dépôt ajuste sévérité, gating et
périmètre — il ne change jamais la sémantique de détection.

| Clé                 | Type                                 | Effet                                                                                                                                                                                                     |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Globs d'ignore supplémentaires (sous-ensemble gitignore), au-dessus des valeurs par défaut intégrées                                                                                                      |
| `gate`              | `"advisory" \| "error" \| "warning"` | Quelles sévérités sortent avec un code non nul (défaut `error` ; `advisory` ne bloque jamais)                                                                                                             |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Re-classe les constats d'une règle pour votre dépôt                                                                                                                                                       |
| `ignore`            | `IgnoreEntry[]`                      | Supprime des constats — **`reason` est obligatoire** ; les entrées expirent après 90 jours (une date `expires` explicite, ou la date de dernière modification du fichier de config pour les entrées sans) |
| `plugins`           | `string[]`                           | Paquets de règles tiers (voir [Modèle de confiance](#modèle-de-confiance))                                                                                                                                |

```json
{
  "gate": "error",
  "exclude": ["legacy/**"],
  "severityOverrides": { "QA-PW-118": "warning" },
  "ignore": [
    {
      "ruleId": "QA-TEST-004",
      "files": ["e2e/legacy-login.spec.ts"],
      "reason": "Third-party widget needs a settle delay; tracked in JIRA-4821",
      "expires": "2026-12-31"
    }
  ]
}
```

- **`.mjolnirignore`** — un fichier simple façon gitignore pour les
  exclusions de chemins, même dialecte que `exclude`. Utilisez-le pour
  le bruit propre à la machine ; utilisez `exclude` quand la liste
  appartient au contrôle de version, à côté du reste de la config.
- **Surclassements CLI** — `--strict` (inclure les règles en
  quarantaine), `--width <cols>` et `--ascii` / `--no-ascii` (rendu
  terminal), `--tone blunt` (messages plus directs),
  `--max-duration <sec>` (scan partiel borné).
- Suppression de règles et cycle de vie de dépréciation :
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

Les entrées `ignore` alimentent aussi la commande autonome
`mjolnir suppressions`, qui liste ce qui est actuellement supprimé et
quand chaque entrée expire.

---

## 📐 Codes de sortie & contrats

Figés — sûrs pour construire de la logique CI dessus :

| Code de sortie | Signification                                                                  |
| -------------- | ------------------------------------------------------------------------------ |
| `0`            | Propre — aucun constat au-dessus ou à l'égal du gate                           |
| `1`            | Constats au-dessus ou à l'égal du gate                                         |
| `2`            | Scan partiel (budget de temps atteint, fichiers illisibles) — ne bloque jamais |
| `10`           | Erreur d'usage (mauvais flag, cible manquante)                                 |
| `20`           | Erreur interne                                                                 |

Le rapport JSON/SARIF est `schemaVersion: 1`. Les ID de règles
(`QA-<FAMILY>-NNN`) sont immuables une fois livrés et jamais
réutilisés.

---

## Modèle de confiance

- **Local-first** — zéro appel réseau pendant le scan. Jamais. Zéro
  télémétrie.
- **Pas de fausse preuve** — nous préférons dire « inconnu » que
  « vérifié ». Un dépôt vide obtient `score: null`, jamais un faux 100.
- **Honnêteté partielle** — si l'analyse a été interrompue, la sortie le
  dit. Jamais « complete » quand ça ne l'est pas.
- **Pare-feu FP** — la détection tourne sur une vue du code sans
  commentaires ni chaînes (les règles TypeScript utilisent l'AST du
  compilateur) : un motif dans un commentaire de prose ou une chaîne
  d'exemple de doc est de la documentation, pas un constat.
- **Mesuré, pas affirmé** — seules les règles avec un taux de faux
  positifs issu de vrai code OSS sortent dans les tiers vedettes (voir
  [Quelle part est mesurée](#quelle-part-est-mesurée)) ; le pied de scan
  et `mjolnir rules --unmeasured` vous disent lesquels.
- **Confiance plugins** — les plugins sont des paquets npm déclarés
  sous `"plugins"`. Il n'y a **pas de sandbox** : le code d'un plugin
  tourne avec tous les privilèges Node, le même modèle de confiance que
  les plugins ESLint ou Vitest. Les préfixes d'ID de règles core sont
  réservés et refusés aux plugins pour empêcher l'usurpation.
- **Règles externes locales au workspace** (par dossier, zéro réseau) —
  un répertoire `mjolnir-rules/` à côté de la cible du scan charge des
  règles personnalisées : des fichiers JSON déclarent des motifs regex
  (aucun code exécuté), les modules `.mjs`/`.js` exportent `rules`
  (confiance Node complète, comme les plugins). Les règles externes
  portent les mêmes métadonnées de confiance que core ; elles ne
  peuvent jamais sortir dans le tier core (core exige un taux de FP
  mesuré depuis le sidecar corpus — un `tier: "core"` déclaré est
  borné à `extended`), obéissent aux caps de tier et sont vérifiées
  contre la dérive : `mjolnir rules --md --external` rend le catalogue
  depuis les fichiers chargés (provenance `external`), et le générateur
  de matrice accepte `--external <root>`.

---

## 🏗️ Architecture

<details>
<summary>Déplier l'arbre</summary>

```
mjolnir/
├── src/
│   ├── engine/          # LanguageAdapter interface + rule runner
│   ├── adapters/        # typescript · python · java · csharp · github-actions
│   ├── rules/           # rules across 8 families + the measured-FP table
│   ├── playwright/      # Selector Health Score engine
│   ├── discovery/       # workspace, frameworks, ignore resolution
│   ├── scope/           # git merge-base changed-scope engine
│   ├── scorer/          # transparent deduction table + prioritization
│   ├── reporter/        # terminal · JSON · SARIF 2.1 · Mermaid
│   ├── forensics/       # run-data ingestion · flake verdicts · triage
│   ├── config/          # mjolnir.config.json + suppressions
│   ├── plugins/         # third-party rule loading (no sandbox)
│   └── commands/        # every subcommand
└── tests/
    ├── fixtures/        # must-fire / must-not-fire per rule
    └── golden/          # frozen score regression locks
```

</details>

- **Les règles sont des fonctions pures** —
  `(SourceFileContext) → Finding[]`, pas d'I/O, pas de globales. Ajouter
  un écosystème = un adaptateur + ses règles.
- **TypeScript/Playwright utilise l'AST du compilateur** (ts-morph).
  Python, Java et C# tournent sur une couche regex partagée avec
  commentaires/chaînes masqués.
- Une couche AST tree-sitter WASM pour Java et C# existe et constitue
  la prochaine étape de précision — elle n'est pas encore câblée dans
  le pipeline de scan synchrone.

---

## 📚 Documentation

| Document                                               | Contenu                                            |
| ------------------------------------------------------ | -------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalisation du score + pondération par la preuve |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Taux de faux positifs mesurés + méthode            |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | États des règles, suppression, dépréciation        |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Sortie SARIF + configuration éditeur/CI            |
| [docs/rules/](docs/rules/)                             | Catalogue généré par règle                         |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Setup dev + workflow de contribution               |
| [CHANGELOG.md](CHANGELOG.md)                           | Historique des versions                            |
| [SECURITY.md](SECURITY.md)                             | Signalement de vulnérabilités                      |

---

## 📈 Statut

**v0.5.x · bêta ouverte.** Le schéma JSON et les codes de sortie sont
des contrats figés. TypeScript et Python ont la couverture mesurée la
plus large ; Java et C# sont plus récents — lisez-les via la
[table des tiers](#tiers-de-règles-et-maturité-par-langage).

---

## 🤝 Contribuer

Les nouvelles règles sont la première contribution la plus simple —
une commande scaffolde la règle plus ses fixtures must-fire **et**
must-not-fire (la règle générée échoue volontairement à ses fixtures
tant que vous n'implémentez pas une vraie détection — un stub ne peut
pas sortir) :

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Le setup dev complet, les commandes de la barrière permanente et les
lois anti-dérive / pare-feu à fixtures sont dans
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Ne livrez plus des tests auxquels vous ne pouvez pas faire
confiance.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Construit par [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
