import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { currentRequirement, selectRequirement } from "./tools/core/current-requirement.mjs";
import { parsePromptArguments } from "./tools/prompt.mjs";

test("parses requirement and stage commands", () => {
  assert.deepEqual(parsePromptArguments(["req", "REQ-0004-build"]), {
    command: "req",
    requirement: "REQ-0004-build",
  });
  assert.deepEqual(parsePromptArguments(["api", "--include", "packages/api", "--include", "docs/example.md"]), {
    command: "api",
    includes: ["packages/api", "docs/example.md"],
  });
});

test("stores the current requirement in Git metadata", () => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "workflows-prompt-"));
  const runner = () => ".git/workflows/current-requirement\n";
  try {
    const selected = selectRequirement("REQ-0004-build", { projectRoot, runner });
    assert.equal(selected.existed, false);
    assert.equal(existsSync(path.join(selected.requirementDir, "change/assets")), true);
    assert.equal(
      readFileSync(path.join(projectRoot, ".git/workflows/current-requirement"), "utf8"),
      "docs/requirements/REQ-0004-build\n",
    );
    assert.equal(currentRequirement({ projectRoot, runner }), selected.requirementDir);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
