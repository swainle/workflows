import { runJsonPatch } from "../core/patch-stage.mjs";
runJsonPatch({
  kind: "tokens",
  targets: { "03-design-tokens.patch.json": "packages/design-tokens/tokens/index.tokens.json" },
});
