// HBCE Joker-C2 Core — evidence helpers
import { createHash } from "node:crypto";
import { JOKER_C2_KEY_SHA256, REGISTRY_KEYSET_PATH } from "./config.js";
import { loadActiveKeySha256 } from "./registry.js";

export function sha256Hex(s) {
  return createHash("sha256").update(String(s), "utf8").digest("hex");
}

export function assertActiveKeyMatchesRegistry() {
  const active = loadActiveKeySha256(REGISTRY_KEYSET_PATH);
  const local = String(JOKER_C2_KEY_SHA256 || "").trim();

  if (!local) throw new Error("LOCAL_KEY_SHA256_MISSING");
  if (active !== local) {
    // Fail-closed: do not sign, do not emit "valid" evidence.
    throw new Error("ACTIVE_KEY_MISMATCH_FAIL_CLOSED");
  }
  return { active, local };
}

export function bindSignatureMeta(sigValueB64) {
  // Enforce dynamic binding before writing any signed evidence.
  assertActiveKeyMatchesRegistry();

  return {
    alg: "ed25519",
    by: "JOKER-C2",
    key_sha256: String(JOKER_C2_KEY_SHA256).trim(),
    value: String(sigValueB64 || "")
  };
}
