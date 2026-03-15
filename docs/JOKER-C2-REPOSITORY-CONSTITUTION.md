# JOKER-C2 — Repository Constitution

HBCE — HERMETICUM B.C.E. S.r.l.

---

## Purpose

This document defines the canonical repository boundaries of the HBCE JOKER-C2 system.

The goal is to preserve architectural clarity, deterministic execution, and fail-closed governance across the official repository triad.

---

## Canonical Repository Triad

The JOKER-C2 system is composed of three canonical repositories:

- `hbce-joker-c2-state-machine`
- `hbce-joker-c2-core`
- `hbce-joker-c2-registry`

Each repository has a distinct authority and must not duplicate the responsibilities of the others.

---

## 1. hbce-joker-c2-state-machine

Authority: **Formal Specification**

This repository defines the deterministic execution model of JOKER-C2.

Contents include:

- execution states
- transition rules
- guard conditions
- fail-closed behavior
- evidence contract

Allowed contents:

- machine definitions
- guard specifications
- evidence requirements
- state transition documentation

Forbidden contents:

- runtime execution logic
- private keys
- operational secrets
- public registry data
- model adapters

Rule:

The state machine defines what transitions are valid.  
The runtime must conform to it.

---

## 2. hbce-joker-c2-core

Authority: **Execution Runtime**

This repository implements the governance runtime controlling AI execution.

Responsibilities include:

- identity validation (IPR)
- deterministic policy evaluation
- execution gating
- evidence pack generation
- cryptographic signing
- append-only chain validation

Allowed contents:

- runtime implementation
- policy evaluation logic
- evidence pack generation
- signing and verification tools
- execution examples

Forbidden contents:

- canonical state definitions
- registry governance artifacts
- private keys
- duplicated public ledger history

Rule:

The core executes actions only within the constraints defined by the state machine.

---

## 3. hbce-joker-c2-registry

Authority: **Public Verification**

This repository publishes public governance artifacts required for independent verification.

Contents include:

- append-only public ledger
- signed registry snapshots
- keyring metadata
- revocation lists
- registry head pointer

Allowed contents:

- public keys
- signatures
- digests
- verification metadata

Forbidden contents:

- private keys
- runtime secrets
- execution engine logic
- policy engine logic
- personal data

Rule:

The registry exposes verification artifacts but does not execute operations.

---

## Repository Authority Order

The canonical authority order of the system is:

state-machine  
→ core  
→ registry

Meaning:

- the state machine defines valid transitions
- the core executes under those rules
- the registry publishes verifiable evidence

---

## Cross-Repository Rules

The following rules apply across all repositories:

1. No repository may redefine the authority of another repository.
2. Private keys must never be committed.
3. The public registry must contain no personal data.
4. The runtime must not invent state transitions outside the canonical state machine.
5. Registry artifacts must remain append-only.

---

## Governance

This repository constitution forms part of the official JOKER-C2 architectural framework.

Maintained by:

**HBCE Research**  
**HERMETICUM B.C.E. S.r.l.**
