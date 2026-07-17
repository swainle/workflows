import assert from "node:assert/strict";
import test from "node:test";
import { parseFlowArguments, STAGES } from "./tools/flow.mjs";

test("parses a stage range and request", () => {
  assert.deepEqual(parseFlowArguments([
    "--from", "c4",
    "--to", "backend",
    "--request", "增加 Redis",
  ]), {
    from: "c4",
    to: "backend",
    request: "增加 Redis",
    stages: ["c4", "api", "database", "backend"],
  });
});

test("supports every stage as a range boundary", () => {
  for (const stage of STAGES) {
    assert.deepEqual(parseFlowArguments([
      "--from", stage,
      "--to", stage,
      "--request", "重新评审",
    ]).stages, [stage]);
  }
});

test("rejects reversed and unknown stage ranges", () => {
  assert.throws(() => parseFlowArguments([
    "--from", "backend",
    "--to", "c4",
    "--request", "重新评审",
  ]), /Stages must follow this order/);
  assert.throws(() => parseFlowArguments([
    "--from", "unknown",
    "--to", "backend",
    "--request", "重新评审",
  ]), /Stages must follow this order/);
});
