import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function die(msg) {
  process.stderr.write(String(msg) + "\n");
  process.exit(1);
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
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

function ok(msg) {
  process.stdout.write(msg + "\n");
}

const argv = process.argv.slice(2);
if (argv.length < 1) {
  die("Usage: node verify-pack.js <path-to-evidence-pack-dir>");
}

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

const manifestBytes = fs.readFileSync(manifestPath);
const resultBytes = fs.readFileSync(resultPath);
const chainBytes = fs.readFileSync(chainPath);

const manifestSha = sha256Hex(manifestBytes);
const resultSha = sha256Hex(resultBytes);
const chainSha = sha256Hex(chainBytes);

const signingBlob = Buffer.from([manifestSha, resultSha, chainSha].join("\n") + "\n", "utf8");
const entryHashComputed = sha256Hex(signingBlob);

const chainObj = readJson(chainPath);
if (!chainObj) die("FAIL: CHAIN_ENTRY.json is not valid JSON");

const entryHashInChain = chainObj?.entry_hash;

if (entryHashComputed !== entryHashFromDir) {
  die("FAIL: entry_hash mismatch (computed != dir)\ncomputed=" + entryHashComputed + "\ndir=" + entryHashFromDir);
}

if (entryHashInChain && entryHashInChain !== entryHashComputed) {
  die("FAIL: entry_hash mismatch (computed != CHAIN_ENTRY.entry_hash)\ncomputed=" + entryHashComputed + "\nchain=" + entryHashInChain);
}

ok("PASS_PACK_HASH entry_hash=" + entryHashComputed);
ok("PACK_SHA256 PACK_MANIFEST=" + manifestSha);
ok("PACK_SHA256 RESULT=" + resultSha);
ok("PACK_SHA256 CHAIN_ENTRY=" + chainSha);
