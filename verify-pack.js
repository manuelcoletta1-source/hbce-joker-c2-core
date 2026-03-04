import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function die(msg) {
  process.stderr.write(String(msg) + "\n");
  process.exit(1);
}

function ok(msg) {
  process.stdout.write(msg + "\n");
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function canonicalJson(obj) {
  const stable = (v) => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(stable);
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
    return out;
  };
  return JSON.stringify(stable(obj), null, 2) + "\n";
}

function readJson(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch {
    return null;
  }
}

function exists(absPath) {
  try {
    fs.accessSync(absPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function computeEntryHashFromPreimage({ manifestObj, resultObj, chainObj }) {
  // Reconstruct the exact preimage used by cli.js:
  // - manifest hash is computed BEFORE refs.entry_hash and refs.blob_sha256 are added
  // - chain hash is computed BEFORE chain.entry_hash is added
  const manifestPre = clone(manifestObj);
  if (manifestPre?.refs && typeof manifestPre.refs === "object") {
    delete manifestPre.refs.entry_hash;
    delete manifestPre.refs.blob_sha256;
  }

  const chainPre = clone(chainObj);
  delete chainPre.entry_hash;

  const manifestCanon = canonicalJson(manifestPre);
  const resultCanon = canonicalJson(resultObj);
  const chainCanon = canonicalJson(chainPre);

  const manifestSha = sha256Hex(Buffer.from(manifestCanon, "utf8"));
  const resultSha = sha256Hex(Buffer.from(resultCanon, "utf8"));
  const chainSha = sha256Hex(Buffer.from(chainCanon, "utf8"));

  const signingBlob = Buffer.from([manifestSha, resultSha, chainSha].join("\n") + "\n", "utf8");
  const entryHash = sha256Hex(signingBlob);

  return { entryHash, manifestSha, resultSha, chainSha };
}

const argv = process.argv.slice(2);
if (argv.length < 1) die("Usage: node verify-pack.js <path-to-evidence-pack-dir>");

const packDirAbs = path.resolve(process.cwd(), argv[0]);
if (!exists(packDirAbs)) die("FAIL: pack dir not found: " + packDirAbs);

const entryHashFromDir = path.basename(packDirAbs);

const manifestPath = path.join(packDirAbs, "PACK_MANIFEST.json");
const resultPath = path.join(packDirAbs, "RESULT.json");
const chainPath = path.join(packDirAbs, "CHAIN_ENTRY.json");
const sigPath = path.join(packDirAbs, "SIGNATURE.ed25519");
const sigMetaPath = path.join(packDirAbs, "SIGNATURE_META.json");

for (const p of [manifestPath, resultPath, chainPath, sigPath, sigMetaPath]) {
  if (!exists(p)) die("FAIL: missing file: " + p);
}

const manifestObj = readJson(manifestPath);
const resultObj = readJson(resultPath);
const chainObj = readJson(chainPath);

if (!manifestObj) die("FAIL: PACK_MANIFEST.json is not valid JSON");
if (!resultObj) die("FAIL: RESULT.json is not valid JSON");
if (!chainObj) die("FAIL: CHAIN_ENTRY.json is not valid JSON");

const { entryHash, manifestSha, resultSha, chainSha } = computeEntryHashFromPreimage({
  manifestObj,
  resultObj,
  chainObj
});

if (entryHash !== entryHashFromDir) {
  die(
    "FAIL: entry_hash mismatch (computed != dir)\ncomputed=" +
      entryHash +
      "\ndir=" +
      entryHashFromDir
  );
}

// Stronger internal consistency checks (should hold for packs emitted by cli.js)
const entryHashInChain = chainObj?.entry_hash || null;
if (entryHashInChain && entryHashInChain !== entryHash) {
  die(
    "FAIL: mismatch (CHAIN_ENTRY.entry_hash != entry_hash)\nchain=" +
      entryHashInChain +
      "\nentry_hash=" +
      entryHash
  );
}

const entryHashInManifest = manifestObj?.refs?.entry_hash || null;
if (entryHashInManifest && entryHashInManifest !== entryHash) {
  die(
    "FAIL: mismatch (PACK_MANIFEST.refs.entry_hash != entry_hash)\nmanifest=" +
      entryHashInManifest +
      "\nentry_hash=" +
      entryHash
  );
}

// If blob_sha256 is present, validate it too.
const blob = manifestObj?.refs?.blob_sha256 || null;
if (blob && typeof blob === "object") {
  const m = blob?.PACK_MANIFEST_sha256 || null;
  const r = blob?.RESULT_sha256 || null;
  const c = blob?.CHAIN_ENTRY_sha256 || null;

  // Note: these are the sha256 of canonical preimages, not of the on-disk final JSON files.
  if (m && m !== manifestSha) die("FAIL: blob_sha256 mismatch PACK_MANIFEST_sha256");
  if (r && r !== resultSha) die("FAIL: blob_sha256 mismatch RESULT_sha256");
  if (c && c !== chainSha) die("FAIL: blob_sha256 mismatch CHAIN_ENTRY_sha256");
}

ok("PASS_PACK entry_hash=" + entryHash);
ok("PACK_SHA256(preimage) PACK_MANIFEST=" + manifestSha);
ok("PACK_SHA256(preimage) RESULT=" + resultSha);
ok("PACK_SHA256(preimage) CHAIN_ENTRY=" + chainSha);
