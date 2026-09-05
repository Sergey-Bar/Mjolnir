# Demo videos

Two videos, both generated — never screen-recorded, never mocked up.

| File                                    | What it is                                                     | Where it lives          |
| --------------------------------------- | -------------------------------------------------------------- | ----------------------- |
| `mjolnir-demo.mp4`                      | 42s hero loop: one false-green CI gate found, fixed, re-proved | committed (README hero) |
| `mjolnir-demo-poster.png`               | Poster frame for the hero                                      | committed               |
| `mjolnir-tour.mp4`                      | 86s tour: scan → `explain` → `forensics`                       | GitHub Release asset    |
| `script.demo.json` · `script.tour.json` | The committed evidence both are rendered from                  | committed               |
| `fixtures/ci.fixed.yml`                 | The workflow after the fix the tool prints                     | committed               |
| `fonts/`                                | The vendored render stack, with licenses                       | committed               |

## Why this is built the way it is

`CLAUDE.md` forbids asserting verification quality the evidence does not
carry. A demo video is a claim about what the tool does, so it is built to
the same standard as every other generated asset here: real execution in,
rendered pixels out, with a contract in between.

```
real Mjölnir execution
        │  scripts/video/capture.ts        ← evidence
        ▼
script.{demo,tour}.json
        │  tests/contract/video-script.spec.ts   ← runs in the standing gate
        ▼
deterministic renderer (Chromium, stepped by frame index)
        │  scripts/video/render.ts         ← presentation
        ▼
MP4 + poster
        │  tests/contract/video-media.spec.ts
        ▼
human review                                ← not automatable, not skipped
```

The renderer may only draw what is in a validated script. It never invents
CLI output.

## What is and is not guaranteed

| Layer              | Claim                                                                                                          | Scope                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Content**        | The same scan of the same fixture produces the same captured output, after one documented timing normalization | any machine                |
| **Timeline**       | Frames are a pure function of (script, pinned pacing, frame index) — no clock, no RNG                          | any machine                |
| **Pixels / bytes** | Identical MP4 bytes                                                                                            | **this pinned stack only** |

Rendering twice in one environment gives identical bytes. That is not a
promise that another machine's Chromium rasterizes sub-pixels the same way,
and nothing here claims it does.

## Regenerating

```bash
npm run docs:video:glyphs    # every glyph resolves in a vendored face
npm run docs:video:capture   # re-run Mjölnir, rewrite the scripts
npm run docs:video:render    # scripts → MP4 + poster  (needs ffmpeg + Chromium)
npm run docs:video           # capture then render
npx tsx scripts/video/render.ts demo --preview=140   # one frame, no encode
```

`ffmpeg` is not a dependency of this repo — an ~80MB binary in
devDependencies would tax every `npm ci` to serve one opt-in script. It is
resolved from `$MJOLNIR_FFMPEG` or `PATH`, and its absence is reported with
instructions. Playwright's bundled ffmpeg will not work: it is built
`--disable-everything` with VP8/WebM only, no H.264 and no MP4 muxer.

`.github/workflows/demo-video.yml` runs all of this on manual dispatch.

## The fonts, and why there are two

`scripts/video/check-glyphs.ts` reads the vendored files' own character
maps and fails before rendering if anything the reporter prints has no
glyph — a tofu box where the hammer should be is the video misrepresenting
the CLI.

JetBrains Mono (the brand's code face) covers 132 of the 138 required
glyphs, including all box drawing and block elements. It does **not** cover
the Runic block or `ℹ` U+2139, and `src/reporter/art.ts` puts `ᚦ` and `ᚹ` on
the hammer in every score state above critical. GNU FreeMono supplies those
six and is itself monospace, so the runes land on the same character grid.

Both faces are embedded as base64 data: URIs at render time. Nothing is
fetched, and nothing is taken from whatever fonts the host has installed.

## Note on GitHub playback

GitHub does not play a repo-relative `.mp4` in a `<video>` tag — only files
on its own user-content CDN. The README therefore links the poster to the
file. For true inline playback, drag the MP4 into any issue comment, copy
the `user-images.githubusercontent.com` URL it returns, and use that in a
`<video>` tag. That is a manual workaround, not the artifact strategy.
