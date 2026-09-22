import { describe, expect, it } from "vitest";
import { validateIntent } from "./intent";
import type { Intent } from "./schemas";
import type { SplitState } from "./split";

function freshState(): SplitState {
  return {
    receipt: {
      merchant: "Intent Test Cafe",
      currency: "EUR",
      rows: [
        {
          id: "r1",
          name: "Soup",
          quantity: 1,
          amountMinor: 600,
          uncertain: false,
        },
        {
          id: "r2",
          name: "Salad",
          quantity: 1,
          amountMinor: 900,
          uncertain: false,
        },
      ],
      subtotalMinor: 1_500,
      subtotalStatus: "printed",
      serviceMinor: 150,
      serviceStatus: "printed",
      totalMinor: 1_650,
      totalStatus: "printed",
      warnings: [],
    },
    people: [
      { id: "guest-1", name: "Rae" },
      { id: "guest-2", name: "Kai" },
      { id: "guest-3", name: "Noa" },
    ],
    allocation: {},
    revision: 0,
  };
}

function intent(assignments: Intent["assignments"]): Intent {
  return {
    assignments,
    question: null,
    candidateItemIds: [],
    candidatePersonIds: [],
    confirmation: null,
  };
}

describe("validateIntent", () => {
  it("accepts IDs that exist in the current receipt state", () => {
    const result = validateIntent(
      freshState(),
      intent([{ itemIds: ["r1.1"], personIds: ["guest-1"] }]),
      "Rae had the soup.",
    );

    expect(result.status).toBe("ready");
    expect(result.reason).toBeNull();
    expect(result.assignments).toEqual([
      { itemIds: ["r1.1"], personIds: ["guest-1"] },
    ]);
  });

  it("turns a hallucinated item ID into an unresolved question", () => {
    const result = validateIntent(
      freshState(),
      intent([{ itemIds: ["made-up.1"], personIds: ["guest-1"] }]),
      "Rae had the soup.",
    );

    expect(result).toMatchObject({
      status: "unresolved_question",
      reason: "invalid_item_id",
      assignments: [],
      candidateItemIds: [],
      confirmation: null,
    });
    expect(result.question).toContain("match that item");
  });

  it("rejects hallucinated person and candidate IDs", () => {
    const unknownPerson = validateIntent(
      freshState(),
      intent([{ itemIds: ["r1.1"], personIds: ["guest-99"] }]),
      "Someone had the soup.",
    );
    const unknownCandidate = validateIntent(
      freshState(),
      {
        ...intent([]),
        question: "Which item?",
        candidateItemIds: ["r99.1"],
      },
      "Which item?",
    );

    expect(unknownPerson.reason).toBe("invalid_person_id");
    expect(unknownCandidate.reason).toBe("invalid_item_id");
  });

  it("rejects duplicate item actions so an item cannot be counted twice", () => {
    const result = validateIntent(
      freshState(),
      intent([
        { itemIds: ["r1.1"], personIds: ["guest-1"] },
        { itemIds: ["r1.1"], personIds: ["guest-2"] },
      ]),
      "Rae and Kai had the soup.",
    );

    expect(result.status).toBe("unresolved_question");
    expect(result.reason).toBe("duplicate_item_id");
    expect(result.assignments).toEqual([]);
  });

  it("rejects structurally invalid model output before deterministic math", () => {
    const result = validateIntent(
      freshState(),
      { assignments: "r1.1" },
      "Rae had the soup.",
    );

    expect(result.status).toBe("unresolved_question");
    expect(result.reason).toBe("invalid_intent_shape");
    expect(result.assignments).toEqual([]);
  });

  it("returns unresolved when the business rule allows only one shared item", () => {
    const result = validateIntent(
      freshState(),
      intent([
        { itemIds: ["r1.1"], personIds: ["guest-1", "guest-2"] },
        { itemIds: ["r2.1"], personIds: ["guest-2", "guest-3"] },
      ]),
      "Rae and Kai shared the soup and Kai and Noa shared the salad.",
    );

    expect(result.status).toBe("unresolved_question");
    expect(result.reason).toBe("impossible_assignment");
    expect(result.assignments).toEqual([]);
  });
});
