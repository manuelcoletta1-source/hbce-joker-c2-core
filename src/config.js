// HBCE Joker-C2 Core — config
// Dynamic binding to registry active key fingerprint (audit-first).

export const REGISTRY_KEYSET_PATH =
  process.env.REGISTRY_KEYSET_PATH ||
  "/home/manuelcoletta1/repos/hbce-joker-c2-registry/registry/keys/keyset.json";

export const JOKER_C2_KEY_SHA256 =
  process.env.JOKER_C2_KEY_SHA256 ||
  "3ac274ed4b5b735adbf3523a387c8c4925d685d0a0790170d7c9142c1b612305";
