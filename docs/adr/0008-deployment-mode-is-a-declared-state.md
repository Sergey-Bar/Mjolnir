# ADR 0008 — Deployment mode is a machine-readable state

**Status:** accepted · **Amends:** A8 · **Affects:** config, CLI,
`action.yml`, hosted code paths, threat model, claim registry

## Context

The repository has an **unresolved telemetry decision**, tracked as two
separate open items:

- `MATRIX-PERMISSION-OPTIONAL-TELEMETRY` — `BLOCKED`, with an owner and
  a revisit trigger, and nothing that reads it.
- `GAP-M26-014` — the same unresolved question as a gap.

The product also has a hard-won, well-documented property: **core
scanning must never require source upload** (zero-network default, with
`tests/adversarial/` and `tests/forensics/hostile-repo.spec.ts` proving
it).

Both of those facts are currently **prose**. `docs/VERSIONING.md:49`
documents the plugin threat model in words; the deployment story has no
name, no schema, and therefore nothing a gate can check.

The v6 spec requires that deployment modes be a **declared,
machine-readable state**, and that a `LOCAL_ONLY` run _refuse_ hosted
actions by construction rather than by promise.

## Decision

**Deployment mode is a machine-readable, declared state with a closed
enum, and it gates hosted code paths structurally.**

| Mode          | Meaning                                                | Hosted actions                                                               |
| ------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `LOCAL_ONLY`  | Nothing leaves the machine. The default.               | **refused by construction**                                                  |
| `SELF_HOSTED` | Mjölnir runs inside the customer's own infrastructure. | permitted against the customer's own instance only                           |
| `CLOUD`       | Mjölnir's hosted services are in use.                  | permitted, subject to §4.5 governance                                        |
| `AIR_GAPPED`  | No network egress at all, by policy.                   | refused; network-dependent analysis renders `BLOCKED` with a recorded reason |

Rules:

1. **The enum is closed and versioned.** `LOCAL_ONLY` is the default
   when unset. An unknown value is a `CONFIG_ERROR`, never a silent
   fallback to permissive.
2. **`LOCAL_ONLY` refuses hosted code paths structurally** — not with a
   runtime `if` that a future edit can forget, but because the hosted
   client is only constructed when the mode permits it. A `LOCAL_ONLY`
   process has no hosted client in memory.
3. **A refusal is a first-class outcome, not an error.** A hosted action
   under `LOCAL_ONLY` renders the refusal with the mode, the requested
   action and the command that would enable it. It is never silently
   skipped.
4. **The telemetry decision becomes a registry entry with an owner**,
   not a paragraph. Until the owner decides, the _state_ is
   `LOCAL_ONLY` (no collection) and the _open question_ is recorded as a
   capability-registry entry with `maturity: M1 DECLARED` and a
   `nextLevelGap`. Recording the open question as a first-class entry is
   what stops it from being forgotten; recording it as a _permission_ is
   what would be dishonest.
5. **What leaves the machine is documented per action**, not per
   product. Each capability that can egress declares its egress
   footprint in the registry. A capability with an egress footprint and
   no declaration is a registry error.
6. **The mode is bound into the proof.** Every artifact records the mode
   it ran under, so an artifact from a `CLOUD` run can never be
   presented as a `LOCAL_ONLY` run's proof.

## Consequences

**Forbids**

- A hosted network call reachable from a `LOCAL_ONLY` process.
- Telemetry, analytics, crash reporting or update checks enabled by
  default in any mode.
- Prose-only statements about what leaves the machine.
- An unknown/unset mode defaulting to anything but `LOCAL_ONLY`.

**Costs**

- A configuration surface the user must be aware of, in a product whose
  selling point is "it just works". Mitigated by the default: a user who
  configures nothing gets the safe mode and never sees the setting.

## Rejected alternatives

| Alternative                              | Why rejected                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Keep it as prose in `docs/VERSIONING.md` | A promise in a document cannot be enforced; the plugin threat model is exactly the case that shows why (residual risk `R4`). |
| Opt-in telemetry with no mode enum       | "Opt-in" without a declared state is a policy, not a mechanism — a future edit can make it default-on.                       |
| Infer the mode from the environment      | Implicit inference is the definition of an undeclared state. The mode must be declared.                                      |
| Resolve the telemetry question now       | Not ours to decide; it is the owner's. What we owe is a _state_ and a _registry entry_ so the question cannot rot silently.  |

## Enforcement

| Mechanism             | Location                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Closed enum           | `src/v6/deployment-mode.ts` (Wave 1) + `schemas/v6/deployment-mode.schema.json`                       |
| Structural refusal    | Hosted client construction gated on mode; a test asserts no hosted client exists under `LOCAL_ONLY`   |
| Proof binding         | Every artifact carries its mode; `proof:bundle:verify` (P3) checks it                                 |
| Egress declaration    | `src/v6/capability-registry.ts` — an egressing capability without a declaration is a registry error   |
| Open question tracked | `docs/claim-registry.json` + the capability registry entry for telemetry, with owner + `nextLevelGap` |
| Threat model          | `enterprise:threat-model` gate, extended for the mode enum                                            |
