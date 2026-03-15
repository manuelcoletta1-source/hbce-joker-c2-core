# JOKER-C2 — System Architecture

HBCE — HERMETICUM B.C.E. S.r.l.

---

## Overview

JOKER-C2 is a deterministic governance layer for AI-driven execution.

It does not replace AI models.  
It governs their execution.

The system ensures that any AI-driven action:

- is bound to a valid Identity Primary Record (IPR)
- passes deterministic policy evaluation
- operates under fail-closed constraints
- generates cryptographically verifiable evidence
- is recorded in an append-only public registry

---

## Core Principle

HBCE = IPR + Fail-Closed Execution + Evidence-by-Design

Where:

- **IPR** → binds identity to execution  
- **Fail-Closed** → deny-by-default state machine  
- **Evidence-by-Design** → append-only, signed records  

---

## System Architecture

The HBCE JOKER-C2 system is composed of three canonical repositories.

### 1. hbce-joker-c2-state-machine

Defines the deterministic execution model governing:

- execution states
- transition rules
- guard conditions
- fail-closed behavior
- evidence requirements

Repository role: **formal specification authority**

---

### 2. hbce-joker-c2-core

Reference runtime implementing the execution governance layer.

Responsibilities:

- identity validation (IPR)
- deterministic policy evaluation
- execution gating
- evidence pack generation
- cryptographic signing
- append-only chain verification

Repository role: **execution authority**

---

### 3. hbce-joker-c2-registry

Sovereign public verification layer publishing governance artifacts.

Contents include:

- append-only public ledger
- signed registry snapshots
- keyring and rotation metadata
- revocation lists
- registry head pointer

Repository role: **public verification authority**

---

## Execution Flow

IDENTIFY → VALIDATE IPR → POLICY CHECK → GATE → EXECUTE → EVIDENCE → COMMIT

If any step fails:

execution = DENY evidence = recorded

The system always produces verifiable evidence.

---

## Evidence Model

Each execution generates an **Evidence Pack** containing:

- PACK_MANIFEST.json  
- INPUT_HASHES.json  
- RESULT.json  
- CHAIN_ENTRY.json  
- SIGNATURE.ed25519  
- SIGNATURE_META.json  

These artifacts allow independent verification of:

- execution integrity
- policy outcome
- registry inclusion
- cryptographic authenticity

---

## Trust Model

Root of trust:

Registry GENESIS

Verification chain:

GENESIS → keyring → signature verification → evidence pack → append-only ledger

If verification fails, the system must **fail-closed**.

---

## Security Principles

The JOKER-C2 architecture follows five design constraints:

1. Deterministic execution
2. Fail-closed validation
3. Cryptographic evidence
4. Append-only history
5. Public verifiability

The public registry stores **no personal data**.

---

## Governance

JOKER-C2 is developed and maintained by:

**HBCE Research**  
HERMETICUM B.C.E. S.r.l.

---

## Status

Architectural definition of the JOKER-C2 governance system.






