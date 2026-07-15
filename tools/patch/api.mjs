import path from "node:path";
import { runJsonPatch } from "../core/patch-stage.mjs";

const filename = path.basename(process.argv[2] ?? "");
if (filename === "04-openapi.patch.json") {
  runJsonPatch({ kind: "openapi", targets: { [filename]: "docs/contracts/openapi.json" } });
} else if (filename === "04-asyncapi.patch.json") {
  runJsonPatch({ kind: "asyncapi", targets: { [filename]: "docs/contracts/asyncapi.json" } });
} else {
  throw new Error("Expected 04-openapi.patch.json or 04-asyncapi.patch.json.");
}
