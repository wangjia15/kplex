/** Finite storage-diagnostic protocol contracts; importing the plan must not launch Chromium. */
import assert from "node:assert/strict";
import test from "node:test";
import { storageComparisonPlan } from "../scripts/testing/dependency-repair-storage.mjs";

/** Freeze alternation and workload identity independently of the private result writer. */
test("storage isolation retains three complete alternating matched quartets", () => {
  for (const [mode, orders] of [["causal", ["ABCD", "DCBA", "BADC"]], ["point", ["AEFD", "DFEA", "EADF"]]]) {
    const plan = storageComparisonPlan(mode);
    assert.equal(plan.length, 12);
    for (let pair = 1; pair <= 3; pair++) {
      const group = plan.filter(item => item.pair === pair);
      assert.equal(group.map(item => item.variant).join(""), orders[pair - 1]);
      for (const item of group) {
        assert.equal(item.owners, 256); assert.equal(item.distribution, "mixed");
        assert.equal(item.operation, "delete"); assert.equal(item.shutdown, "graceful");
        assert.equal(item.reopenDiagnostic, true); assert.equal(item.rootProcessCpu, true);
        assert.equal(item.detailed, false); assert.equal(item.wide, false); assert.equal(item.storageInventory, false);
      }
    }
  }
});

/** Detailed wrappers stay out of primary timing; smoke cannot silently become a scale result. */
test("storage counts and smoke are explicit separate cohorts and unknown modes fail closed", () => {
  const detailed = storageComparisonPlan("counts");
  assert.equal(detailed.map(item => item.variant).join(""), "ABCDEF");
  assert.ok(detailed.every(item => item.detailed && item.storageInventory && item.owners === 256 && item.pair === 1));
  for (const mode of ["smoke", "point-smoke"]) {
    const plan = storageComparisonPlan(mode);
    assert.equal(plan.length, 4);
    assert.ok(plan.every(item => item.owners === 2 && !item.detailed && item.pair === 1));
  }
  for (const mode of ["", "full", "point-5", "causal-resume"]) assert.throws(() => storageComparisonPlan(mode), /Use/);
});
