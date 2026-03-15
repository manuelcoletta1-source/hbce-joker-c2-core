# JOKER-C2 — Documentation

HBCE — HERMETICUM B.C.E. S.r.l.

This directory contains the official architectural documentation of the JOKER-C2 system.

JOKER-C2 is a deterministic governance layer for AI-driven execution built around identity binding, fail-closed validation and cryptographically verifiable evidence.

---

## Documentation Structure

### System Architecture

Defines the overall architecture of the JOKER-C2 system and the relationship between the canonical repositories.

File:

JOKER-C2-SYSTEM-ARCHITECTURE.md

---

### Trust Model

Defines the trust foundation of the system including:

- registry GENESIS
- keyring verification
- revocation model
- append-only ledger verification
- fail-closed validation

File:

JOKER-C2-TRUST-MODEL.md

---

### Repository Constitution

Defines the canonical boundaries and responsibilities of the repository triad:

- state-machine
- core
- registry

File:

JOKER-C2-REPOSITORY-CONSTITUTION.md

---

### Roadmap

Describes the development phases of the JOKER-C2 system from experimental runtime to operational infrastructure.

File:

JOKER-C2-ROADMAP.md

---

## Canonical Repository Triad

The JOKER-C2 architecture is composed of three repositories.

hbce-joker-c2-state-machine  
Formal specification of states, transitions and guard conditions.

hbce-joker-c2-core  
Execution runtime implementing deterministic governance of AI actions.

hbce-joker-c2-registry  
Public append-only verification registry.

---

## Governance

JOKER-C2 is developed and maintained within the HBCE research framework.

HBCE Research  
HERMETICUM B.C.E. S.r.l.
