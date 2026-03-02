import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/* =========================================================
   HBCE JOKER-C2 CORE — Chain Verifier (CLI)
   - Validates append-only linkage (prev_entry_hash)
   - Recomputes entry_hash deterministically
   - Verifies Ed25519 signature using a public key PEM
   - FAIL = non-zero exit code
   ========================================================= */

function die(msg) {
  process.stderr.write(String(msg) + "\n");
  process.exit(1);
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!isPlainObject(value)) return value;

  const out = {};
  const keys = Object.keys(value).sort();
  for (const k of keys) out[k] = sortKeysDeep(value[k]);
  return out;
}

function canonicalJSONStringify(obj) {
  return JSON.stringify(sortKeysDeep(obj));
}

function sha256Hex(dataUtf8) {
  return crypto.createHash("sha256").update(dataUtf8, "utf8").digest("hex");
}

function loadPublicKeyPem(pubPathAbs) {
  if (!fs.existsSync(pubPathAbs)) die("Public key not found: " + pubPathAbs);
  const pem = fs.readFileSync(pubPathAbs, "utf8");
  if (!pem.includes("BEGIN PUBLIC KEY")) die("Invalid public key PEM: " + pubPathAbs);
  return pem;
}

function computeEntryHash(evidence) {
  const clone = JSON.parse(JSON.stringify(evidence));
  if (clone.chain) delete clone.chain.entry_hash;
  if (clone.sig) delete clone.sig.value;
  const canon = canonicalJSONStringify(clone);
  return sha256Hex(canon);
}

function signaturePayload(evidence) {
  const clone = JSON.parse(JSON.stringify(evidence));
  if (clone.sig) delete clone.sig.value;
  return canonicalJSONStringify(clone);
}

function verifyEd25519(publicKeyPem, messageUtf8, sigB64) {
  const keyObj = crypto.createPublicKey(publicKeyPem);
  const sigBuf = Buffer.from(sigB64, "base64");
  return crypto.verify(null, Buffer.from(messageUtf8, "utf8"), keyObj, sigBuf);
}

/* ------------------------- Main ------------------------- */

const cwd = process.cwd();
const registryDirAbs = path.resolve(cwd, "registry");
const genesisPath = path.resolve(registryDirAbs, "genesis.json");
const ledgerPath = path.resolve(registryDirAbs, "ledger.jsonl");

// Args: node verify.js <publicKeyPemPath>
const argv = process.argv.slice(2);
if (argv.length < 1) {
  die("Usage: node verify.js <path-to-ed25519-public.pem>");
}

const publicKeyPemPathAbs = path.resolve(cwd, argv[0]);
const publicKeyPem = loadPublicKeyPem(publicKeyPemPathAbs);

if (!fs.existsSync(genesisPath)) die("Missing genesis.json at: " + genesisPath);
if (!fs.existsSync(ledgerPath)) die("Missing ledger.jsonl at: " + ledgerPath);

const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf8"));
const genesisEntry = (genesis && genesis.chain && genesis.chain.entry_hash) ? String(genesis.chain.entry_hash) : null;
if (!genesisEntry) die("Invalid genesis.json: missing chain.entry_hash");

const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean);
if (lines.length === 0) die("Ledger is empty (no evidence records).");

let expectedPrev = genesisEntry;
let expectedHeight = 1;

for (let i = 0; i < lines.length; i++) {
  let rec;
  try {
    rec = JSON.parse(lines[i]);
  } catch {
    die(`CHAIN INVALID: JSON parse error at line ${i + 1}`);
  }

  // Minimal structure checks
  if (!rec || rec.v !== "HBCE-EVIDENCE-1") die(`CHAIN INVALID at line ${i + 1}: bad version`);
  if (!rec.chain || typeof rec.chain !== "object") die(`CHAIN INVALID at line ${i + 1}: missing chain`);
  if (!("prev_entry_hash" in rec.chain)) die(`CHAIN INVALID at line ${i + 1}: missing prev_entry_hash`);
  if (!("entry_hash" in rec.chain)) die(`CHAIN INVALID at line ${i + 1}: missing entry_hash`);
  if (Number(rec.chain.height) !== expectedHeight) {
    die(`CHAIN INVALID at height ${rec.chain.height}: expected height ${expectedHeight}`);
  }

  // Linkage check
  if (String(rec.chain.prev_entry_hash) !== String(expectedPrev)) {
    die(
      `CHAIN INVALID at height ${rec.chain.height}: prev_entry_hash mismatch (expected ${expectedPrev}, got ${rec.chain.prev_entry_hash})`
    );
  }

  // entry_hash recompute
  const recomputed = computeEntryHash(rec);
  if (String(rec.chain.entry_hash) !== recomputed) {
    die(
      `CHAIN INVALID at height ${rec.chain.height}: entry_hash mismatch (expected ${recomputed}, got ${rec.chain.entry_hash})`
    );
  }

  // Signature verify
  if (!rec.sig || rec.sig.alg !== "ed25519" || typeof rec.sig.value !== "string") {
    die(`CHAIN INVALID at height ${rec.chain.height}: missing/invalid signature`);
  }
  const payload = signaturePayload(rec);
  const okSig = verifyEd25519(publicKeyPem, payload, rec.sig.value);
  if (!okSig) {
    die(`CHAIN INVALID at height ${rec.chain.height}: signature verification failed`);
  }

  // Advance expected
  expectedPrev = rec.chain.entry_hash;
  expectedHeight += 1;
}

process.stdout.write(
  `CHAIN VALID\nrecords: ${lines.length}\nheight: ${expectedHeight - 1}\nlast_entry_hash: ${expectedPrev}\n`
);
process.exit(0);
