<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Testler neyin geçtiğini söyler. Mjölnir neye güvenebileceğinizi söyler." width="100%" />

<br />

Mjölnir başarısız olamayan testleri ve kırmızıya dönemeyen pipeline'ları bulur,<br />
ardından sonuca ne kadar güvenilebileceğini, her puanın kanıtıyla birlikte puanlar.

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

[Çalışırken görün](#çalışırken-görün) · [Hızlı başlangıç](#hızlı-başlangıç) · [Neler bulur](#mjölnir-neler-bulur) · [Puan](#güvenilirlik-puanı) · [Kanıt](#kanıt-modeli) · [Çalıştırma analizi](#test-çalıştırma-analizi) · [CI](#ci-bütünlüğü) · [Ajanlar](#yapay-zekâ-ajanları) · [Güvenlik](#güven-ve-güvenlik) · [Sınırlar](#mjölnirin-size-söyleyemedikleri) · [Belgeler](#belgeler)

<details>
<summary>Başka bir dilde okuyun — 22 çeviri</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | Türkçe | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## Yeşil onay işareti bir iddiadır, kanıt değil

Yeşil onay işareti pipeline'ın başarısız olmadığı anlamına gelir. Testlerin çalıştığı ya da başarısız olabilecekleri anlamına gelmez. Bunların her biri yeşil geçer:

- 900 yerine 3 test çalıştıran, commit edilmiş bir `.only`
- engellemesi gereken job üzerinde `continue-on-error: true`
- test komutundan sonra `|| true`
- hiçbir şeyi doğrulamayan ya da gövdesi boş olan bir test
- gerçek bir başarısızlığı şanslı bir geçişe çeviren bir retry sarmalayıcısı
- workflow'un yüklediği ama hiç üretmediği bir rapor
- bir yarış durumunu ayakta tutan sabit bir sleep

Hiçbiri pipeline'ı kırmızıya çevirmez ve her biri incelemede kasıtlı görünür. Bu yüzden hayatta kalırlar. İşte Mjölnir'in gerçek bir örneği okuması:

<p align="center">
  <img src="assets/readme/scan.svg" alt="Demo deposunun CI workflow'u, satır satır okunmuş hâli. Mjölnir her bulguyu raporladığı satırda işaretler; kuralını, neyin yanlış olduğunu, kanıt düzeyini ve ölçülmüş yanlış pozitif oranını gösterir." width="800" />
</p>

<sub>Demo taramasının bu workflow için raporladığı her bulgu, raporlandığı satırda. `npm run docs:readme-brand` ile [`demo-report.json`](assets/readme/demo-report.json) kaynağından üretilir ve CI'da sapmaya karşı kilitlenir.</sub>

**Katı mod.** En agresif tespitler — `.only`, `continue-on-error`, boş testler, tekrar kötüye kullanımı — karantina katında yaşar. Yalnızca `--strict` altında çalışır ve `info` şiddetindedir: işaretlerler, asla engellemezler. Varsayılan tarama (`--strict` olmayan `npx mjolnir-qa@latest`) yalnızca çekirdek ve genişletilmiş kuralları kapsar. Danışmanlık katmanını da istediğinizde `--strict` ekleyin.

Mjölnir test paketini, CI workflow'larını ve varsa gerçek bir çalıştırmanın raporunu okur. Testlerinizi çalıştırmaz, bağımlılıklarınızı kurmaz ve taradığı kodu yürütmez. Kanıtı olmadığında da güven uydurmak yerine bunu açıkça söyler:

| Durum                                                      | Mjölnir'in raporladığı                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Test bildirimi bulunamadı                                  | Puan `null`, **UNKNOWN** olarak gösterilir. Asla uydurma bir 100 değil. |
| Baseline ya da karşılaştırılabilir revizyon yok            | **UNKNOWN**, nedeni belirtilerek. Asla varsayılmış bir 0 değil.         |
| Tarama yarıda kesildi (zaman bütçesi, okunamayan dosyalar) | **PARTIAL**, çıkış `2`. Asla temiz olarak sunulmaz.                     |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Mjölnir nasıl çalışır. Test paketini ve CI pipeline'ını statik olarak, varsa gerçek bir çalıştırmanın raporunu da okur. Her bulguyu kanıt düzeyine ve güven düzeyine göre ağırlıklandırır; L3 ile L5 arasına yalnızca gerçek bir çalıştırma ulaşabilir. Sonuç olarak bulgular, bir güvenilirlik puanı ve donmuş çıkış kodlarıyla bir CI kapısı üretir. Ajan döngüsünde yapay zekâ düzeltmeyi yazar, Mjölnir de kanıtlamak için yeniden tarar." width="880" />
</p>

<sub>Bu sayfa için tasarlandı ve 1:1 gösteriliyor. `npm run docs:readme-brand` ile üretilir ve CI'da sapmaya karşı kilitlenir; puan, sayılar ve kural kimliği [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) ve kural kaydından gelir, asla elle yazılmaz. Aynı görselin poster hâli: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Çalışırken görün

CI workflow'u olan küçük bir Playwright paketi olan [`examples/demo-repo`](examples/demo-repo) üzerinde gerçek bir tarama. Puanlarının nereye gittiği burada:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir'in kesinti dökümü: WORTHINESS 75/100 NEEDS WORK, kategoriye göre puan, önem derecesine göre kesinti kutusu ve bir FIX THIS FIRST listesi" width="520" />
</p>

<sub>`npm run docs:hero` ile gerçek bir taramadan üretilir ve CI'da sapmaya karşı kilitlenir. Aynı taramanın tam `--verbose` raporu [`demo.svg`](assets/readme/demo.svg) dosyasıdır (`npm run docs:demo`).</sub>

<details>
<summary><strong>İzleyin</strong> — bir tarama, yazdırdığı düzeltme ve bunu kanıtlayan yeniden tarama</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Demo kaydından bir kare: npx mjolnir-qa@latest bir terminal penceresinde demo deposunu tarıyor" width="900" />
  </a>
</p>

<sub>`npm run docs:video` ile gerçek bir taramadan kare kare işlendi; asla ekran kaydı alınmadı. [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4) dosyasını açmak için kareyi seçin.</sub>

</details>

### Tek bir bulguya yakından bakış

Her bulgu dört soruyu yanıtlar: nerede olduğu, Mjölnir'in ne kadar emin olduğu, kuralın ne sıklıkla yanıldığı ve nasıl düzeltileceği.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Demo taramasının ilk bulgusu, terminalin yazdırdığı hâliyle birebir, dört bölümü işaretlenmiş olarak: nerede, ne kadar emin, kural ne sıklıkla yanılıyor ve düzeltme." width="100%" />
</p>

`mjolnir explain QA-CI-001` bir kuralın tüm güven kaydını yazdırır; ölçülmüş yanlış pozitif oranı ve bu oranın ona kazandırdığı düzey de dahil:

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

Değer birimi budur: CI'ın hak etmediği bir geçişi raporladığı tek bir yer.

<br />

## Hızlı başlangıç

```bash
npx mjolnir-qa@latest
```

Geçerli dizini tarar ve Trust Report'u yazdırır: ne bulduğunu, ne kadar güvenebileceğinizi, nedenini ve sırada ne yapmanız gerektiğini. Kapı düzeyinde ya da üstünde hiçbir şey bulunmazsa `0` ile çıkar.

CI'da yalnızca dalın getirdiklerini tarayın; böylece eski bir test paketi ilk pull request'inizi boğmaz:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` bunu, ana `v1` etiketine sabitlenmiş [action](https://github.com/Sergey-Bar/Mjolnir#readme) ile bir GitHub Actions workflow'u olarak yazar (ya da `--no-action` ile düz `npx`). Siz engellemesi gerektiğine karar verene kadar tavsiye niteliğinde kalır.

| Komut                               | Ne yapar                                                              |
| ----------------------------------- | --------------------------------------------------------------------- |
| `mjolnir`                           | Trust Report: karar, güven düzeyi, sonraki adım                       |
| `mjolnir --scope changed`           | Yalnızca dalınızın getirdikleri (CI biçimi)                           |
| `mjolnir ci install`                | Tavsiye niteliğindeki PR workflow'unu üretir (action tabanlı)         |
| `mjolnir explain QA-CI-001`         | Ne, neden ve düzeltme; ayrıca ölçülmüş FP oranı                       |
| `mjolnir why src/a.spec.ts:42`      | Tam olarak bu satırın neden işaretlendiği. Asla engellemez.           |
| `mjolnir forensics ./test-results/` | Gerçek bir çalıştırmadan çalışma zamanı kanıtı                        |
| `mjolnir trust-report`              | Kendi içinde bütün Trust Artifact (md + json)                         |
| `mjolnir handoff`                   | Kodlama ajanı için iyileştirme planı                                  |
| `mjolnir --json` / `--format sarif` | Makine tarafından okunabilir çıktı, GitHub Code Scanning              |
| `mjolnir --format codequality`      | GitLab Code Quality raporu (MR widget'ı artefaktı)                    |
| `mjolnir --strict`                  | quarantine düzeyindeki kuralları da çalıştırır (daha yüksek FP riski) |

<details>
<summary><strong>Diğer tüm komutlar</strong> — kararsız test triyajı, raporlama, yönetişim</summary>

<br />

| Komut                               | Ne yapar                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `mjolnir --classic`                 | Trust Report öncesi puan başlığı görünümü                                           |
| `mjolnir explain verdict`           | Kaydedilmiş taramanın kararının neden öyle olduğu                                   |
| `mjolnir triage ./test-results/`    | Rehberli triyaj. Her satır bir sonraki adımla biter.                                |
| `mjolnir pw-report ./test-results/` | Playwright çalıştırma özeti: yeniden denemeler, kararsız testler, en yavaşlar       |
| `mjolnir doctor:playwright`         | Yalnızca Playwright için derin tarama ve Selector Health Score                      |
| `mjolnir fix --dry-run` / `fix`     | Güvenli otomatik düzeltmeler; her biri tuttuğunu kanıtlamak için yeniden taranır    |
| `mjolnir baseline` / `diff`         | Bulguların anlık görüntüsünü alır, sonra yalnızca yeni ya da kötüleşenleri raporlar |
| `mjolnir impact --since <ref>`      | Bir commit'in getirdikleri ve çözdükleri                                            |
| `mjolnir summary`                   | Bir rapordan CI açıklamaları ve step özeti                                          |
| `mjolnir pr-comment`                | Kapsamı sınırlı bir PR yorumu, Markdown olarak                                      |
| `mjolnir debt`                      | Maliyet modelli test borcu kaydı                                                    |
| `mjolnir handover`                  | Yeni bir QA mühendisi için paketin tanıtım haritası                                 |
| `mjolnir init`                      | Framework'leri algılar, bir kurulum kontrol listesi yazdırır                        |
| `mjolnir suppressions`              | Bastırılmış bulguları listeler, yönetişim için                                      |
| `mjolnir rules --unmeasured`        | Ölçüme değil varsayıma dayanarak çalışan kurallar                                   |
| `mjolnir rules --md`                | Tam kural kataloğu (JSON veya Markdown)                                             |
| `mjolnir doctor`                    | Mjölnir'in kendi kural tabanının öz denetimi                                        |
| `mjolnir create-rule <ID>`          | Yeni bir kural ve fixture'ları için iskelet oluşturur                               |
| `mjolnir stats`                     | Görülen düzeltmelerin yerel, tüm zamanlar sayaçları                                 |
| `mjolnir badge`                     | shields.io uç noktası JSON'u ve kod parçası                                         |
| `mjolnir --cache`                   | Yerel bir karar önbelleğiyle artımlı yeniden taramalar                              |
| `mjolnir --format mermaid`          | PR yorumu için test mimarisi diyagramı                                              |

`mjolnir help <command>` her biri için kullanım, örnekler ve sonraki adımı yazdırır.

</details>

Windows, macOS veya Linux üzerinde **Node.js ≥ 22.18** gerektirir. Global kurulumu mu tercih edersiniz? `npm i -g mjolnir-qa`. Bu alt sınır derleme araç zincirinden gelir (tsdown onu hedefler ve sürüm pipeline'ı ona karşı duman testi yapar); çalışma zamanı bağımlılıkları bundan fazlasını gerektirmez.

<br />

## Mjölnir neler bulur

<p align="center">
  <img src="assets/readme/stack.svg" alt="Yığınınızla çalışır: kurallarının kapsadığı diller, test framework'leri ve CI sistemleri, kural kaydından." width="100%" />
</p>

Dört ailede **79 kural** — test hijyeni, test kalitesi, Playwright ve CI bütünlüğü — TypeScript ve JavaScript, Python, Java, C# ve GitHub Actions YAML genelinde. Playwright'ı dört bağlamasının tamamında, ayrıca pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest ve Mocha'yı kapsarlar; Cypress ve Selenium için başlangıç düzeyinde kapsam vardır. Biçimi göstermek için dokuzu:

| ID           | Kural                                                                | Önem    | Düzey      |
| ------------ | -------------------------------------------------------------------- | ------- | ---------- |
| QA-CI-001    | `continue-on-error` başarısız bir doğrulama kapısını maskeler        | error   | quarantine |
| QA-CI-009    | Test çıkış kodu aktarılmıyor (pipefail olmadan `\|`, `;` zincirleri) | error   | extended   |
| QA-TEST-001  | Odaklanmış test commit edildi (`.only`, `fit`)                       | error   | quarantine |
| QA-TEST-003  | Doğrulamasız test                                                    | error   | quarantine |
| QA-TQUAL-009 | await edilmemiş promise doğrulaması                                  | error   | quarantine |
| QA-PW-002    | await edilmemiş locator doğrulaması                                  | error   | core       |
| QA-PW-004    | Kırılgan CSS/XPath seçicileri                                        | warning | quarantine |
| QA-PY-002    | Atlanan test (`skip`, katı olmayan `xfail`)                          | warning | core       |
| QA-CS-103    | Doğrulamasız test metodu                                             | error   | core       |

Tam katalog kayıttan üretilir, asla elle tutulmaz: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) ya da [neleri denetlediği rehberi](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Bu README'de adı geçen tüm kurallar</strong>, tek bir tabloda</summary>

<br />

> `quarantine` kuralları yalnızca `--strict` altında çalışır ve asla engellemez (info düzeyiyle sınırlıdır). Gösterilen önem, yazarın belirlediği önemdir.

| ID           | Aile       | Kural                                                                | Önem    | Düzey      |
| ------------ | ---------- | -------------------------------------------------------------------- | ------- | ---------- |
| QA-TEST-001  | Hijyen     | Odaklanmış test commit edildi (`.only`, `fit`)                       | error   | quarantine |
| QA-TEST-002  | Hijyen     | Atlanan test. İzlenen bir gerekçe olmadan `error` düzeyine yükselir. | warning | quarantine |
| QA-TEST-003  | Hijyen     | Doğrulamasız test                                                    | error   | quarantine |
| QA-TEST-004  | Hijyen     | Sabit sleep (`waitForTimeout`, `sleep()`, `delay()`)                 | warning | extended   |
| QA-TEST-006  | Hijyen     | Kararsızlığı gizleyen retry kötüye kullanımı                         | warning | quarantine |
| QA-TEST-010  | Hijyen     | Boş test gövdesi                                                     | error   | quarantine |
| QA-TQUAL-002 | Kalite     | Totolojik doğrulama                                                  | error   | quarantine |
| QA-TQUAL-009 | Kalite     | await edilmemiş promise doğrulaması                                  | error   | quarantine |
| QA-TQUAL-011 | Kalite     | Yorum satırına alınmış testler                                       | warning | extended   |
| QA-PW-002    | Playwright | await edilmemiş locator doğrulaması                                  | error   | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` commit edildi                         | error   | core       |
| QA-PW-004    | Playwright | Kırılgan CSS/XPath seçicileri                                        | warning | quarantine |
| QA-PW-123    | Playwright | Koda gömülü ortam URL'leri                                           | warning | quarantine |
| QA-PW-140    | Playwright | `maxDiffPixelRatio` olmadan ekran görüntüsü                          | warning | core       |
| QA-CI-001    | CI         | `continue-on-error` başarısız bir kapıyı maskeler                    | error   | quarantine |
| QA-CI-002    | CI         | `\|\| true` çıkış kodlarını yutar                                    | error   | extended   |
| QA-CI-005    | CI         | Rapor kullanılıyor ama hiç üretilmiyor                               | error   | quarantine |
| QA-CI-007    | CI         | Testlerin etrafında retry sarmalayıcıları                            | warning | extended   |
| QA-CI-008    | CI         | Her zaman başarılı olan step hataları maskeler                       | error   | quarantine |
| QA-CI-009    | CI         | Çıkış kodu aktarılmıyor (pipefail olmadan `\|`, `;` zincirleri)      | error   | extended   |
| QA-CI-010    | CI         | Engellemeleri gereken yerde atlanan testler                          | error   | quarantine |
| QA-PY-002    | Python     | Atlanan test (`skip`, katı olmayan `xfail`)                          | warning | core       |
| QA-PY-003    | Python     | Doğrulamasız test fonksiyonu                                         | error   | quarantine |
| QA-PY-005    | Python     | Testlerde `time.sleep()`                                             | warning | extended   |
| QA-PY-012    | Python     | Totolojik doğrulama                                                  | error   | quarantine |
| QA-JV-101    | Java       | Devre dışı bırakılmış test (`@Disabled`)                             | warning | core       |
| QA-JV-102    | Java       | Sabit sleep (`Thread.sleep()`)                                       | warning | extended   |
| QA-JV-103    | Java       | Doğrulamasız test metodu                                             | error   | extended   |
| QA-JV-105    | Java       | Playwright `waitForTimeout()` ile sabit sleep                        | warning | core       |
| QA-JV-106    | Java       | Rol tabanlı locator yerine kırılgan seçici                           | warning | quarantine |
| QA-CS-101    | C#         | Atlanan test (`[Ignore]`, `[Fact(Skip=)]`)                           | warning | core       |
| QA-CS-102    | C#         | Sabit sleep (`Thread.Sleep` / `Task.Delay`)                          | warning | core       |
| QA-CS-103    | C#         | Doğrulamasız test metodu                                             | error   | core       |
| QA-CS-105    | C#         | `WaitForTimeoutAsync()` ile sabit sleep                              | warning | extended   |
| QA-CS-106    | C#         | Rol tabanlı locator yerine kırılgan seçici                           | warning | quarantine |

Python ayrıca QA-PY-001…012 (pytest hijyeni) ve QA-PY-101…108 (Python için Playwright) ile gelir. Cypress ve Selenium'un üçer kurallık başlangıç setleri vardır.

</details>

Her kural bir must-fire **ve** bir must-not-fire fixture'ı ile yayımlanır ve kendi negatif fixture'ında tetiklenen bir kural yayımlanamaz. Bu, yanlış pozitif güvenlik duvarıdır; `mjolnir doctor` bunu bu deponun kendi CI'ında uygular.

### Selector Health Score

`mjolnir doctor:playwright` her locator'ı bir öğeyi nasıl bulduğuna göre derecelendirir: bir kullanıcının yapacağı gibi (rol, etiket, metin), açık bir sözleşmeyle (`data-testid`) ya da yapısal bir tesadüfle (CSS zincirleri, XPath). Her dosya 0 ile 100 arasında bir puan alır:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [█████████████████░░░]  86 / 100
  role/text: 3 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Bu, **doğruluğu değil dayanıklılığı** ölçer. `.btn.btn-primary > div:nth-child(2)` bugün geçer ve biri işaretlemeye dokunana kadar geçmeye devam eder. Düşük bir puan asla testin bozuk olduğunu iddia etmez; yalnızca kimsenin korumayı vaat etmediği işaretlemeye bağlı olduğunu söyler.

<br />

## Güvenilirlik puanı

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="0'dan 100'e güvenilirlik ölçeği, her puanı dolaşan bir işaretçiyle: 50'nin altı UNWORTHY, 50–79 NEEDS WORK, 80–99 WORTHY, 100 FORGED" width="720" />
</p>

<sub>0'dan 100'e her puan, gerçek `deriveScoreState` tarafından yerleştirildi. `npm run docs:gauge` ile üretilir ve CI'da sapmaya karşı kilitlenir.</sub>

| Puan      | Karar                                  |
| --------- | -------------------------------------- |
| `0 – 49`  | **UNWORTHY**                           |
| `50 – 79` | **NEEDS WORK**                         |
| `80 – 99` | **WORTHY**                             |
| `100`     | **FORGED**                             |
| `null`    | **UNKNOWN**: test bildirimi bulunamadı |

**Nasıl hesaplanır.** Önem bir temel kesinti belirler (`error −8`, `warning −3`, `info −1`) ve kanıt düzeyi bunu indirir: E2 tam, E1 yarım (aşağı yuvarlanarak), E0 hiç sayılmaz. Toplam, paketin maruziyetine göre normalleştirilir; yani dosya başına değil test bildirimi başına kesinti. Terminal, puanın kullandığı indirilmiş sayıların aynısını yazdırır; gizli ikinci bir model yoktur. Ayrıntılar: [docs/SCORING.md](docs/SCORING.md) ve [puanlama rehberi](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**100'ün anlamadığı şey.** Yazılımın doğru, paketin yeterli ya da ürünün hatasız olduğu anlamına gelmez. Tek bir anlamı vardır: **Mjölnir'in değerlendirdiği kuralların hiçbiri bu taramada ve bu kanıt modelinde kesinti üretmedi.**

<br />

## Kanıt modeli

Her bulgu iki etiket taşır: Mjölnir'in ne kadar emin olduğu ve bulgunun ne kadar denetlendiği. Kalıp raporlayan bir araçla bir sürümü kapıya bağlayabileceğiniz bir araç arasındaki fark budur.

**Ne kadar emin — kanıt düzeyi.**

| Düzey  | Ad                  | Anlamı                                                | Kesinti |
| ------ | ------------------- | ----------------------------------------------------- | ------- |
| **E2** | Deterministik kanıt | Kusur, kodda yazıldığı hâliyle mevcut                 | Tam     |
| **E1** | Kalıp kanıtı        | Kusurla güçlü biçimde bağlantılı bir kalıp eşleşti    | Yarım   |
| **E0** | Gözlem              | Bilmeye değer. Bir şeyin yanlış olduğu iddiası değil. | Sıfır   |

Bir tespitteki güven, kanıtın gücü değildir. Bir kural aradığını bulduğundan emin olabilir ve yine de bir sezgisel yönteme bakıyor olabilir. E1 bulguları okunmak ve değerlendirilmek içindir, asla körü körüne uygulanmak için değil; bu sınır bulgunun üzerinde terminalde, JSON'da ve ajana devirde işaretlidir.

**Ne kadar denetlendi — güven düzeyi.** Bulguların çoğu kodunuzu okumaktan gelir. Mjölnir'e gerçek bir test çalıştırmasının raporunu verin, kodun gerçekten çalıştığını doğrulayabilsin.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="L0'dan L5'e güven merdiveni. L0–L2 kodu okumaktan gelir; L3–L5 gerçek bir çalıştırma raporu gerektirir, bu da merdivendeki bir kırılmayla işaretlenir." width="100%" />
</p>

| Düzey  | Sade bir dille        | Ne gerektirir                                                      |
| ------ | --------------------- | ------------------------------------------------------------------ |
| **L0** | Not edildi            | Kodu okumak                                                        |
| **L1** | Sorun gibi görünüyor  | Kodu okumak: bir kalıp eşleşti                                     |
| **L2** | Kodda kanıtlandı      | Kodu okumak: kusur yapısal                                         |
| **L3** | Dosya çalıştı         | Bir çalıştırma raporu bulgunun dosyasının yürütüldüğünü gösteriyor |
| **L4** | Test çalıştı          | Bir çalıştırma raporu bulgunun testinin yürütüldüğünü gösteriyor   |
| **L5** | Çalıştırma doğruluyor | Çalıştırmanın kendi sonucu kusur sınıfını doğruluyor               |

Statik bir tarama L2'de durur. Yalnızca gerçek bir çalıştırma raporu (Playwright JSON, Jest veya Vitest JSON, JUnit XML) bir bulguyu L3 ve üstüne çıkarabilir; bu yüzden hiç çalışırken görülmemiş bir bulgu asla çalıştığını iddia edemez. Tanımlar: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Bunun ne kadarı ölçülmüş

**79 kuraldan 74'ünün gerçek OSS koduna karşı ölçülmüş bir yanlış pozitif oranı var** (her biri için en az 10 elle sınıflandırılmış bulgu; bkz. [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Diğer 5'i yazarın tahminiyle yayımlanır ve bunu `mjolnir explain` içinde kural kural söyler. `mjolnir rules --unmeasured` onları listeler ve her tarama altbilgisi, gerçekten _tetiklenen_ kurallardan kaçının ölçülmüş olduğunu bildirir.

Oranlar kötü olduğunda da herkese açık kalır. QA-TEST-001 (commit edilmiş bir `.only`) gerçek depolardaki denetimde kötü sonuç verir ve bu yüzden quarantine'dedir. QA-PW-141 dahil her kuralın güncel sayısı denetimdedir.

### Kural güven düzeyleri

Düzeyler görüşe değil, ölçülmüş yanlış pozitif oranına göre belirlenir:

| Düzey          | Ölçülmüş FP                  | Davranış                                               |
| -------------- | ---------------------------- | ------------------------------------------------------ |
| **core**       | ≤ 10%                        | Varsayılan rapor, engeller                             |
| **extended**   | ≤ 30%                        | Varsayılan rapor, daha düşük güven                     |
| **quarantine** | > 30% veya açıkça bildirilen | Yalnızca `--strict`, info ile sınırlı, asla engellemez |
| _ölçülmemiş_   | n < 10                       | Ölçülene kadar core düzeyine yükseltilemez             |

FP bantları yalnızca bir kademe düşürebilir — açıkça orada bildirilmişse bir kuralı `quarantine` dışına çıkarmaz. Açıkça quarantine'a alınmış bir kural, ölçülen FP oranından bağımsız olarak quarantine'de kalır.

Yükseltme, düşürme ve dil bazında olgunluk: [kural yaşam döngüsü](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Bu neden bir linter değil

Linter'lar kodun kurallara uyup uymadığını söyler. Mjölnir doğrulamanıza güvenilip güvenilemeyeceğini söyler.

|                                                                     | Linter'lar (ESLint, SonarQube) | Kapsam araçları | Yapay zekâ ile kod incelemesi |    **Mjölnir**    |
| ------------------------------------------------------------------- | :----------------------------: | :-------------: | :---------------------------: | :---------------: |
| Ürün kodunu değil, **doğrulama sistemini** puanlar                  |             Hayır              |      Hayır      |             Hayır             |       Evet        |
| CI workflow bütünlüğü (`continue-on-error`, `\|\| true`)            |             Hayır              |      Hayır      |         yalnızca diff         |       Evet        |
| Playwright locator dayanıklılığını derecelendirir (Selector Health) |             Hayır              |      Hayır      |             Hayır             |       Evet        |
| `TRUE-FLAKE` kararları için gerçek çalıştırma verisi okur           |             Hayır              |      Hayır      |             Hayır             |       Evet        |
| Kural başına ölçülmüş bir yanlış pozitif oranı yayımlar             |             Hayır              |      Hayır      |             Hayır             |       Evet        |
| Doğrulamasız testleri işaretler                                     |             Evet\*             |      Hayır      |             bazen             |       Evet        |
| Sabit sleep'leri yakalar (`waitForTimeout`, `time.sleep`)           |             Evet\*             |      Hayır      |             bazen             |       Evet        |
| Deterministik (aynı girdi, aynı çıktı)                              |              Evet              |      Evet       |             Hayır             |       Evet        |
| Tarama başına maliyet                                               |            ücretsiz            |    ücretsiz     |             token             | **sıfır** (yerel) |

<sub>\*`eslint-plugin-jest` ve `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) ile SonarQube'un kendi doğrulama kuralları tarafından kapsanır. Sütunlar, test paketi doğrulaması için varsayılan davranışı tanımlar; eklentiler, ücretli planlar ve özel kurallar bazı yanıtları değiştirir. Bu bir konumlandırma özetidir, kıyaslama değil.</sub>

Yapay zekâ incelemesini de kullanın. Hiçbir kalıbın bulamayacağı nüansları, niyeti ve tasarım kusurlarını yakalar. Mjölnir ise kasıtlı göründüğü için yapay zekâ incelemesinin gözden kaçırdığını yakalar: commit edilmiş bir `.only`, yutulmuş bir çıkış kodu, bir test job'undaki `continue-on-error`. Bunlar akıl yürütme değil tarama gerektirir.

<br />

## Test çalıştırma analizi

Statik analiz hiç çalışmamış kod hakkında akıl yürütür. Çalıştırma analizi ise gerçekte ne olduğunu okur: herhangi bir çalıştırıcıdan Playwright JSON, Jest JSON, Vitest JSON ve JUnit XML.

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

`TRUE-FLAKE` testin yeniden denendiği anlamına gelmez. Testin **en az bir denemede başarısız olup ardından yeşil bittiği** anlamına gelir: son onay işareti ne derse desin işaretlenen şanslı bir geçiş. `mjolnir triage` bu geçmişi bir karantina önerisine dönüştürür, `mjolnir pw-report` ise bir çalıştırmayı özetler. Bulguları L3 ve üzeri güven düzeylerine çıkaran da aynı çalıştırma raporlarıdır.

<br />

## CI bütünlüğü

Bir test geçerken çevresindeki pipeline başarısız olamayabilir. Mjölnir workflow'ları da okur: `continue-on-error`, `|| true`, hiç aktarılmayan çıkış kodları, her zaman başarılı olan step'ler, kullanılan ama hiç üretilmeyen raporlar ve engellemesi gereken olaylarda atlanan kapılar. Her bulgu job'u, step'i ve satırı belirtir ve kendi kanıt düzeyini taşır.

PR workflow'unu üretin, varsayılan olarak tavsiye niteliğindedir:

```bash
mjolnir ci install
```

Ya da Marketplace action'ını mevcut bir workflow'a ekleyin:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

Ana sürüm hattını izlemek için `@v1`'i, tekrarlanabilir bir kapı için ise tam bir etiketi (`@v0.5.32`) sabitleyin. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) Marketplace'i, Smithery'yi ve MCP kayıtlarını kapsar.

Bulguları GitHub Code Scanning'e aktarmak için SARIF yükleyin (workflow veya job kapsamında `security-events: write` gerekir):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

GitLab'de `--format codequality`, MR widget'ının ve diff açıklamalarının okuduğu Code Quality raporunu yazar ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Düzenleyici ve pipeline kurulumu: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Değişen kapsamda atıf

```bash
npx mjolnir-qa@latest --scope changed
```

Bulgular, dalınızın eklediği satırlara **merge-base**'e göre ölçülerek atfedilir. Kapsam, tam bir taramanın keşfettiği dosya kümesinin aynısıdır (TS/JS spec'leri ve adaptör yapılandırmaları, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`); buna commit edilmemiş ve izlenmeyen değişiklikler de eklenir, böylece commit etmeden önce de çalışır. Taban `main → master → origin/main → origin/master → origin/HEAD` sırasıyla çözülür; `--base <ref>` ile geçersiz kılabilirsiniz.

merge-base çözülemediğinde (sığ bir klon, ayrık bir HEAD, git dışında bir hedef), bulgular tüm dosyaya atfa geri döner **ve rapor bunu söyler.** Sessiz bir geri dönüş, bu aracın yakalamak için var olduğu türden bir kusur olurdu.

<br />

## Yapay zekâ ajanları

Bulgular ancak bir şey onlara göre harekete geçerse bir değer taşır.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**Düzeltmeyi yapay zekâ yazar. Mjölnir onu doğrular.** Kanıt yeniden taramadan gelir, asla ajanın kendi başarı raporundan değil.

| Komut             | Ajanın aldığı                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | stdio üzerinden bir [MCP](https://modelcontextprotocol.io) sunucusu. `scan`, `explain` ve `diff` çağrılabilir araçlara dönüşür.                                                       |
| `mjolnir handoff` | Kaydedilmiş bir `--json` raporu deterministik bir Markdown planına dönüşür: neyin tespit edildiği, her bulgunun kanıt sınırı, neyin **değişmemesi** gerektiği ve nasıl doğrulanacağı. |
| `mjolnir install` | Deponuzda zaten bulunan ajan yüzeylerine yazar (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`), böylece ajan bitti demeden önce yeniden tarar.                                        |

Kendi CLI'ı olan bir istemciye ekleyin:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

Ya da `mcpServers` bloğu kabul eden herhangi bir istemciye:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**Korkuluk, kolaylıktan daha önemlidir.** Bir devirdeki her bulgu kendi sınırını taşır. **E2** der ki _deterministik: konumu kontrol edin ve düzeltmeyi uygulayın_. **E1** der ki _ONAY GEREKTİRİR: gözlem tek başına kusuru kanıtlamaz_. E1'i körü körüne düzelten, bir kuralı bastıran ya da puanı yükseltmek için bir kuralı düzenleyen bir ajan, tam da bu aracın yakalamak için var olduğu şeyi yapıyordur; bu yüzden devir bunu prompt'ta, bulgunun hemen yanında söyler.

<br />

## Güven ve güvenlik

**Önce yerel, sıfır telemetri.** `src/` içinde hiçbir yerde ağ yeteneğine sahip bir API (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) yoktur ve [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) biri ortaya çıkarsa derlemeyi başarısız kılar. Ayrıca `eval` ve `new Function` kullanımını da yasaklar. Güvenilmeyen kodu taramak onu asla yürütmez: statik analiz kaynak metni okur, çalıştırma analizi ise diskte zaten bulunan rapor dosyalarını ayrıştırır.

İki çekince: `npx` herhangi bir şey çalışmadan önce paketi kendisi indirir ve bu garanti üçüncü taraf eklentileri değil, `src/`'yi kapsar.

**Eklentiler korumalı alanda çalışmaz.** JS eklentileri (`mjolnir-rules/*.mjs` ya da `"plugins"` altında listelenen npm paketleri) tam Node yetkileriyle çalışır; ESLint ya da Vitest eklentileriyle aynı güven modeli. Onları yüklemek **tarama başına** açıkça seçilmelidir: `--enable-plugins` (veya `MJOLNIR_ENABLE_PLUGINS=1`) olmadan kaynakları asla yüklenmez ve stderr'deki bir bildirim nelerin atlandığını listeler. JSON kural manifestoları kod yürütmez ve core kural kimliği önekleri ayrılmıştır, böylece bir eklenti onlardan birinin kılığına giremez. Güvenlik açıklarını [SECURITY.md](SECURITY.md) üzerinden bildirin.

**Kendi üzerinde çalışır.** Bir doğrulama güven motoru, kendisi doğrulanabilir değilse hiçbir itibara sahip olamaz. Her CI çalıştırması bu depoyu, aynı çalıştırmanın ürettiği derlemeyle tarar. Kapı, error önem düzeyindeki herhangi bir bulguda ve ayrıca **kısmi** bir taramada ya da **çöken bir kuralda** başarısız olur; çünkü hiçbir şey raporlamayan yarım kalmış bir öz tarama, bu projenin yakalamak için var olduğu sahte yeşilin ta kendisidir. `mjolnir doctor` aynı çalıştırmada kural tabanını yeniden denetler (fixture güvenlik duvarı, düzey dürüstlüğü, core düzeyi üst sınırı) ve INCONCLUSIVE sonuçlu bir denetim, başarısız bir denetimle tamamen aynı şekilde başarısız olur. Her iki rapor da derleme artefaktı olarak yüklenir.

### Çıkış kodları ve makine sözleşmesi

Donmuştur; böylece üzerlerine CI mantığı kurabilirsiniz:

| Çıkış kodu | Anlamı                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| `0`        | Temiz: kapı düzeyinde ya da üstünde bulgu yok                             |
| `1`        | Kapı düzeyinde ya da üstünde bulgular                                     |
| `2`        | Kısmi tarama (zaman bütçesi doldu, okunamayan dosyalar). Asla engellemez. |
| `10`       | Kullanım hatası (hatalı bayrak, eksik hedef)                              |
| `20`       | Dahili hata                                                               |

`2` bilinçli olarak `0`'dan farklıdır: bitmeyen bir tarama "hiçbir şey bulmamış" değildir. Yalnızca aramayı bitirmemiştir.

Bir makinenin tükettiği her şey (MCP araç sonuçları, `--json`, SARIF 2.1), sürümlü ve **yalnızca eklemeli** bir şema (`schemaVersion: 1`, `contractVersion: 1`) altındaki tek bir kanonik sonuçtan gelir; böylece hiçbir tüketici anlamı işlenmiş metinden yeniden kurmak zorunda kalmaz. Bkz. [makine sözleşmesi](docs/machine-contract.md). Kural kimlikleri (`QA-<FAMILY>-NNN`) yayımlandıktan sonra değiştirilemez ve asla yeniden kullanılmaz.

<br />

## Mjölnir'in size söyleyemedikleri

- **Testlerinizi çalıştırmaz.** Temiz bir tarama, geçen bir test paketi demek değildir.
- **Bir doğrulamanın _yanlış_ olduğunu söyleyemez.** `expect(total).toBe(41)` sağlıklı görünür. Mjölnir yanlış şeyi denetleyen testleri değil, _başarısız olamayan_ testleri ve _kırmızıya dönemeyen_ pipeline'ları bulur.
- **İş doğruluğunu kanıtlamaz.** Buradaki hiçbir şey ürününüzün gereksinimin istediğini yaptığını söylemez.
- **100, iyi bir test paketinin kanıtı değildir.** Paketinizin gerçek riskinizi kapsayıp kapsamadığı ayrı bir sorudur ve bu araç onu yanıtlamaz.
- **79 kuraldan 5'i ölçülmüş bir orana değil, bir tahmine dayanır.** Her biri bunu kendi bulgusunda söyler.
- **E1, E2 değildir.** Sezgisel bulgular okunmaya değerdir, körü körüne uygulanmaya değil.
- **Boş bir depo `null` alır, asla 100 değil.**
- **Test bildirimi olmayan `*.spec.ts` adlı bir dosya kapsam sayılmaz.** Tek spec dosyaları import ya da tür içeren (sıfır `it`/`test` çağrısı) bir depo 100 değil, `null` alır.

<br />

## Belgeler

Belgelerin tamamı <https://sergey-bar.github.io/Mjolnir/> adresindeki sitede.

| Belge                                                  | İçeriği                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Puan normalleştirme ve kanıt ağırlıklandırma                     |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Kanonik sözcük dağarcığı: kavram başına tek sözcük               |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Ölçülmüş yanlış pozitif oranları ve yöntem                       |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Kural durumları, düzeyler, bastırma, kullanımdan kaldırma        |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver politikası, donmuş yüzeyler, kullanımdan kaldırma döngüsü |
| [docs/machine-contract.md](docs/machine-contract.md)   | Kanonik, makine tarafından okunabilir sonuç                      |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF çıktısı ve düzenleyici ya da CI kurulumu                   |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: Code Quality raporu, MR tarifi, kapı                     |
| [docs/rules/](docs/rules/)                             | Kural başına üretilmiş katalog                                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Geliştirme ortamı ve katkı iş akışı                              |
| [SUPPORT.md](SUPPORT.md)                               | Nerede sorulur, bildirilir ve yardım alınır                      |
| [SECURITY.md](SECURITY.md)                             | Güvenlik açığı bildirimi                                         |
| [CHANGELOG.md](CHANGELOG.md)                           | Sürüm geçmişi                                                    |

### Durum

**Sürüm 1.** JSON şeması ve çıkış kodları donmuş sözleşmelerdir. TypeScript ve Python en geniş ölçülmüş kapsama sahiptir. Java ve C# daha yenidir; onları [olgunluk tablosu](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle) üzerinden değerlendirin. Sırada ne olduğu, uydurma tarihler olmadan: [herkese açık yol haritası](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Katkıda bulunma

Yeni kurallar en kolay ilk katkıdır. Tek bir komut, kuralı must-fire **ve** must-not-fire fixture'larıyla birlikte iskelet olarak oluşturur. Üretilen kural, gerçek tespit yazılana kadar kendi fixture'larında bilerek başarısız olur; çünkü yayımlanan bir taslak, kimsenin ölçmediği bir kuraldır:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Geliştirme ortamı, kalıcı kapı komutları ve anti-creep ile fixture güvenlik duvarı yasaları [CONTRIBUTING.md](CONTRIBUTING.md) içindedir.

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Deponuzda çalıştırın." width="100%" />

```bash
npx mjolnir-qa@latest
```

[Rehberi okuyun](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Belge sitesi](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Testlerin geçip geçmediğini sormayın.<br />
Kanıtın, onların güveni hak ettiğini kanıtlayıp kanıtlamadığını sorun.

<sub>[Sergey Bar](https://www.linkedin.com/in/sergeybar/) tarafından geliştirildi · MIT lisanslı</sub>

</div>
