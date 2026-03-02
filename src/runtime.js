import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/* =========================================================
   HBCE JOKER-C2 CORE — Reference Minimal Runtime (Node.js)
   - Deterministic FSM
   - Fail-closed
   - Evidence-by-design
   - Append-only local ledger (registry/ledger.jsonl)
   ========================================================= */

/* ------------------------- Deterministic JSON ------------------------- */

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
  // Deterministic: deep-sort keys, then JSON stringify with no spacing.
  return JSON.stringify(sortKeysDeep(obj));
}

function sha256Hex(dataUtf8) {
  return crypto.createHash("sha256").update(dataUtf8, "utf8").digest("hex");
}

/* ------------------------- Minimal Validation ------------------------- */

function validateRequestMin(req) {
  // Fail-closed: only allow known shape; this is minimal (not full JSON Schema).
  if (!req || typeof req !== "object") return { ok: false, reason: "REQUEST_NOT_OBJECT" };
  if (req.v !== "JOKER-REQUEST-1") return { ok: false, reason: "BAD_VERSION" };
  if (typeof req.request_id !== "string" || req.request_id.length < 10) return { ok: false, reason: "BAD_REQUEST_ID" };
  if (typeof req.ts !== "string" || req.ts.length < 10) return { ok: false, reason: "BAD_TS" };
  if (typeof req.ipr_subject !== "string" || req.ipr_subject.length < 3) return { ok: false, reason: "BAD_IPR_SUBJECT" };
  if (!req.intent || typeof req.intent !== "object") return { ok: false, reason: "MISSING_INTENT" };
  if (!req.scope || typeof req.scope !== "object") return { ok: false, reason: "MISSING_SCOPE" };

  const kind = req.intent.kind;
  const allowedKinds = new Set(["READ_ONLY", "WRITE_INTERNAL", "EXECUTE_TOOL", "EXECUTE_EXTERNAL"]);
  if (!allowedKinds.has(kind)) return { ok: false, reason: "BAD_INTENT_KIND" };

  if (typeof req.intent.summary !== "string" || req.intent.summary.length < 1) return { ok: false, reason: "BAD_INTENT_SUMMARY" };
  if (typeof req.scope.domain !== "string" || req.scope.domain.length < 1) return { ok: false, reason: "BAD_SCOPE_DOMAIN" };
  if (!Array.isArray(req.scope.tools_allowed)) return { ok: false, reason: "BAD_TOOLS_ALLOWED" };

  return { ok: true };
}

/* ------------------------- Policy Evaluation ------------------------- */

function loadPolicy(policyPathAbs) {
  const raw = fs.readFileSync(policyPathAbs, "utf8");
  const obj = JSON.parse(raw);

  // Fail-closed minimal checks
  if (!obj || typeof obj !== "object") throw new Error("POLICY_NOT_OBJECT");
  if (obj.v !== "HBCE-POLICY-1") throw new Error("POLICY_BAD_VERSION");
  if (typeof obj.policy_id !== "string" || !obj.policy_id) throw new Error("POLICY_BAD_ID");
  if (typeof obj.version !== "string" || !obj.version) throw new Error("POLICY_BAD_VERSION_FIELD");
  if (!obj.default || obj.default.decision !== "DENY") throw new Error("POLICY_DEFAULT_NOT_DENY");
  if (!Array.isArray(obj.rules) || obj.rules.length < 1) throw new Error("POLICY_RULES_EMPTY");
  if (!obj.gates || !obj.gates.kill_switch || typeof obj.gates.kill_switch.enabled !== "boolean") {
    throw new Error("POLICY_GATES_INVALID");
  }
  return obj;
}

// Risk ordering
const RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function policyEvaluate(policy, req) {
  // Default: DENY
  const reasons = [];
  const deny = (r) => ({ result: "DENY", reasons: [r] });

  if (policy.gates.kill_switch.enabled === true) return deny("KILL_SWITCH_ENABLED");

  const domain = req.scope.domain;
  const kind = req.intent.kind;
  const risk = req.intent.risk_hint || "LOW";

  // Hard limits (fail-closed): if request limits exceed policy limits, deny.
  const reqLimits = (req.scope && req.scope.limits) || {};
  if (typeof reqLimits.max_steps === "number" && reqLimits.max_steps > policy.limits.max_steps) return deny("LIMIT_MAX_STEPS_EXCEEDED");
  if (typeof reqLimits.max_duration_ms === "number" && reqLimits.max_duration_ms > policy.limits.max_duration_ms) return deny("LIMIT_MAX_DURATION_EXCEEDED");
  if (typeof reqLimits.max_cost === "number" && reqLimits.max_cost > policy.limits.max_cost) return deny("LIMIT_MAX_COST_EXCEEDED");

  // Match first ALLOW rule deterministically by order.
  for (const rule of policy.rules) {
    if (!rule || typeof rule !== "object") continue;
    const w = rule.when || {};
    const t = rule.then || {};
    if (w.domain !== domain) continue;
    if (!Array.isArray(w.intent_kind) || !w.intent_kind.includes(kind)) continue;

    // risk_hint_max
    if (w.risk_hint_max && RANK[risk] > RANK[w.risk_hint_max]) continue;

    // tools_allowed_all_of must be included in request tools_allowed
    if (Array.isArray(w.tools_allowed_all_of) && w.tools_allowed_all_of.length > 0) {
      const set = new Set(req.scope.tools_allowed || []);
      const ok = w.tools_allowed_all_of.every((x) => set.has(x));
      if (!ok) continue;
    }

    if (t.decision === "ALLOW") {
      reasons.push(t.reason || rule.id || "POLICY_ALLOW");
      return { result: "PASS", reasons };
    }
  }

  return { result: "DENY", reasons: ["NO_MATCHING_ALLOW_RULE"] };
}

/* ------------------------- Append-only Ledger ------------------------- */

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readLatestChainState(registryDirAbs) {
  // Source of truth: registry/ledger.jsonl if exists; otherwise genesis.json.
  const ledgerPath = path.join(registryDirAbs, "ledger.jsonl");
  if (fs.existsSync(ledgerPath)) {
    const lines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n").filter(Boolean);
    if (lines.length > 0) {
      const last = JSON.parse(lines[lines.length - 1]);
      if (last && last.chain && typeof last.chain.entry_hash === "string") {
        return { prev_entry_hash: last.chain.entry_hash, height: Number(last.chain.height || 0) };
      }
    }
  }
  const genesisPath = path.join(registryDirAbs, "genesis.json");
  const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf8"));
  return { prev_entry_hash: genesis.chain.entry_hash, height: Number(genesis.chain.height || 0) };
}

function appendLedger(registryDirAbs, evidenceRecord) {
  const ledgerPath = path.join(registryDirAbs, "ledger.jsonl");
  const line = JSON.stringify(evidenceRecord);
  fs.appendFileSync(ledgerPath, line + "\n", "utf8");
}

/* ------------------------- Signing (Ed25519) ------------------------- */

function loadEd25519PrivateKeyFromEnv() {
  // Expect PEM in env HBCE_ED25519_PRIVATE_KEY_PEM
  const pem = process.env.HBCE_ED25519_PRIVATE_KEY_PEM;
  if (!pem || typeof pem !== "string" || pem.trim().length < 20) return null;
  return pem;
}

function signEd25519(privateKeyPem, messageUtf8) {
  const keyObj = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(messageUtf8, "utf8"), keyObj);
  return sig.toString("base64");
}

/* ------------------------- Evidence Build ------------------------- */

function buildEvidence({
  policy,
  req,
  policyResult,
  gateResult,
  execStatus,
  toolTrace,
  errorObj,
  rollbackObj,
  chainPrev,
  chainHeightNext
}) {
  const nowIso = new Date().toISOString();

  // Canonicalize request and hash it deterministically.
  const reqCanon = canonicalJSONStringify(req);
  const input_hash = sha256Hex(reqCanon);

  const evidence = {
    v: "HBCE-EVIDENCE-1",
    request_id: req.request_id,
    ipr_subject: req.ipr_subject,
    ts: { start: req.ts, end: nowIso },
    policy: {
      id: policy.policy_id,
      version: policy.version,
      result: policyResult.result,
      reasons: policyResult.reasons || []
    },
    gate: {
      result: gateResult.result,
      reasons: gateResult.reasons || []
    },
    hashes: {
      input_hash,
      plan_hash: null,
      output_hash: null
    },
    exec: {
      status: execStatus,
      tool_trace: toolTrace || [],
      error: errorObj || null,
      rollback: rollbackObj || null
    },
    chain: {
      prev_entry_hash: chainPrev,
      entry_hash: "__PENDING__",
      height: chainHeightNext
    },
    sig: {
      alg: "ed25519",
      by: "JOKER-C2",
      value: "__PENDING__"
    }
  };

  return evidence;
}

function computeEntryHash(evidence) {
  // Hash over evidence without chain.entry_hash and sig.value.
  const clone = JSON.parse(JSON.stringify(evidence));
  if (clone.chain) delete clone.chain.entry_hash;
  if (clone.sig) delete clone.sig.value;

  const canon = canonicalJSONStringify(clone);
  return sha256Hex(canon);
}

function computeSignaturePayload(evidenceWithEntryHashNoSigValue) {
  const clone = JSON.parse(JSON.stringify(evidenceWithEntryHashNoSigValue));
  if (clone.sig) delete clone.sig.value;
  return canonicalJSONStringify(clone);
}

/* ------------------------- FSM Runner (Minimal) ------------------------- */

export function runOnce({ requestObj, policyPathAbs, registryDirAbs }) {
  // S0 BOOT
  if (!requestObj) throw new Error("REQUEST_REQUIRED");
  if (!policyPathAbs) throw new Error("POLICY_PATH_REQUIRED");
  if (!registryDirAbs) throw new Error("REGISTRY_DIR_REQUIRED");

  // Ensure dirs
  ensureDir(path.dirname(policyPathAbs));
  ensureDir(registryDirAbs);

  // Load policy (fail-closed)
  const policy = loadPolicy(policyPathAbs);

  // S1 IDENTIFY (minimal placeholder: treat any ipr_subject string as resolvable)
  // Real implementation would verify IPR status in registry/network.
  const ipr_valid = typeof requestObj.ipr_subject === "string" && requestObj.ipr_subject.length >= 3;
  if (!ipr_valid) {
    // DENY → EVIDENCE → COMMIT
    const { prev_entry_hash, height } = readLatestChainState(registryDirAbs);
    const ev = buildEvidence({
      policy,
      req: requestObj,
      policyResult: { result: "DENY", reasons: ["IPR_INVALID"] },
      gateResult: { result: "DENY", reasons: ["IPR_INVALID"] },
      execStatus: "SKIPPED",
      toolTrace: [],
      errorObj: null,
      rollbackObj: null,
      chainPrev: prev_entry_hash,
      chainHeightNext: height + 1
    });

    const entryHash = computeEntryHash(ev);
    ev.chain.entry_hash = entryHash;

    const priv = loadEd25519PrivateKeyFromEnv();
    if (!priv) throw new Error("MISSING_ED25519_PRIVATE_KEY_PEM");
    ev.sig.value = signEd25519(priv, computeSignaturePayload(ev));

    appendLedger(registryDirAbs, ev);
    return ev;
  }

  // S2 INTAKE + S3 CANONICALIZE (minimal)
  const vr = validateRequestMin(requestObj);
  if (!vr.ok) {
    const { prev_entry_hash, height } = readLatestChainState(registryDirAbs);
    const ev = buildEvidence({
      policy,
      req: requestObj,
      policyResult: { result: "DENY", reasons: [vr.reason] },
      gateResult: { result: "DENY", reasons: [vr.reason] },
      execStatus: "SKIPPED",
      toolTrace: [],
      errorObj: null,
      rollbackObj: null,
      chainPrev: prev_entry_hash,
      chainHeightNext: height + 1
    });

    const entryHash = computeEntryHash(ev);
    ev.chain.entry_hash = entryHash;

    const priv = loadEd25519PrivateKeyFromEnv();
    if (!priv) throw new Error("MISSING_ED25519_PRIVATE_KEY_PEM");
    ev.sig.value = signEd25519(priv, computeSignaturePayload(ev));

    appendLedger(registryDirAbs, ev);
    return ev;
  }

  // S4 POLICY_EVALUATE
  const pol = policyEvaluate(policy, requestObj);
  if (pol.result !== "PASS") {
    // DENY
    const { prev_entry_hash, height } = readLatestChainState(registryDirAbs);
    const ev = buildEvidence({
      policy,
      req: requestObj,
      policyResult: pol,
      gateResult: { result: "DENY", reasons: ["Policy restriction"] },
      execStatus: "SKIPPED",
      toolTrace: [],
      errorObj: null,
      rollbackObj: null,
      chainPrev: prev_entry_hash,
      chainHeightNext: height + 1
    });

    const entryHash = computeEntryHash(ev);
    ev.chain.entry_hash = entryHash;

    const priv = loadEd25519PrivateKeyFromEnv();
    if (!priv) throw new Error("MISSING_ED25519_PRIVATE_KEY_PEM");
    ev.sig.value = signEd25519(priv, computeSignaturePayload(ev));

    appendLedger(registryDirAbs, ev);
    return ev;
  }

  // S5 SAFETY_GATE (minimal gate = ALLOW if policy PASS and kill-switch off)
  const gate = { result: "ALLOW", reasons: [] };

  // S6 PLAN (minimal reference: plan == tool list)
  const toolTrace = Array.isArray(requestObj.scope.tools_allowed) ? requestObj.scope.tools_allowed.slice(0, 16) : [];

  // S7 EXECUTE (reference runtime does not execute external tools; it records intent only)
  // This keeps the reference implementation safe.
  const execStatus = "OK";

  // S10 EVIDENCE_BUILD + S11 COMMIT_APPEND_ONLY
  const { prev_entry_hash, height } = readLatestChainState(registryDirAbs);
  const ev = buildEvidence({
    policy,
    req: requestObj,
    policyResult: pol,
    gateResult: gate,
    execStatus,
    toolTrace,
    errorObj: null,
    rollbackObj: null,
    chainPrev: prev_entry_hash,
    chainHeightNext: height + 1
  });

  const entryHash = computeEntryHash(ev);
  ev.chain.entry_hash = entryHash;

  const priv = loadEd25519PrivateKeyFromEnv();
  if (!priv) throw new Error("MISSING_ED25519_PRIVATE_KEY_PEM");
  ev.sig.value = signEd25519(priv, computeSignaturePayload(ev));

  appendLedger(registryDirAbs, ev);
  return ev;
}
