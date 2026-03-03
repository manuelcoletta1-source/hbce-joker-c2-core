// HBCE Joker-C2 Core — registry reader (fail-closed)
import fs from "node:fs";

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

export function loadActiveKeySha256(keysetPath) {
  const o = readJson(keysetPath);

  if (!o || typeof o !== "object") {
    throw new Error("REGISTRY_KEYSET_INVALID");
  }
  if (o.v !== "HBCE-JOKER-C2-KEYSET-1") {
    throw new Error("REGISTRY_KEYSET_VERSION_MISMATCH");
  }
  if (!o.active_key_sha256 || typeof o.active_key_sha256 !== "string") {
    throw new Error("REGISTRY_KEYSET_MISSING_ACTIVE_KEY");
  }
  return o.active_key_sha256.trim();
}
