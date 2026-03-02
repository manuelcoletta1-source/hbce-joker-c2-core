import fs from "node:fs";
import path from "node:path";
import { runOnce } from "./src/runtime.js";

function die(msg) {
  process.stderr.write(String(msg) + "\n");
  process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.length < 1) die("Usage: node cli.js <path-to-request.json>");

const reqPath = path.resolve(process.cwd(), argv[0]);
if (!fs.existsSync(reqPath)) die("Request file not found: " + reqPath);

const requestObj = JSON.parse(fs.readFileSync(reqPath, "utf8"));

const policyPathAbs = path.resolve(process.cwd(), "policy", "policy.core.json");
const registryDirAbs = path.resolve(process.cwd(), "registry");

try {
  const evidence = runOnce({ requestObj, policyPathAbs, registryDirAbs });
  process.stdout.write(JSON.stringify(evidence, null, 2) + "\n");
} catch (e) {
  die("FAIL_CLOSED: " + (e && e.message ? e.message : String(e)));
}
