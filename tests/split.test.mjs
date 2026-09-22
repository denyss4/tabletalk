import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  PEOPLE,
  apportion,
  applyAssignments,
  calculate,
  itemsOf,
  receiptAmountLabel,
} from "../lib/split.ts";
import { sampleReceipt } from "../lib/sample.ts";
import {
  renameReceiptMerchant,
  renameSplitPeople,
  restoreSplitSnapshot,
} from "../lib/session-state.ts";
const expected = JSON.parse(
  readFileSync(
    new URL("../evidence/expected-results.json", import.meta.url),
    "utf8",
  ),
);
const fresh = () => ({
  receipt: structuredClone(sampleReceipt),
  people: structuredClone(PEOPLE),
  allocation: {},
  revision: 0,
});
const shared = [
  { itemIds: ["r1.1", "r3.1"], personIds: ["p1"] },
  { itemIds: ["r2.1", "r4.1"], personIds: ["p2"] },
  { itemIds: ["r5.1"], personIds: ["p3"] },
  { itemIds: ["r6.1"], personIds: ["p1", "p2", "p3"] },
];
const results = [];
for (const name of ["normal", "shared"])
  test(`${name} matches recorded ground truth`, () => {
    const assignments =
      name === "shared"
        ? shared
        : [
            { itemIds: ["r1.1", "r3.1", "r6.1"], personIds: ["p1"] },
            { itemIds: ["r2.1", "r4.1"], personIds: ["p2"] },
            { itemIds: ["r5.1"], personIds: ["p3"] },
          ];
    const actual = calculate(applyAssignments(fresh(), assignments));
    const truth = expected.scenarios.find((s) => s.id === name);
    assert.deepEqual(
      actual.people.map((p) => p.total),
      truth.expectedTotals,
    );
    assert.deepEqual(
      actual.people.map((p) => p.service),
      truth.expectedService,
    );
    assert.equal(actual.settled, true);
    assert.equal(actual.sum, 4775);
    results.push({
      scenario: name,
      scope: "deterministic core; no live recognition",
      actualTotals: actual.people.map((p) => p.total),
      settled: actual.settled,
    });
  });
test("correction replaces the second coffee and repeated application cannot charge twice", () => {
  const initial = applyAssignments(fresh(), [
    { itemIds: ["r1.1", "r2.1", "r3.1"], personIds: ["p1"] },
    ...shared
      .slice(1)
      .map((a, i) => (i === 0 ? { ...a, itemIds: ["r4.1"] } : a)),
  ]);
  assert.deepEqual(
    calculate(initial).people.map((p) => p.total),
    expected.scenarios[2].expectedTotalsBefore,
  );
  const command = [{ itemIds: ["r2.1"], personIds: ["p2"] }];
  const updated = applyAssignments(initial, command);
  assert.deepEqual(
    calculate(updated).people.map((p) => p.total),
    expected.scenarios[2].expectedTotalsAfter,
  );
  assert.deepEqual(
    calculate(applyAssignments(updated, command)).people,
    calculate(updated).people,
  );
  assert.equal(itemsOf(updated.receipt).length, 6);
  results.push({
    scenario: "correction",
    scope: "deterministic core; no live recognition",
    actualTotals: calculate(updated).people.map((p) => p.total),
    itemCount: 6,
  });
});
test("unallocated or unreadable receipt cannot settle", () => {
  assert.equal(calculate(fresh()).settled, false);
  const state = applyAssignments(fresh(), shared);
  state.receipt.rows[2].amountMinor = null;
  state.receipt.rows[2].uncertain = true;
  assert.equal(calculate(state).settled, false);
  state.receipt.rows[2].amountMinor = 1240;
  assert.equal(calculate(state).settled, false);
  results.push({
    scenario: "unreadable",
    scope: "deterministic core; no live recognition",
    settled: false,
  });
});
test("printed total and subtotal discrepancies block completion", () => {
  const state = applyAssignments(fresh(), shared);
  state.receipt.totalMinor++;
  assert.equal(calculate(state).settled, false);
  state.receipt.totalMinor--;
  state.receipt.subtotalMinor++;
  assert.equal(calculate(state).settled, false);
});
test("quantity two yields separate unit IDs and preserves an odd row total", () => {
  const receipt = structuredClone(sampleReceipt);
  receipt.rows = [
    {
      id: "r1",
      name: "Coffee",
      quantity: 2,
      amountMinor: 561,
      uncertain: false,
    },
  ];
  assert.deepEqual(
    itemsOf(receipt).map((x) => [x.id, x.amountMinor]),
    [
      ["r1.1", 281],
      ["r1.2", 280],
    ],
  );
});
test("receipt field labels distinguish absent print from unreadable text", () => {
  assert.equal(receiptAmountLabel(null, "not_printed"), "Not printed");
  assert.equal(receiptAmountLabel(null, "unreadable"), "Unreadable");
  assert.equal(receiptAmountLabel(0, "confirmed"), "€0.00");
});
test("equal shared cents and proportional ties use fixed person order", () => {
  assert.deepEqual(apportion(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(apportion(1, [0, 1, 1]), [0, 1, 0]);
  assert.deepEqual(apportion(435, [1710, 1630, 1000]), [172, 163, 100]);
});
test("invalid commands leave state unchanged", () => {
  const state = fresh();
  const snapshot = structuredClone(state);
  assert.throws(() =>
    applyAssignments(state, [{ itemIds: ["made-up"], personIds: ["p1"] }]),
  );
  assert.throws(() =>
    applyAssignments(state, [{ itemIds: ["r1.1", "r1.1"], personIds: ["p1"] }]),
  );
  assert.throws(() =>
    applyAssignments(state, [{ itemIds: ["r1.1"], personIds: ["p1", "p1"] }]),
  );
  assert.throws(() =>
    applyAssignments(state, [{ itemIds: ["r1.1"], personIds: ["p9"] }]),
  );
  assert.deepEqual(state, snapshot);
});
test("more than one shared item is rejected atomically", () => {
  const state = applyAssignments(fresh(), shared);
  assert.throws(() =>
    applyAssignments(state, [{ itemIds: ["r1.1"], personIds: ["p1", "p2"] }]),
  );
  assert.equal(calculate(state).settled, true);
});
test("rename and undo restore one consistent set of people", () => {
  const original = fresh();
  const renamed = renameSplitPeople(original, ["Ada", "Ben", "Cy"]);
  const restored = restoreSplitSnapshot(renamed, original);
  assert.deepEqual(
    renamed.people.map((person) => person.name),
    ["Ada", "Ben", "Cy"],
  );
  assert.deepEqual(
    restored.people.map((person) => person.name),
    PEOPLE.map((person) => person.name),
  );
  assert.equal(restored.revision, renamed.revision + 1);
});
test("restaurant name correction preserves receipt rows and allocations", () => {
  const allocated = applyAssignments(fresh(), shared);
  const renamed = renameReceiptMerchant(allocated, "  The Quiet Ledger  ");
  assert.equal(renamed.receipt.merchant, "The Quiet Ledger");
  assert.deepEqual(renamed.receipt.rows, allocated.receipt.rows);
  assert.deepEqual(renamed.allocation, allocated.allocation);
  assert.equal(renamed.revision, allocated.revision + 1);
  assert.throws(() => renameReceiptMerchant(allocated, "   "));
});
test("integer allocation conserves every cent across many amounts", () => {
  for (let total = 0; total < 1000; total++) {
    const weights = [(total % 17) + 1, total % 13, total % 7];
    const parts = apportion(total, weights);
    assert.equal(
      parts.reduce((a, b) => a + b, 0),
      total,
    );
    assert.ok(parts.every(Number.isSafeInteger));
  }
});
test.after(() =>
  writeFileSync(
    new URL("../evidence/core-results.json", import.meta.url),
    JSON.stringify(
      { runAt: new Date().toISOString(), recognitionTested: false, results },
      null,
      2,
    ),
  ),
);
