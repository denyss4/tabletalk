import test from "node:test";
import assert from "node:assert/strict";
import { applyAssignments, calculate, itemsOf } from "../lib/split.ts";
import { sampleReceipt } from "../lib/sample.ts";
import { validateIntent, confirmReceipt } from "../lib/intent.ts";
import { createDefaultPeople } from "../lib/session-state.ts";
const fresh = () => ({
  receipt: structuredClone(sampleReceipt),
  people: createDefaultPeople(),
  allocation: {},
  revision: 0,
});
const intent = (assignments) => ({
  assignments,
  question: null,
  candidateItemIds: [],
  candidatePersonIds: [],
  confirmation: null,
});
test("ambiguous coffee proposal becomes a question without silent allocation", () => {
  const parsed = validateIntent(
    fresh(),
    intent([{ itemIds: ["r1.1"], personIds: ["p2"] }]),
    "Sam had a coffee.",
  );
  assert.deepEqual(parsed.assignments, []);
  assert.deepEqual(parsed.candidateItemIds, ["r1.1", "r2.1"]);
  assert.equal(parsed.question, "Which coffee did Sam mean?");
});
test("second coffee correction preserves stable ID", () => {
  const parsed = validateIntent(
    fresh(),
    intent([{ itemIds: ["r2.1"], personIds: ["p2"] }]),
    "Actually, the second coffee was Sam's.",
  );
  assert.equal(parsed.question, null);
  assert.deepEqual(parsed.assignments, [
    { itemIds: ["r2.1"], personIds: ["p2"] },
  ]);
});
test("an ordinal for another item cannot resolve an ambiguous repeated item", () => {
  const parsed = validateIntent(
    fresh(),
    intent([{ itemIds: ["r1.1"], personIds: ["p2"] }]),
    "Alex had the first burger. Sam had a coffee.",
  );
  assert.deepEqual(parsed.assignments, []);
  assert.deepEqual(parsed.candidateItemIds, ["r1.1", "r2.1"]);
  assert.equal(parsed.question, "Which coffee did Sam mean?");
});
test("a pending repeated-item question accepts a bare ordinal answer", () => {
  const pending = {
    ...intent([]),
    question: "Which coffee did Sam mean?",
    candidateItemIds: ["r1.1", "r2.1"],
    candidatePersonIds: ["p2"],
  };
  const parsed = validateIntent(
    fresh(),
    intent([{ itemIds: ["r2.1"], personIds: ["p2"] }]),
    "The second one.",
    pending,
  );
  assert.equal(parsed.question, null);
  assert.deepEqual(parsed.assignments, [
    { itemIds: ["r2.1"], personIds: ["p2"] },
  ]);
});
test("both coffees may be assigned explicitly to one person", () => {
  const parsed = validateIntent(
    fresh(),
    intent([{ itemIds: ["r1.1", "r2.1"], personIds: ["p1"] }]),
    "Alex had both coffees.",
  );
  assert.equal(parsed.assignments.length, 1);
  assert.equal(parsed.question, null);
});
test("invalid clarification targets are rejected", () => {
  const result = validateIntent(
    fresh(),
    { ...intent([]), question: "Which?", candidateItemIds: ["r99.1"] },
    "Which?",
  );
  assert.equal(result.status, "unresolved_question");
  assert.equal(result.reason, "invalid_item_id");
  assert.deepEqual(result.assignments, []);
});
test("a spoken amount proposal does not mutate receipt until confirmed", () => {
  const state = fresh();
  state.receipt.rows[2].amountMinor = null;
  state.receipt.rows[2].uncertain = true;
  const original = structuredClone(state);
  const confirmation = {
    field: "row",
    rowId: "r3",
    amountMinor: 1240,
    name: null,
  };
  validateIntent(
    state,
    { ...intent([]), confirmation },
    "The pasta is twelve euros forty.",
  );
  assert.deepEqual(state, original);
  const confirmed = confirmReceipt(state, confirmation);
  assert.equal(confirmed.receipt.rows[2].amountMinor, 1240);
  assert.equal(confirmed.receipt.rows[2].uncertain, false);
  assert.equal(calculate(confirmed).settled, false);
});
test("absent subtotal and service stay unresolved until explicitly confirmed", () => {
  let state = fresh();
  state.receipt.subtotalMinor = null;
  state.receipt.subtotalStatus = "not_printed";
  state.receipt.serviceMinor = null;
  state.receipt.serviceStatus = "not_printed";
  state.receipt.totalMinor = 4340;
  state.receipt.totalStatus = "printed";
  state.receipt.warnings = ["No service charge is explicitly printed."];
  state = applyAssignments(state, [
    {
      itemIds: itemsOf(state.receipt).map((item) => item.id),
      personIds: ["p1"],
    },
  ]);
  assert.equal(calculate(state).settled, false);
  state = confirmReceipt(state, {
    field: "subtotalMinor",
    rowId: null,
    amountMinor: 4340,
    name: null,
  });
  assert.equal(state.receipt.subtotalStatus, "confirmed");
  assert.equal(calculate(state).settled, false);
  state = confirmReceipt(state, {
    field: "serviceMinor",
    rowId: null,
    amountMinor: 0,
    name: null,
  });
  assert.equal(state.receipt.serviceStatus, "confirmed");
  assert.deepEqual(state.receipt.warnings, []);
  assert.equal(calculate(state).settled, true);
  assert.equal(calculate(state).sum, 4340);
});
