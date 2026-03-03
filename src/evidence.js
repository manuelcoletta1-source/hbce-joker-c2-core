// HBCE Joker-C2 Core — evidence helpers
import { createHash } from "node:crypto";
import { JOKER_C2_KEY_SHA256 } from "./config.js";

/**
 * Produce a sha256 hex digest for a string.
 */
export function sha256Hex(s) {
  return createHash("sha256").update(String(s), "utf8").digest("hex");
}

/**
 * Attach signature metadata (without changing signature bytes).
 * The signature value is expected to be produced elsewhere.
 */
export function bindSignatureMeta(sigValueB64) {
  return {
    alg: "ed25519",
    by: "JOKER-C2",
    key_sha256: JOKER_C2_KEY_SHA256,
    value: String(sigValueB64 || "")
  };
}
