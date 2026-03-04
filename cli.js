import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { runOnce } from "./src/runtime.js";
import { bindSignatureMeta } from "./src/evidence.js";

function die(msg) {
  process.stderr.write(String(msg) + "\n");
  process.exit(1);
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

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

const argv = process.argv.slice(2);

function getArgValue(name, def = null) {
  const i = argv.indexOf(name);
  if (i === -1) return def;
  const v = argv[i + 1];
  if (!v) die(`Missing value for ${name}`);
  return v;
}

/**
 * Smoke test
 */
if (argv.includes("--smoke")) {
  try {
    const sig = bindSignatureMeta("AA==");
    process.stdout.write("SMOKE_OK key_sha256=" + sig.key_sha256 + "\n");
    process.exit(0);
  } catch (e) {
    die("FAIL_CLOSED: " + (e && e.message ? e.message : String(e)));
  }
}

if (argv.length < 1) {
  die("Usage: node cli.js <request.json> [--out ./out] [--prev GENESIS] | node cli.js --smoke");
}

const reqPath = path.resolve(process.cwd(), argv[0]);
if (!fs.existsSync(reqPath)) die("Request file not found: " + reqPath);

let requestObj;
try {
  requestObj = JSON.parse(fs.readFileSync(reqPath, "utf8"));
} catch (e) {
  die("FAIL_CLOSED: JSON_INVALID");
}

const outRoot = path.resolve(process.cwd(), getArgValue("--out", "out"));
const prevEntryHash = getArgValue("--prev", "GENESIS");

const policyPathAbs = path.resolve(process.cwd(), "policy", "policy.core.json");
const registryDirAbs = path.resolve(process.cwd(), "registry");

try {
  const evidence = runOnce({ requestObj, policyPathAbs, registryDirAbs });

  const status = evidence?.result?.status;

  if (status !== "PASS" && status !== "FAIL") {
    die("FAIL_CLOSED: INTERNAL_ERROR missing result.status");
  }

  if (status === "FAIL") {
    const reasons = Array.isArray(evidence?.result?.reason_codes)
      ? evidence.result.reason_codes
      : ["FAIL_CLOSED"];
    die("FAIL_CLOSED: " + reasons.join(" | "));
  }

  const createdAt = new Date().toISOString();

  const reqCanon = canonicalJson(requestObj);
  const reqSha = sha256Hex(Buffer.from(reqCanon, "utf8"));

  const inputHashes = {
    request_sha256: reqSha,
    policy_sha256: evidence?.input_hashes?.policy_sha256 || null,
    registry_sha256: evidence?.input_hashes?.registry_sha256 || null
  };

  const resultJson = {
    status: "PASS",
    reason_codes: evidence?.result?.reason_codes || ["OK"],
    checks: evidence?.result?.checks || []
  };

  const chainEntry = {
    prev_entry_hash: prevEntryHash,
    inputs: inputHashes
  };

  const packManifest = {
    proto: "HBCE-CORE-v3",
    kind: "JOKER_C2_EVIDENCE_PACK",
    epoch: "EU_NETWORK_GENESIS",
    issuer: "HERMETICUM B.C.E. S.r.l.",
    created_at: createdAt,
    policy: [
      "UE_FIRST",
      "AUDIT_FIRST",
      "FAIL_CLOSED",
      "HASH_ONLY",
      "APPEND_ONLY",
      "NO_IDENTITY_CUSTODY"
    ],
    refs: {
      request_path: path.basename(reqPath),
      input_hashes: inputHashes
    }
  };

  const manifestCanon = canonicalJson(packManifest);
  const resultCanon = canonicalJson(resultJson);
  const chainCanon = canonicalJson(chainEntry);

  const manifestSha = sha256Hex(Buffer.from(manifestCanon, "utf8"));
  const resultSha = sha256Hex(Buffer.from(resultCanon, "utf8"));
  const chainSha = sha256Hex(Buffer.from(chainCanon, "utf8"));

  const signingBlob = Buffer.from(
    [manifestSha, resultSha, chainSha].join("\n") + "\n",
    "utf8"
  );

  const entryHash = sha256Hex(signingBlob);

  chainEntry.entry_hash = entryHash;

  packManifest.refs.entry_hash = entryHash;
  packManifest.refs.blob_sha256 = {
    PACK_MANIFEST_sha256: manifestSha,
    RESULT_sha256: resultSha,
    CHAIN_ENTRY_sha256: chainSha
  };

  const sigMeta = bindSignatureMeta("AA==");

  const signatureB64 = evidence?.signature?.b64 || null;
  if (!signatureB64) {
    die("FAIL_CLOSED: SIGNATURE_ERROR missing signature");
  }

  const packDir = path.join(outRoot, "evidence-pack", entryHash);
  ensureDir(packDir);

  fs.writeFileSync(path.join(packDir, "PACK_MANIFEST.json"), canonicalJson(packManifest));
  fs.writeFileSync(path.join(packDir, "INPUT_HASHES.json"), canonicalJson(inputHashes));
  fs.writeFileSync(path.join(packDir, "RESULT.json"), canonicalJson(resultJson));
  fs.writeFileSync(path.join(packDir, "CHAIN_ENTRY.json"), canonicalJson(chainEntry));
  fs.writeFileSync(path.join(packDir, "SIGNATURE.ed25519"), signatureB64 + "\n");
  fs.writeFileSync(path.join(packDir, "SIGNATURE_META.json"), canonicalJson(sigMeta));

  process.stdout.write("PASS entry_hash=" + entryHash + "\n");

} catch (e) {
  die("FAIL_CLOSED: " + (e && e.message ? e.message : String(e)));
}
