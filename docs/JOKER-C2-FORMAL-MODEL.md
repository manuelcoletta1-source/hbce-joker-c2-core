# JOKER-C2 — Formal Model

HBCE — HERMETICUM B.C.E. S.r.l.

---

## Overview

This document defines the formal execution model of the JOKER-C2 governance system.

JOKER-C2 can be modeled as a deterministic state transition system that governs AI-driven execution.

The system binds identity, policy evaluation and evidence generation into a single verifiable execution chain.

---

## System Definition

Let the system be defined as:

J = (S, E, T, P, I, R)

Where:

S = set of execution states  
E = set of execution events  
T = state transition function  
P = policy evaluation function  
I = identity binding function (IPR)  
R = registry append function

---

## Execution States

Typical execution states include:

- INIT
- IDENTIFIED
- VALIDATED
- POLICY_EVALUATED
- ALLOWED
- DENIED
- EXECUTED
- EVIDENCE_GENERATED
- COMMITTED

State definitions are formally specified in:

hbce-joker-c2-state-machine

---

## State Transition Function

The transition function is defined as:

T : (S, E) → S

Meaning:

given a current state and an event, the system deterministically produces the next state.

Transitions must follow the canonical state machine definition.

Invalid transitions must be rejected.

---

## Identity Binding

Every execution must be bound to an Identity Primary Record.

Identity binding function:

I : request → IPR

The IPR provides deterministic attribution of execution.

If identity validation fails, the system transitions to:

DENIED

---

## Policy Evaluation

Policy evaluation determines whether an execution is permitted.

Policy function:

P : (IPR, request) → {ALLOW, DENY}

Policy evaluation must be deterministic.

If evaluation returns DENY, execution does not proceed.

Evidence must still be produced.

---

## Execution Gate

The execution gate is defined as:

G = ALLOW if validation and policy evaluation succeed  
G = DENY otherwise

The system must operate under fail-closed conditions.

If validation cannot be completed, the result is DENY.

---

## Evidence Generation

After execution gating, the system generates an Evidence Pack.

Evidence function:

EVIDENCE : execution → pack

Evidence Pack includes:

- execution hashes
- execution result
- signature
- metadata
- ledger reference

Evidence must be cryptographically signed.

---

## Registry Commit

Evidence must be appended to the public verification registry.

Registry function:

R : pack → ledger_entry

The ledger must be append-only.

Each entry must contain:

- entry hash
- previous entry hash
- evidence reference
- signature metadata

---

## Verification Model

Verification can be modeled as:

V : ledger_entry → {VALID, INVALID}

Verification requires:

- signature verification
- key validity
- revocation check
- ledger chain continuity
- evidence hash verification

If any verification step fails, the entry must be rejected.

---

## Fail-Closed Property

The system follows a fail-closed model.

If any component of the execution chain fails:

- identity validation
- policy evaluation
- signature verification
- ledger continuity

the execution must be considered invalid.

---

## Deterministic Property

For identical inputs:

(IPR, request, policy_state)

the system must produce identical results:

(state transitions, evidence pack, registry entry).

This property guarantees reproducibility.

---

## Security Properties

The formal model ensures:

- deterministic execution
- identity attribution
- cryptographic authenticity
- append-only history
- independent verification

---

## Governance

The formal model is part of the JOKER-C2 technical framework maintained by:

HBCE Research  
HERMETICUM B.C.E. S.r.l.
