# Append-Only Evidence Chain (HBCE)

This document defines the deterministic rules for the **HBCE JOKER-C2 CORE** append-only evidence chain.

The chain is designed for:
- integrity verification
- auditability
- fail-closed operation

Evidence records are immutable once committed.

---

## Core Rules

1. **Append-only:** no updates, no deletes.
2. **Fail-closed:** if commit cannot be completed, runtime MUST halt (`FAIL_CLOSED`).
3. **Deterministic hashing:** the same payload must always produce the same hash.
4. **Signed evidence:** every committed record MUST be cryptographically signed.

---

## Canonical JSON

All hashes MUST be computed from **canonical JSON**:

- UTF-8 encoding
- stable key ordering (lexicographic)
- no trailing whitespace
- no non-deterministic fields (no random ordering, no local-only timestamps injected after hashing)
- `additionalProperties: false` where schemas apply

If canonicalization fails → evidence build fails → runtime enters `FAIL_CLOSED`.

---

## Hash Algorithm

Default:
- `SHA-256` (hex lowercase recommended; hex uppercase accepted if consistently enforced)

---

## Chain Linkage Model

Each evidence record includes a `chain` object:

- `prev_entry_hash`: hash of the previous committed evidence record (or `null` for genesis)
- `entry_hash`: hash of the current record (computed deterministically)
- `height`: monotonic index starting from 0 at genesis

Genesis is defined by `registry/genesis.json`.

---

## Entry Hash Computation

To avoid self-referential hashing issues, `entry_hash` MUST be computed over an evidence payload that excludes `entry_hash` itself.

### Recommended method

1. Build `evidence_payload` from the evidence schema, with:
   - `chain.prev_entry_hash` set
   - `chain.height` set
   - `chain.entry_hash` temporarily set to a fixed placeholder (e.g. `"__PENDING__"`), or omitted for hashing

2. Canonicalize the payload.

3. Compute:

`entry_hash = SHA-256(canonical_json(evidence_payload_without_entry_hash))`

4. Insert `entry_hash` into the final evidence record.

This avoids self-referential hashing and ensures determinism.

---

## Input / Plan / Output Hashes

Separate hashes MAY be stored under `hashes`:

- `input_hash = SHA-256(canonical_json(request))`
- `plan_hash = SHA-256(canonical_json(plan))` (optional)
- `output_hash = SHA-256(canonical_json(result))` (optional)

These hashes are not the chain anchor by themselves, but they strengthen auditability.

---

## Signature Requirements

Each committed record MUST include:

- `sig.alg = "ed25519"`
- `sig.by` identifier for the signer (e.g. `JOKER-C2`)
- `sig.value` signature bytes (base64 or hex, but MUST be consistent and documented)

### What is signed?

Recommended:
- sign the canonical JSON of the evidence payload **excluding `sig.value`**.

If signature verification fails, the record MUST be rejected.

---

## Commit Semantics (Fail-Closed)

A commit is considered successful only if:

- evidence record passes schema validation
- `prev_entry_hash` matches the latest committed record
- `entry_hash` matches deterministic computation
- signature verifies
- record is appended to the registry storage

If any of the above fails → `COMMIT_FAIL` → `FAIL_CLOSED`.

---

## Verification Procedure (Audit)

Given a sequence of committed evidence records:

1. Validate each record against `schemas/evidence_record.json`
2. Recompute `entry_hash` deterministically
3. Verify signature
4. Check that each record's `prev_entry_hash` equals the previous record's `entry_hash`
5. Check that `height` increments by +1

If any check fails → chain integrity is broken and MUST be treated as invalid.

---
