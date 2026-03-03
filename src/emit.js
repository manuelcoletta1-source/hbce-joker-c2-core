// HBCE Joker-C2 Core — evidence emitter (minimal glue)
import fs from "node:fs";
import path from "node:path";
import { bindSignatureMeta } from "./evidence.js";

/**
 * Append one evidence entry as JSONL to registry/ledger.jsonl.
 * This function assumes the evidence object is already complete,
 * except for `sig` which will be bound here.
 */
export function appendEvidenceJSONL({ evidence, sigValueB64, ledgerPath }) {
  const outPath = ledgerPath || path.join("registry", "ledger.jsonl");
  const entry = { ...evidence, sig: bindSignatureMeta(sigValueB64) };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.appendFileSync(outPath, JSON.stringify(entry) + "\n", "utf8");
  return outPath;
}
