import { runTextPatch } from "../core/patch-stage.mjs";
runTextPatch({
  expectedName: "02-process.patch.puml or 02-process-<topic>.patch.puml",
  expectedPattern: /^02-process(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?\.patch\.puml$/,
  target: "docs/architecture/process.puml",
});
