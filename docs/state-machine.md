# JOKER-C2 State Machine (FSM)

This document defines the deterministic finite state machine (FSM) for **HBCE JOKER-C2 CORE**.

**HBCE = IPR + Fail-Closed Execution + Evidence-by-Design**

JOKER-C2 is a governance runtime. It does not replace AI models; it governs their execution.

---

## Goals

- **Fail-closed by default:** DENY unless all checks PASS.
- **No external execution without ALLOW gate.**
- **Evidence is mandatory:** every request produces an evidence record (ALLOW or DENY).
- **Append-only commit:** evidence is chained and signed; commit failure halts the runtime.

---

## State Definitions

### S0 — BOOT
Initialize runtime and load:
- policy set + policy version
- key material (signing)
- registry endpoint / append-only target
- global kill-switch state

If configuration is missing or invalid → `FAIL_CLOSED`.

---

### S1 — IDENTIFY
Resolve and validate `ipr_subject`:
- subject is active
- subject is not suspended
- subject is compatible with requested domain/scope

If invalid → `DENY`.

---

### S2 — INTAKE
Receive a request payload:
- `intent.kind`
- `intent.summary`
- `scope.domain`
- `scope.tools_allowed`
- optional limits/targets/params

If minimum fields are missing → `DENY`.

---

### S3 — CANONICALIZE
Canonicalize the request deterministically and compute `input_hash`:
- UTF-8
- stable key ordering
- no non-deterministic fields
- strict schema validation

If canonicalization fails → `DENY`.

---

### S4 — POLICY_EVALUATE
Evaluate policy deterministically:
- role/scope permissions
- risk class restrictions
- domain constraints
- limit checks (steps/cost/duration)
- tool allowlist validation

If policy denies → `DENY`.

---

### S5 — SAFETY_GATE
Final fail-closed gate before any execution:
- rate-limit checks
- sandbox requirements
- human-in-the-loop requirement (if policy says so)
- global kill-switch
- conflict detection (duplicate request / replay)

If gate denies → `DENY`.  
If gate allows → proceed.

---

### S6 — PLAN
Build a minimal execution plan constrained by scope:
- tool calls allowed
- preconditions
- rollback plan (if applicable)

Compute `plan_hash`.

If plan exceeds scope → `DENY`.

---

### S7 — EXECUTE
Execute only the approved plan:
- no scope expansion during execution
- collect tool trace
- collect outputs
- compute `output_hash` if output exists

If execution errors:
- if rollback is applicable → `ROLLBACK`
- else → proceed to `EVIDENCE_BUILD` with failure

---

### S8 — ROLLBACK
Best-effort compensation for reversible actions.
Rollback does not delete evidence; it produces additional evidence.

Proceed to `EVIDENCE_BUILD`.

---

### S9 — DENY
No external execution is performed.
A structured denial response is produced and evidence is generated.

Proceed to `EVIDENCE_BUILD`.

---

### S10 — EVIDENCE_BUILD
Build the deterministic evidence record:
- `input_hash`, `plan_hash`, `output_hash`
- policy result + reason codes
- gate result + reason codes
- execution status + tool trace
- timestamps
- chain linkage placeholders
- signature over evidence payload

If evidence build fails → `FAIL_CLOSED`.

---

### S11 — COMMIT_APPEND_ONLY
Append evidence to the immutable registry (append-only):
- resolve `prev_entry_hash`
- compute `entry_hash`
- append
- update chain `height`

If commit fails → `FAIL_CLOSED`.

---

### S12 — FAIL_CLOSED
Terminal safe state:
- halt execution
- emit alert
- require manual recovery / policy reset

---

## Transition Summary

BOOT → IDENTIFY → INTAKE → CANONICALIZE → POLICY_EVALUATE → SAFETY_GATE  
→ (ALLOW) PLAN → EXECUTE → (OK|ERROR) [ROLLBACK?] → EVIDENCE_BUILD → COMMIT → BOOT  
→ (DENY at any step) DENY → EVIDENCE_BUILD → COMMIT → BOOT  
→ (COMMIT_FAIL) FAIL_CLOSED

---

## Non-Negotiable Invariants

1. **No `EXECUTE` without `gate.result == ALLOW`.**
2. **Every request produces evidence** (ALLOW or DENY).
3. **Deterministic canonicalization is mandatory** prior to hashing and policy evaluation.
4. **Commit failure is fatal:** `COMMIT_FAIL → FAIL_CLOSED`.
5. **Scope cannot expand at runtime:** additional scope requires a new request.

---

## Evidence Record Minimum Fields

An evidence record MUST include:
- `request_id`, `ipr_subject`
- `policy.id`, `policy.version`, `policy.result`, `policy.reasons[]`
- `gate.result`, `gate.reasons[]`
- `hashes.input_hash` (+ optional `plan_hash`, `output_hash`)
- `exec.status`, `exec.tool_trace[]` (+ optional `error`, `rollback`)
- `chain.prev_entry_hash`, `chain.entry_hash`, `chain.height`
- `sig.alg`, `sig.by`, `sig.value`

This makes decisions verifiable, suspendable, and auditable.

---
