# JOKER-C2 — Trust Model

HBCE — HERMETICUM B.C.E. S.r.l.

---

## Overview

The JOKER-C2 trust model defines how execution integrity, identity binding, and evidence verification are established across the system.

Trust in JOKER-C2 is not based on hidden infrastructure or private authority.

Trust emerges from deterministic execution rules, cryptographic signatures, and publicly verifiable append-only records.

---

## Root of Trust

The root of trust of the system is the **Registry GENESIS**.

GENESIS defines:

- the initial registry state
- the first valid keyset
- the initial cryptographic anchors
- the initial verification conditions

All subsequent registry states must be verifiable starting from GENESIS.

If GENESIS verification fails, the system must **fail-closed**.

---

## Key Authority

The registry publishes the **public keyring** used to verify signatures produced by the JOKER-C2 runtime.

The keyring includes:

- public keys
- key fingerprints
- key activation metadata
- rotation history

Private keys are never committed to the registry.

---

## Key Rotation

Key rotation is supported through append-only updates to the keyring.

A valid rotation requires:

- a new public key entry
- a signed registry update
- traceable continuity with the previous keyset

If key rotation metadata is inconsistent, verification must fail.

---

## Key Revocation

Revoked keys are recorded in the **revocations list**.

Verification systems must:

- check the keyring
- check the revocation list
- verify that the signing key is active at the time of execution

If a revoked key is used, verification must fail.

---

## Evidence Verification

Every execution produces an **Evidence Pack** signed using an active key.

Verification requires:

1. verifying the signature
2. verifying the key fingerprint
3. verifying the execution hashes
4. verifying the append-only ledger entry

If any check fails, the evidence must be rejected.

---

## Ledger Integrity

The public registry maintains an append-only ledger.

Each ledger entry contains:

- entry hash
- previous entry hash
- evidence reference
- signature metadata

This structure ensures deterministic chain verification.

If the chain continuity is broken, the registry must be considered invalid.

---

## Snapshots

Signed snapshots provide periodic verification anchors for the registry.

Snapshots allow independent auditors to verify:

- registry state
- ledger continuity
- keyring integrity
- revocation consistency

Snapshots are public and verifiable.

---

## Verification Model

Verification proceeds in the following order:

GENESIS  
→ keyring verification  
→ revocation check  
→ signature verification  
→ evidence pack verification  
→ ledger chain verification

Only if all steps succeed is the execution considered valid.

---

## Fail-Closed Principle

JOKER-C2 follows a strict **fail-closed verification model**.

If verification cannot be completed, the system must assume the execution is invalid.

No partial trust is allowed.

---

## Privacy Model

The public registry stores **no personal data**.

Registry contents include only:

- hashes
- signatures
- public keys
- verification metadata

All identity binding occurs outside the public registry.

---

## Governance

The JOKER-C2 trust model is part of the official HBCE governance framework.

Maintained by:

**HBCE Research**  
**HERMETICUM B.C.E. S.r.l.**
