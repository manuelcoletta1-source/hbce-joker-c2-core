# JOKER-C2 — Protocol Specification

HBCE — HERMETICUM B.C.E. S.r.l.

---

## Abstract

JOKER-C2 defines a deterministic governance protocol for AI-driven execution.

The protocol ensures that every AI-assisted action is:

- identity-bound
- policy-governed
- cryptographically attestable
- append-only recorded
- independently verifiable

The protocol does not replace AI models.  
It governs their execution.

---

## Core Concept

The protocol follows a deterministic execution model:

IDENTITY → VALIDATION → POLICY → EXECUTION → EVIDENCE → REGISTRY

Every execution produces a verifiable artifact.

---

## System Components

The protocol is implemented across three canonical repositories.

### State Machine

Repository:

hbce-joker-c2-state-machine

Defines:

- execution states
- transition rules
- guard conditions
- evidence contract

The state machine defines the valid operational grammar of the system.

---

### Core Runtime

Repository:

hbce-joker-c2-core

Implements:

- identity validation
- policy evaluation
- execution gating
- evidence pack generation
- cryptographic signing
- append-only chain verification

The runtime enforces deterministic execution.

---

### Public Registry

Repository:

hbce-joker-c2-registry

Publishes:

- append-only ledger
- signed registry snapshots
- keyring metadata
- revocation lists
- registry head pointer

The registry provides public verification.

---

## Execution Protocol

Every execution follows the same deterministic procedure.

Step 1 — Identity binding

An Identity Primary Record (IPR) must be provided.

Step 2 — Validation

The runtime validates the identity and execution request.

Step 3 — Policy evaluation

The policy engine evaluates whether the requested action is allowed.

Step 4 — Execution gate

If validation and policy succeed:

ALLOW → execution continues

If validation or policy fail:

DENY → execution stops

Evidence is still recorded.

Step 5 — Evidence generation

The system produces a deterministic Evidence Pack.

Step 6 — Registry commit

The evidence hash is appended to the public ledger.

---

## Evidence Pack Structure

Each execution generates an Evidence Pack containing:

- PACK_MANIFEST.json
- INPUT_HASHES.json
- RESULT.json
- CHAIN_ENTRY.json
- SIGNATURE.ed25519
- SIGNATURE_META.json

These artifacts allow independent verification.

---

## Verification Procedure

Verification requires the following sequence:

1. verify registry GENESIS
2. verify keyring
3. check revocation list
4. verify signature
5. verify evidence hashes
6. verify ledger chain

Only if all steps succeed is the execution valid.

---

## Fail-Closed Execution

JOKER-C2 follows a strict fail-closed model.

If any verification step fails:

execution must be considered invalid.

The system never executes under uncertain conditions.

---

## Privacy Model

The public registry contains:

- hashes
- signatures
- public keys
- verification metadata

The registry stores **no personal data**.

Identity binding occurs outside the public registry.

---

## Security Properties

The protocol guarantees:

- deterministic execution
- append-only history
- cryptographic authenticity
- independent verification
- fail-closed validation

---

## Governance

The JOKER-C2 protocol is developed within the HBCE research framework.

Maintained by:

HBCE Research  
HERMETICUM B.C.E. S.r.l.

---

## Status

Technical specification of the JOKER-C2 execution governance protocol.
