<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Os testes dizem o que passou. O Mjölnir diz em que você pode confiar." width="100%" />

<br />

O Mjölnir encontra testes que não podem falhar e pipelines que não podem ficar vermelhos,<br />
e depois pontua até onde o resultado merece confiança, com a evidência de cada ponto.

<br />

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![downloads](https://img.shields.io/npm/dm/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0A1119)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Sergey-Bar/Mjolnir?style=flat-square&color=1F6F7C&labelColor=0A1119&label=coverage)](https://codecov.io/gh/Sergey-Bar/Mjolnir)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Sergey-Bar/Mjolnir/badge)](https://scorecard.dev/viewer/?uri=github.com/Sergey-Bar/Mjolnir)
[![license](https://img.shields.io/badge/license-MIT-1F6F7C.svg?style=flat-square&labelColor=0A1119)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-1F6F7C.svg?style=flat-square&labelColor=0A1119)](https://nodejs.org)

```bash
npx mjolnir-qa@latest
```

[Veja funcionando](#veja-funcionando) · [Início rápido](#início-rápido) · [O que encontra](#o-que-o-mjölnir-encontra) · [Pontuação](#a-pontuação-de-confiabilidade) · [Evidência](#o-modelo-de-evidência) · [Forense](#forense-de-execução) · [CI](#integridade-de-ci) · [Agentes](#agentes-de-ia) · [Segurança](#confiança-e-segurança) · [Limites](#o-que-o-mjölnir-não-pode-dizer) · [Docs](#documentação)

<details>
<summary>Leia em outro idioma — 22 traduções</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | Português (Brasil) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## Um check verde é uma afirmação, não uma prova

Um check verde significa que o pipeline não falhou. Não significa que os testes rodaram, nem que poderiam ter falhado. Todos estes casos passam verdes:

- um `.only` commitado que rodou 3 testes em vez de 900
- `continue-on-error: true` no job que deveria bloquear
- `|| true` depois do comando de testes
- um teste que não verifica nada, ou que tem o corpo vazio
- um wrapper de retry que transforma uma falha real em uma aprovação por sorte
- um relatório que o workflow envia, mas que nunca foi gerado
- um sleep fixo segurando uma condição de corrida

Nenhum deles deixa o pipeline vermelho, e todos parecem intencionais na revisão. É por isso que sobrevivem. Aqui está o Mjölnir lendo um caso real:

<p align="center">
  <img src="assets/readme/scan.svg" alt="O workflow de CI do repositório de demonstração, lido linha por linha. O Mjölnir aponta cada achado na linha reportada, com sua regra, o que está errado, seu nível de evidência e sua taxa de falsos positivos medida." width="800" />
</p>

<sub>Cada achado que o scan de demonstração reportou para este workflow, na linha reportada. Gerado por `npm run docs:readme-brand` a partir de [`demo-report.json`](assets/readme/demo-report.json) e travado contra desvios na CI.</sub>

**Modo estrito.** As detecções mais agressivas — `.only`, `continue-on-error`, testes vazios, abuso de retry — ficam na quarentena. Só rodam com `--strict` e são limitadas a severidade `info`: elas sinalizam, nunca bloqueiam. O scan padrão (`npx mjolnir-qa@latest` sem `--strict`) cobre apenas regras core e extended. Adicione `--strict` quando quiser a camada de consultoria também.

O Mjölnir lê a suíte, os workflows de CI e, se você tiver, o relatório de uma execução real. Ele não roda seus testes, não instala suas dependências e não executa o código que analisa. E quando não tem evidência, ele diz isso em vez de inventar confiança:

| Situação                                                   | O que o Mjölnir reporta                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Nenhuma declaração de teste encontrada                     | Pontuação `null`, exibida como **UNKNOWN**. Nunca um 100 inventado. |
| Nenhuma baseline ou revisão comparável                     | **UNKNOWN**, com o motivo informado. Nunca um 0 presumido.          |
| Scan interrompido (orçamento de tempo, arquivos ilegíveis) | **PARTIAL**, saída `2`. Nunca apresentado como limpo.               |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Como o Mjölnir funciona. Ele lê a suíte de testes e o pipeline de CI de forma estática, e o relatório de uma execução real quando existe um. Ele pondera cada achado pelo nível de evidência e pelo nível de confiança, em que só uma execução real alcança L3 a L5, e produz achados, uma pontuação de confiabilidade e um gate de CI com códigos de saída congelados. No ciclo do agente, a IA escreve a correção e o Mjölnir refaz o scan para prová-la." width="880" />
</p>

<sub>Composto para esta página e exibido em 1:1. Gerado por `npm run docs:readme-brand` e travado contra desvios na CI; a pontuação, as contagens e o ID da regra vêm de [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) e do registro de regras, nunca digitados à mão. A mesma imagem como pôster: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Veja funcionando

Um scan real de [`examples/demo-repo`](examples/demo-repo), uma pequena suíte Playwright com um workflow de CI. Foi para cá que os pontos dela foram:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="O detalhamento das deduções do Mjölnir: WORTHINESS 80/100 WORTHY, a pontuação por categoria, o quadro de deduções por severidade e uma lista FIX THIS FIRST" width="520" />
</p>

<sub>Gerado por `npm run docs:hero` a partir de um scan real e travado contra desvios na CI. O relatório `--verbose` completo do mesmo scan é [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Assista</strong> — um scan, a correção que ele imprime e o novo scan que a prova</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Um quadro da gravação de demonstração: npx mjolnir-qa@latest analisando o repositório de demonstração em uma janela de terminal" width="900" />
  </a>
</p>

<sub>Renderizado quadro a quadro a partir de um scan real por `npm run docs:video`; nunca gravado da tela. Selecione o quadro para abrir [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Um achado, de perto

Todo achado responde a quatro perguntas: onde está, quão seguro o Mjölnir está, com que frequência a regra erra e como corrigir.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="O primeiro achado do scan de demonstração, exatamente como o terminal o imprime, com suas quatro partes destacadas: onde, quão seguro, com que frequência a regra erra, e a correção." width="100%" />
</p>

`mjolnir explain QA-CI-001` imprime o histórico de confiança completo de uma regra, incluindo sua taxa de falsos positivos medida e o nível que essa taxa lhe rendeu:

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

Essa é a unidade de valor: um lugar onde a CI reporta uma aprovação que não mereceu.

<br />

## Início rápido

```bash
npx mjolnir-qa@latest
```

Ele analisa o diretório atual e imprime o Trust Report: o que encontrou, até onde você pode confiar, por quê e o que fazer em seguida. Sai com `0` quando nada foi encontrado no nível do gate ou acima.

Na CI, analise só o que a branch introduziu, para que uma suíte legada não afogue seu primeiro pull request:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` grava isso como um workflow do GitHub Actions, usando a [action](https://github.com/Sergey-Bar/Mjolnir#readme) fixada na tag principal `v1` (ou `npx` puro com `--no-action`). Ele continua consultivo até você decidir que deve bloquear.

| Comando                             | O que faz                                                     |
| ----------------------------------- | ------------------------------------------------------------- |
| `mjolnir`                           | Trust Report: veredito, confiança, próxima ação               |
| `mjolnir --scope changed`           | Só o que sua branch introduziu (a forma para CI)              |
| `mjolnir ci install`                | Gera o workflow consultivo de PR (baseado na action)          |
| `mjolnir explain QA-CI-001`         | O quê, por quê e correção, mais a taxa de FP medida           |
| `mjolnir why src/a.spec.ts:42`      | Por que exatamente esta linha foi apontada. Nunca bloqueia.   |
| `mjolnir forensics ./test-results/` | Evidência de runtime de uma execução real                     |
| `mjolnir trust-report`              | Trust Artifact autocontido (md + json)                        |
| `mjolnir handoff`                   | Plano de correção para um agente de código                    |
| `mjolnir --json` / `--format sarif` | Saída legível por máquina, GitHub Code Scanning               |
| `mjolnir --format codequality`      | Relatório do GitLab Code Quality (artefato do widget de MR)   |
| `mjolnir --strict`                  | Também roda as regras do nível quarantine (maior risco de FP) |

<details>
<summary><strong>Todos os outros comandos</strong> — triagem de testes instáveis, relatórios, governança</summary>

<br />

| Comando                             | O que faz                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `mjolnir --classic`                 | O banner de pontuação anterior ao Trust Report                                |
| `mjolnir explain verdict`           | Por que o veredito do scan salvo é o que é                                    |
| `mjolnir triage ./test-results/`    | Triagem guiada. Cada linha termina em uma próxima ação.                       |
| `mjolnir pw-report ./test-results/` | Resumo da execução do Playwright: retries, instáveis, os mais lentos          |
| `mjolnir doctor:playwright`         | Scan profundo só de Playwright mais Selector Health Score                     |
| `mjolnir fix --dry-run` / `fix`     | Correções automáticas seguras, cada uma reanalisada para provar que funcionou |
| `mjolnir baseline` / `diff`         | Registra os achados e depois reporta só os novos ou piores                    |
| `mjolnir impact --since <ref>`      | O que um commit introduziu e resolveu                                         |
| `mjolnir summary`                   | Anotações de CI e um resumo do step a partir de um relatório                  |
| `mjolnir pr-comment`                | Um comentário de PR com escopo, em Markdown                                   |
| `mjolnir debt`                      | Registro de dívida de testes com um modelo de custo                           |
| `mjolnir handover`                  | Mapa de integração da suíte para um novo engenheiro de QA                     |
| `mjolnir init`                      | Detecta frameworks e imprime um checklist de configuração                     |
| `mjolnir suppressions`              | Lista os achados suprimidos, para governança                                  |
| `mjolnir rules --unmeasured`        | As regras que rodam por suposição, não por medição                            |
| `mjolnir rules --md`                | Catálogo completo de regras (JSON ou Markdown)                                |
| `mjolnir doctor`                    | Autoauditoria da base de regras do próprio Mjölnir                            |
| `mjolnir create-rule <ID>`          | Cria o esqueleto de uma nova regra e suas fixtures                            |
| `mjolnir stats`                     | Contadores locais de todas as correções já vistas                             |
| `mjolnir badge`                     | JSON de endpoint do shields.io e snippet                                      |
| `mjolnir --cache`                   | Novos scans incrementais via um cache local de vereditos                      |
| `mjolnir --format mermaid`          | Diagrama da arquitetura de testes para um comentário de PR                    |

`mjolnir help <command>` imprime uso, exemplos e o próximo passo de qualquer um deles.

</details>

Requer **Node.js ≥ 22.18** no Windows, macOS ou Linux. Prefere uma instalação global? `npm i -g mjolnir-qa`. O mínimo vem da cadeia de build (o tsdown mira nele e o pipeline de release faz smoke tests contra ele); as dependências de runtime não precisam de mais que isso.

<br />

## O que o Mjölnir encontra

<p align="center">
  <img src="assets/readme/stack.svg" alt="Funciona com a sua stack: as linguagens, frameworks de teste e sistemas de CI cobertos pelas regras, a partir do registro de regras." width="100%" />
</p>

**79 regras** em quatro famílias — higiene de testes, qualidade de testes, Playwright e integridade de CI — para TypeScript e JavaScript, Python, Java, C# e YAML do GitHub Actions. Elas cobrem o Playwright nos quatro bindings, além de pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest e Mocha, com cobertura inicial para Cypress e Selenium. Nove delas, para mostrar o formato:

| ID           | Regra                                                                     | Severidade | Nível      |
| ------------ | ------------------------------------------------------------------------- | ---------- | ---------- |
| QA-CI-001    | `continue-on-error` mascara um gate de verificação que falha              | error      | quarantine |
| QA-CI-009    | Código de saída dos testes não propagado (`\|` sem pipefail, cadeias `;`) | error      | extended   |
| QA-TEST-001  | Teste focado commitado (`.only`, `fit`)                                   | error      | quarantine |
| QA-TEST-003  | Teste sem asserções                                                       | error      | quarantine |
| QA-TQUAL-009 | Asserção de promise sem await                                             | error      | quarantine |
| QA-PW-002    | Asserção de locator sem await                                             | error      | core       |
| QA-PW-004    | Seletores CSS/XPath frágeis                                               | warning    | quarantine |
| QA-PY-002    | Teste pulado (`skip`, `xfail` não estrito)                                | warning    | core       |
| QA-CS-103    | Método de teste sem asserções                                             | error      | core       |

O catálogo completo é gerado a partir do registro, nunca mantido à mão: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) ou o [guia do que ele verifica](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Todas as regras citadas neste README</strong>, em uma tabela</summary>

<br />

> Regras `quarantine` só rodam com `--strict` e nunca bloqueiam (ficam limitadas a info). A severidade mostrada é a definida pelo autor.

| ID           | Família    | Regra                                                          | Severidade | Nível      |
| ------------ | ---------- | -------------------------------------------------------------- | ---------- | ---------- |
| QA-TEST-001  | Higiene    | Teste focado commitado (`.only`, `fit`)                        | error      | quarantine |
| QA-TEST-002  | Higiene    | Teste pulado. Escala para `error` sem um motivo rastreado.     | warning    | quarantine |
| QA-TEST-003  | Higiene    | Teste sem asserções                                            | error      | quarantine |
| QA-TEST-004  | Higiene    | Sleep fixo (`waitForTimeout`, `sleep()`, `delay()`)            | warning    | extended   |
| QA-TEST-006  | Higiene    | Abuso de retry escondendo instabilidade                        | warning    | quarantine |
| QA-TEST-010  | Higiene    | Corpo de teste vazio                                           | error      | quarantine |
| QA-TQUAL-002 | Qualidade  | Asserção tautológica                                           | error      | quarantine |
| QA-TQUAL-009 | Qualidade  | Asserção de promise sem await                                  | error      | quarantine |
| QA-TQUAL-011 | Qualidade  | Testes comentados                                              | warning    | extended   |
| QA-PW-002    | Playwright | Asserção de locator sem await                                  | error      | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` commitado                       | error      | core       |
| QA-PW-004    | Playwright | Seletores CSS/XPath frágeis                                    | warning    | quarantine |
| QA-PW-123    | Playwright | URLs de ambiente fixas no código                               | warning    | quarantine |
| QA-PW-140    | Playwright | Screenshot sem `maxDiffPixelRatio`                             | warning    | core       |
| QA-CI-001    | CI         | `continue-on-error` mascara um gate que falha                  | error      | quarantine |
| QA-CI-002    | CI         | `\|\| true` engole códigos de saída                            | error      | extended   |
| QA-CI-005    | CI         | Relatório consumido, mas nunca gerado                          | error      | quarantine |
| QA-CI-007    | CI         | Wrappers de retry em volta dos testes                          | warning    | extended   |
| QA-CI-008    | CI         | Step que sempre passa mascara falhas                           | error      | quarantine |
| QA-CI-009    | CI         | Código de saída não propagado (`\|` sem pipefail, cadeias `;`) | error      | extended   |
| QA-CI-010    | CI         | Testes pulados onde deveriam bloquear                          | error      | quarantine |
| QA-PY-002    | Python     | Teste pulado (`skip`, `xfail` não estrito)                     | warning    | core       |
| QA-PY-003    | Python     | Função de teste sem asserções                                  | error      | quarantine |
| QA-PY-005    | Python     | `time.sleep()` nos testes                                      | warning    | extended   |
| QA-PY-012    | Python     | Asserção tautológica                                           | error      | quarantine |
| QA-JV-101    | Java       | Teste desativado (`@Disabled`)                                 | warning    | core       |
| QA-JV-102    | Java       | Sleep fixo (`Thread.sleep()`)                                  | warning    | extended   |
| QA-JV-103    | Java       | Método de teste sem asserções                                  | error      | extended   |
| QA-JV-105    | Java       | Sleep fixo com `waitForTimeout()` do Playwright                | warning    | core       |
| QA-JV-106    | Java       | Seletor frágil em vez de locator por papel                     | warning    | quarantine |
| QA-CS-101    | C#         | Teste pulado (`[Ignore]`, `[Fact(Skip=)]`)                     | warning    | core       |
| QA-CS-102    | C#         | Sleep fixo (`Thread.Sleep` / `Task.Delay`)                     | warning    | core       |
| QA-CS-103    | C#         | Método de teste sem asserções                                  | error      | core       |
| QA-CS-105    | C#         | Sleep fixo com `WaitForTimeoutAsync()`                         | warning    | extended   |
| QA-CS-106    | C#         | Seletor frágil em vez de locator por papel                     | warning    | quarantine |

O Python também traz QA-PY-001…012 (higiene do pytest) e QA-PY-101…108 (Playwright para Python). Cypress e Selenium têm conjuntos iniciais de três regras cada.

</details>

Toda regra é lançada com uma fixture must-fire **e** uma must-not-fire, e uma regra que dispara na própria fixture negativa não pode ser lançada. Esse é o firewall contra falsos positivos; `mjolnir doctor` o aplica na própria CI deste repositório.

### Selector Health Score

`mjolnir doctor:playwright` avalia cada locator pela forma como encontra um elemento: do jeito que um usuário faria (papel, rótulo, texto), por um contrato explícito (`data-testid`) ou por um acidente estrutural (cadeias CSS, XPath). Cada arquivo recebe uma pontuação de 0 a 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Isso mede **resiliência, não correção**. `.btn.btn-primary > div:nth-child(2)` passa hoje e continua passando até alguém mexer no markup. Uma pontuação baixa nunca afirma que o teste está quebrado, só que ele depende de um markup que ninguém prometeu manter.

<br />

## A pontuação de confiabilidade

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="A escala de confiabilidade de 0 a 100, com um marcador que percorre cada pontuação: UNWORTHY abaixo de 50, NEEDS WORK de 50 a 79, WORTHY de 80 a 99, FORGED em 100" width="720" />
</p>

<sub>Cada pontuação de 0 a 100, posicionada pelo `deriveScoreState` real. Gerado por `npm run docs:gauge` e travado contra desvios na CI.</sub>

| Pontuação | Veredito                                            |
| --------- | --------------------------------------------------- |
| `0 – 49`  | **UNWORTHY**                                        |
| `50 – 79` | **NEEDS WORK**                                      |
| `80 – 99` | **WORTHY**                                          |
| `100`     | **FORGED**                                          |
| `null`    | **UNKNOWN**: nenhuma declaração de teste encontrada |

**Como é calculada.** A severidade define uma dedução base (`error −8`, `warning −3`, `info −1`) e o nível de evidência a desconta: E2 conta integralmente, E1 pela metade (arredondado para baixo), E0 nada. O total é normalizado pela exposição da suíte, ou seja, deduções por declaração de teste, e não por arquivo. O terminal imprime os mesmos números descontados que a pontuação usou; não há um segundo modelo escondido. Detalhes: [docs/SCORING.md](docs/SCORING.md) e o [guia de pontuação](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**O que 100 não significa.** Não significa que o software está correto, que a suíte é adequada ou que o produto está livre de defeitos. Significa uma única coisa: **nenhuma das regras avaliadas pelo Mjölnir produziu uma dedução neste scan e neste modelo de evidência.**

<br />

## O modelo de evidência

Todo achado carrega dois rótulos: quão seguro o Mjölnir está e até onde o achado foi verificado. Essa é a diferença entre uma ferramenta que reporta padrões e uma ferramenta em que você pode condicionar um release.

**Quão seguro — o nível de evidência.**

| Nível  | Nome                 | Significa                                           | Dedução  |
| ------ | -------------------- | --------------------------------------------------- | -------- |
| **E2** | Prova determinística | O defeito está presente no código como escrito      | Integral |
| **E1** | Evidência de padrão  | Um padrão fortemente ligado ao defeito correspondeu | Metade   |
| **E0** | Observação           | Vale saber. Não afirma que algo está errado.        | Zero     |

A confiança em uma detecção não é a força da prova. Uma regra pode ter certeza de que encontrou o que procurava e ainda assim estar olhando para uma heurística. Achados E1 existem para ser lidos e julgados, nunca aplicados às cegas, e esse limite fica marcado no achado no terminal, no JSON e na passagem para o agente.

**Até onde foi verificado — o nível de confiança.** A maioria dos achados vem da leitura do seu código. Dê ao Mjölnir o relatório de uma execução real de testes e ele poderá confirmar que o código de fato rodou.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="A escada de confiança de L0 a L5. L0 a L2 vêm da leitura do código; L3 a L5 precisam do relatório de uma execução real, marcado por uma quebra na escada." width="100%" />
</p>

| Nível  | Em palavras simples | O que é preciso                                                       |
| ------ | ------------------- | --------------------------------------------------------------------- |
| **L0** | Anotado             | Ler o código                                                          |
| **L1** | Parece o problema   | Ler o código: um padrão correspondeu                                  |
| **L2** | Provado no código   | Ler o código: o defeito é estrutural                                  |
| **L3** | O arquivo rodou     | Um relatório de execução mostra que o arquivo do achado foi executado |
| **L4** | O teste rodou       | Um relatório de execução mostra que o teste do achado foi executado   |
| **L5** | A execução concorda | O próprio resultado da execução confirma a classe do defeito          |

Um scan estático para em L2. Só o relatório de uma execução real (Playwright JSON, Jest ou Vitest JSON, JUnit XML) pode elevar um achado a L3 ou acima, de modo que um achado que nunca foi visto rodando nunca pode afirmar que rodou. Definições: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Quanto disso é medido

**74 de 79 regras têm uma taxa de falsos positivos medida contra código OSS real** (pelo menos 10 achados classificados à mão cada; veja [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). As outras 5 são lançadas com a estimativa do autor e dizem isso, regra por regra, em `mjolnir explain`. `mjolnir rules --unmeasured` as lista, e o rodapé de cada scan informa quantas das regras que de fato _dispararam_ são medidas.

As taxas continuam públicas quando são ruins. QA-TEST-001 (um `.only` commitado) vai mal na auditoria em repositórios reais e por isso está em quarantine. O número atual de cada regra, incluindo QA-PW-141, está na auditoria.

### Níveis de confiança das regras

Os níveis seguem a taxa de falsos positivos medida, não opinião:

| Nível          | FP medido                         | Comportamento                                      |
| -------------- | --------------------------------- | -------------------------------------------------- |
| **core**       | ≤ 10%                             | Relatório padrão, bloqueia                         |
| **extended**   | ≤ 30%                             | Relatório padrão, confiança menor                  |
| **quarantine** | > 30% ou explicitamente declarado | Só com `--strict`, limitado a info, nunca bloqueia |
| _não medida_   | n < 10                            | Não pode ser promovida a core até ser medida       |

As faixas de FP só podem rebaixar um nível — nunca promovem uma regra para fora de `quarantine` se ela foi explicitamente declarada lá. Uma regra explicitamente colocada em quarantine permanece em quarantine independentemente de sua taxa de FP medida.

Promoção, rebaixamento e maturidade por linguagem: [ciclo de vida das regras](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Por que isto não é um linter

Linters dizem se o código segue regras. O Mjölnir diz se a sua verificação merece confiança.

|                                                                    | Linters (ESLint, SonarQube) | Ferramentas de cobertura | Revisão de código com IA |   **Mjölnir**    |
| ------------------------------------------------------------------ | :-------------------------: | :----------------------: | :----------------------: | :--------------: |
| Pontua o **sistema de verificação**, não o código do produto       |             Não             |           Não            |           Não            |       Sim        |
| Integridade dos workflows de CI (`continue-on-error`, `\|\| true`) |             Não             |           Não            |        só o diff         |       Sim        |
| Avalia a resiliência dos locators do Playwright (Selector Health)  |             Não             |           Não            |           Não            |       Sim        |
| Lê dados de execução reais para vereditos `TRUE-FLAKE`             |             Não             |           Não            |           Não            |       Sim        |
| Publica uma taxa de falsos positivos medida por regra              |             Não             |           Não            |           Não            |       Sim        |
| Aponta testes sem asserções                                        |            Sim\*            |           Não            |         às vezes         |       Sim        |
| Detecta sleeps fixos (`waitForTimeout`, `time.sleep`)              |            Sim\*            |           Não            |         às vezes         |       Sim        |
| Determinístico (mesma entrada, mesma saída)                        |             Sim             |           Sim            |           Não            |       Sim        |
| Custo por scan                                                     |           grátis            |          grátis          |          tokens          | **zero** (local) |

<sub>\*Coberto por `eslint-plugin-jest` e `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) e pelas próprias regras de asserção do SonarQube. As colunas descrevem o comportamento padrão para verificação de suítes de teste; plugins, planos pagos e regras personalizadas mudam algumas respostas. Este é um resumo de posicionamento, não um benchmark.</sub>

Use revisão com IA também. Ela percebe nuances, intenção e falhas de design que nenhum padrão encontra. O Mjölnir pega o que a revisão com IA deixa passar porque parece intencional: um `.only` commitado, um código de saída engolido, um `continue-on-error` em um job de testes. Isso exige scan, não raciocínio.

<br />

## Forense de execução

A análise estática raciocina sobre código que nunca rodou. A forense lê o que realmente aconteceu: Playwright JSON, Jest JSON, Vitest JSON e JUnit XML de qualquer runner.

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

`TRUE-FLAKE` não significa que o teste teve retry. Significa que o teste **falhou em pelo menos uma tentativa e depois terminou verde**: uma aprovação por sorte, apontada não importa o que diga o check final. `mjolnir triage` transforma esse histórico em uma proposta de quarentena, e `mjolnir pw-report` resume uma execução. São esses mesmos relatórios de execução que elevam os achados aos níveis de confiança L3 e acima.

<br />

## Integridade de CI

Um teste pode passar enquanto o pipeline ao redor dele não consegue falhar. O Mjölnir também lê os workflows: `continue-on-error`, `|| true`, códigos de saída que nunca se propagam, steps que sempre passam, relatórios consumidos mas nunca gerados e gates pulados justamente nos eventos que deveriam bloquear. Cada achado nomeia o job, o step e a linha, e carrega seu próprio nível de evidência.

Gere o workflow de PR, consultivo por padrão:

```bash
mjolnir ci install
```

Ou adicione a action do Marketplace a um workflow que você já tem:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

Fixe `@v1` para acompanhar a linha principal, ou uma tag exata (`@v0.5.32`) para um gate reproduzível. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) cobre o Marketplace, o Smithery e os registros MCP.

Para levar os achados ao GitHub Code Scanning, envie o SARIF (requer `security-events: write` no escopo do workflow ou job):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

No GitLab, `--format codequality` grava o relatório do Code Quality que o widget de MR e as anotações do diff leem ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Configuração do editor e do pipeline: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Atribuição no escopo alterado

```bash
npx mjolnir-qa@latest --scope changed
```

Os achados são atribuídos às linhas que sua branch adicionou, medidas contra a **merge-base**. O escopo é o mesmo conjunto de arquivos que um scan completo descobre (specs TS/JS e configurações de adaptadores, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), mais as alterações não commitadas e não rastreadas, então funciona antes do commit. A base é resolvida como `main → master → origin/main → origin/master → origin/HEAD`; substitua com `--base <ref>`.

Quando a merge-base não pode ser resolvida (um clone raso, um HEAD destacado, um alvo fora do git), os achados passam a ser atribuídos ao arquivo inteiro **e o relatório diz isso.** Um fallback silencioso seria exatamente o tipo de defeito que esta ferramenta existe para pegar.

<br />

## Agentes de IA

Achados só valem alguma coisa se algo agir sobre eles.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**A IA escreve a correção. O Mjölnir a verifica.** A prova vem do novo scan, nunca do próprio relato de sucesso do agente.

| Comando           | O que o agente recebe                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | Um servidor [MCP](https://modelcontextprotocol.io) via stdio. `scan`, `explain` e `diff` viram ferramentas chamáveis.                                                      |
| `mjolnir handoff` | Um relatório `--json` salvo vira um plano determinístico em Markdown: o que foi detectado, o limite de evidência de cada achado, o que **não** pode mudar, como verificar. |
| `mjolnir install` | Grava nas superfícies de agente que seu repo já tem (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) para que o agente refaça o scan antes de dizer que terminou.           |

Adicione-o a um cliente que tenha sua própria CLI:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

Ou a qualquer cliente que aceite um bloco `mcpServers`:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**A proteção importa mais que a conveniência.** Todo achado em uma passagem carrega seu limite. **E2** diz _determinístico: confira o local e aplique a correção_. **E1** diz _REQUER CONFIRMAÇÃO: a observação sozinha não prova o defeito_. Um agente que corrige E1 às cegas, suprime uma regra ou edita uma regra para aumentar a pontuação está fazendo exatamente o que esta ferramenta existe para pegar, então a passagem diz isso no prompt, ao lado do achado.

<br />

## Confiança e segurança

**Local-first, zero telemetria.** Nenhuma API com acesso à rede (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) existe em lugar nenhum de `src/`, e [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) quebra o build se uma aparecer. Ele também proíbe `eval` e `new Function`. Analisar código não confiável nunca o executa: a análise estática lê o texto-fonte, e a forense interpreta arquivos de relatório que já existem em disco.

Duas ressalvas: o próprio `npx` baixa o pacote antes de qualquer coisa rodar, e a garantia cobre `src/`, não plugins de terceiros.

**Plugins não rodam em sandbox.** Plugins JS (`mjolnir-rules/*.mjs`, ou pacotes npm listados em `"plugins"`) rodam com todos os privilégios do Node, o mesmo modelo de confiança dos plugins do ESLint ou do Vitest. Carregá-los é opcional **por scan**: sem `--enable-plugins` (ou `MJOLNIR_ENABLE_PLUGINS=1`), suas fontes nunca são carregadas, e um aviso no stderr lista o que foi pulado. Manifestos de regras em JSON não executam código, e os prefixos de ID das regras core são reservados para que nenhum plugin possa se passar por uma delas. Reporte vulnerabilidades por meio do [SECURITY.md](SECURITY.md).

**Ele roda sobre si mesmo.** Um motor de confiança de verificação não tem credibilidade se não for ele próprio verificável. Cada execução da CI analisa este repositório com o build que essa mesma execução produziu. O gate falha com qualquer achado de severidade error, e também com um scan **parcial** ou uma **regra que travou**, porque um autoscan truncado que não reporta nada é o falso verde que este projeto existe para pegar. `mjolnir doctor` reaudita a base de regras na mesma execução (firewall de fixtures, honestidade dos níveis, o teto do nível core), e uma verificação INCONCLUSIVE falha exatamente como uma que falhou. Os dois relatórios são enviados como artefatos do build.

### Códigos de saída e o contrato de máquina

Congelados, para que você possa construir lógica de CI em cima deles:

| Código de saída | Significado                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `0`             | Limpo: nenhum achado no nível do gate ou acima                                  |
| `1`             | Achados no nível do gate ou acima                                               |
| `2`             | Scan parcial (orçamento de tempo esgotado, arquivos ilegíveis). Nunca bloqueia. |
| `10`            | Erro de uso (flag inválida, alvo ausente)                                       |
| `20`            | Erro interno                                                                    |

`2` é deliberadamente diferente de `0`: um scan que não terminou não encontrou "nada". Ele só não terminou de procurar.

Tudo o que uma máquina consome (resultados das ferramentas MCP, `--json`, SARIF 2.1) vem de um único resultado canônico sob um esquema versionado e **somente aditivo** (`schemaVersion: 1`, `contractVersion: 1`), para que nenhum consumidor precise reconstruir significado a partir de texto renderizado. Veja [o contrato de máquina](docs/machine-contract.md). IDs de regra (`QA-<FAMILY>-NNN`) são imutáveis depois de lançados e nunca são reutilizados.

<br />

## O que o Mjölnir não pode dizer

- **Ele não roda seus testes.** Um scan limpo não é uma suíte aprovada.
- **Ele não pode dizer que uma asserção está _errada_.** `expect(total).toBe(41)` parece saudável. O Mjölnir encontra testes que _não podem falhar_ e pipelines que _não podem ficar vermelhos_, não testes que verificam a coisa errada.
- **Ele não prova a correção de negócio.** Nada aqui diz que o seu produto faz o que o requisito pediu.
- **Um 100 não é prova de uma boa suíte.** Se a sua suíte cobre o seu risco real é outra questão, e esta ferramenta não a responde.
- **5 de 79 regras são lançadas com uma estimativa**, não com uma taxa medida. Cada uma diz isso no próprio achado.
- **E1 não é E2.** Achados heurísticos merecem ser lidos, não aplicados às cegas.
- **Um repo vazio recebe `null`, nunca 100.**
- **Um arquivo chamado `*.spec.ts` sem declarações de teste não conta como cobertura.** Um repo cujos únicos arquivos spec contêm imports ou tipos (zero chamadas `it`/`test`) recebe `null`, não 100.

<br />

## Documentação

O site completo de documentação está em <https://sergey-bar.github.io/Mjolnir/>.

| Documento                                              | O que tem nele                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalização da pontuação e ponderação da evidência                 |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Vocabulário canônico: uma palavra por conceito                      |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Taxas de falsos positivos medidas e o método                        |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Estados das regras, níveis, supressão, descontinuação               |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Política de semver, superfícies congeladas, ciclo de descontinuação |
| [docs/machine-contract.md](docs/machine-contract.md)   | O resultado canônico legível por máquina                            |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Saída SARIF e configuração do editor ou da CI                       |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: relatório do Code Quality, receita de MR, gate              |
| [docs/rules/](docs/rules/)                             | Catálogo gerado por regra                                           |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Ambiente de desenvolvimento e fluxo de contribuição                 |
| [SUPPORT.md](SUPPORT.md)                               | Onde perguntar, reportar e obter ajuda                              |
| [SECURITY.md](SECURITY.md)                             | Relato de vulnerabilidades                                          |
| [CHANGELOG.md](CHANGELOG.md)                           | Histórico de versões                                                |

### Status

**Versão 1.** O esquema JSON e os códigos de saída são contratos congelados. TypeScript e Python têm a cobertura medida mais ampla. Java e C# são mais recentes; leia-os pela [tabela de maturidade](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). O que vem a seguir, sem datas inventadas: [o roadmap público](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Contribuindo

Novas regras são a primeira contribuição mais fácil. Um comando cria o esqueleto da regra com suas fixtures must-fire **e** must-not-fire. A regra gerada falha nas próprias fixtures de propósito até que uma detecção real seja escrita, porque um stub lançado é uma regra que ninguém mediu:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

O ambiente de desenvolvimento, os comandos dos gates permanentes e as leis anti-creep e do firewall de fixtures estão em [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Rode no seu repo." width="100%" />

```bash
npx mjolnir-qa@latest
```

[Leia o guia](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Site de documentação](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Não pergunte se os testes passaram.<br />
Pergunte se a evidência prova que eles merecem confiança.

<sub>Criado por [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · Licença MIT</sub>

</div>
