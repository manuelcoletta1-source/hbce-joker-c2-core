# Linux Quickstart (Chromebook / Debian)

This guide runs the HBCE JOKER-C2 CORE reference runtime on Linux and produces
an append-only evidence ledger.

Target environment:
- Chromebook Linux container (penguin) or any Debian-like system
- Node.js installed
- OpenSSL available (optional if you already have an Ed25519 PEM key)

---

## 0. Enter the repository

```bash
cd /home/manuelcoletta1/repos/hbce-joker-c2-core
pwd
ls -la


---

1. Load Ed25519 private key (required)

JOKER-C2 runs fail-closed: without a signing key, execution halts.

If you already have an Ed25519 private key PEM:

unset HBCE_ED25519_PRIVATE_KEY_PEM
export HBCE_ED25519_PRIVATE_KEY_PEM="$(cat /home/manuelcoletta1/node-0001_ed25519_private.pem)"
echo "$HBCE_ED25519_PRIVATE_KEY_PEM" | head -n 2

Expected output starts with:

-----BEGIN PRIVATE KEY-----


---

2. Run the ALLOW example

node cli.js examples/request.allow.sample.json

This prints an HBCE-EVIDENCE-1 JSON evidence record and appends it to:

registry/ledger.jsonl


Check:

ls -la registry
tail -n 1 registry/ledger.jsonl


---

3. Run the DENY example

node cli.js examples/request.deny.sample.json

Verify chain growth:

wc -l registry/ledger.jsonl
tail -n 2 registry/ledger.jsonl

The second record must have:

chain.prev_entry_hash equal to the previous record's chain.entry_hash

exec.status = "SKIPPED" when policy denies



---

Notes

This reference runtime does not execute external tools. It produces deterministic evidence.

If append-only commit fails, the runtime must halt (fail-closed).



---


