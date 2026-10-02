---
name: skill-supply-chain
description: Use before installing or trusting any agent skill or MCP server from outside this repository, and when deciding whether to add a skill-security scanner as a CI gate. Covers the scan procedure, the risk categories that matter for skills specifically, and what an agent is allowed to do with a scan result.
---

# Agent skill supply chain

An agent skill is code that runs with the agent's permissions and is loaded
from its `description` alone — no signature, no review, minimal vetting. That
makes a skill a supply-chain artefact whether or not it ships a script.

NVIDIA's measurements on a 31,132-skill corpus: **26.1 % of skills contain
vulnerabilities and 5.2 % show likely malicious intent.** The modal cases are
not exploits. They are instructions.

## Scan before install, not after

```
uv tool install git+https://github.com/NVIDIA/skillspector.git
skillspector scan <path-or-URL-or-zip> --no-llm
```

`--no-llm` is the static pass and needs no credentials. Start there. Add
semantic analysis only when the static result is ambiguous — it costs money and
a slow run.

Wiring it as an MCP tool, so a scan can gate an install inside the session
rather than being a step someone remembers to do:

```
uv tool install --force 'skillspector[mcp] @ git+https://github.com/NVIDIA/skillspector.git'
```

```jsonc
// kilo.json — local stdio server, alongside the existing remote `sentry` entry
"skillspector": { "type": "local", "command": ["skillspector", "mcp"], "enabled": true }
```

It exposes one tool, `scan_skill(target, use_llm, output_format)`, returning
`risk_score` (0–100), `severity`, `recommendation`, `safe_to_install` and
`findings`. **Only add this entry once the binary is on PATH** — a configured
server that cannot start is a broken session, and a guard that is always off is
worse than no guard.

For CI, `skillspector scan` emits SARIF, and the exit code is a contract:
`0` safe or caution, `1` over threshold or an active finding, `2` error.

## The categories that matter for skills

Seventy-one patterns across seventeen categories. Five groups carry almost all
the real risk for something you are about to install:

| Group | Why it matters |
| --- | --- |
| **Trigger abuse** (`TR1`–`TR3`) | A skill whose trigger is a common word fires on unrelated tasks; one that shadows a built-in command takes over `/name`. This is the *shape* of the problem this repository has with large skill installs. |
| **Excessive agency** (`EA1`–`EA5`) | Unrestricted tool access, autonomous high-impact decisions, capabilities wider than the stated purpose. |
| **Memory poisoning** (`MP1`–`MP3`) | Content designed to persist across interactions, or to displace other instructions. |
| **Exfiltration** (`E1`–`E4`, `TT1`–`TT5`) | Env harvesting, file enumeration, or data reaching a network sink. |
| **Anti-refusal** (`AR1`–`AR3`) | Instructions to never refuse, to drop disclaimers, or to treat guardrails as absent. |

A skill that scans clean but carries a suspiciously broad `description` is
still the `TR1` case. The scanner reads patterns; the description is the
trigger surface and it deserves a human read.

## Scan this repository's own skills

```
skillspector scan .claude/skills --no-llm
```

Accept known findings into a committed baseline so a re-scan surfaces only new
ones, and read the diff each time:

```
skillspector baseline .claude/skills -o .skillspector-baseline.yaml
skillspector scan .claude/skills --baseline .skillspector-baseline.yaml
```

Evidence-bound, which is the property that matters: change the scanned source
or the scanner version and the finding goes active again until it is reviewed.

## Before it becomes a gate

A CI gate is governed surface growth. `CLAUDE.md` law 0 requires an
equal-size removal or an `ANTI-CREEP-EXCEPTION` with the reason — the same
interlock every other capability addition meets. Read the `surface-law` skill
before proposing it, and state which existing check the new gate would have
caught instead. During 6.0 the answer was six real defects for the gates that
were nearly cut, which is the standard a new gate has to meet.

If it is added as a gate, the honest question is whether it belongs in the PR
path at all. It gates *installing a skill*, which is a rare event, so a
targeted workflow triggered on changes under the skill directories may serve
better than a permanent leaf in `npm run check` — and the twelve-leaf ceiling
means adding it there costs something real.

## Reading a result

- `safe_to_install: false` — do not install. Do not "look at it anyway".
- A finding you can name from the source is adjudicated; a finding you cannot
  explain is not dismissed, it is triaged and recorded.
- Suppress with a reason, the way this repository suppresses a rule finding —
  in a baseline with the reason attached, never by ignoring the category.
- A clean scan is evidence about *patterns*. It is not a guarantee, and
  reporting it as one is the failure the `evidence` skill exists to prevent.

## Attribution

Scanner: [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector)
(Apache-2.0), part of the NVIDIA Verified Skills pipeline. The corpus figures
are theirs; re-check them against the current release rather than quoting this
file as the source.