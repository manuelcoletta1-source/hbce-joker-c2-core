// HBCE Joker-C2 Core — registry reader (fail-closed)
// Supports both KEYSET and KEYRING registry manifests.

import fs from "node:fs";

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

export function loadActiveKeySha256(registryPath) {
  const o = readJson(registryPath);

  if (!o || typeof o !== "object") {
    throw new Error("REGISTRY_KEYSET_INVALID");
  }

  // Allow both known manifest versions.
  const allowed = new Set([
    "HBCE-JOKER-C2-KEYSET-1",
    "HBCE-JOKER-C2-KEYRING-1"
  ]);

  if (!o.v || typeof o.v !== "string" || !allowed.has(o.v)) {
    throw new Error("REGISTRY_KEYSET_VERSION_MISMATCH");
  }

  // Common field across both manifests (preferred).
  if (o.active_key_sha256 && typeof o.active_key_sha256 === "string") {
    return o.active_key_sha256.trim();
  }

  // Fail-closed if the registry does not provide an active key.
  throw new Error("REGISTRY_KEYSET_MISSING_ACTIVE_KEY");
}
