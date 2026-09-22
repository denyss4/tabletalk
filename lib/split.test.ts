import { describe, expect, it } from "vitest";
import {
  apportion,
  applyAssignments,
  calculate,
  type Person,
  type Receipt,
  type SplitState,
} from "./split";

function receipt(
  rows: Receipt["rows"],
  serviceMinor: number,
): Receipt {
  const subtotalMinor = rows.reduce(
    (total, row) => total + (row.amountMinor ?? 0),
    0,
  );
  return {
    merchant: "Unit Test Cafe",
    currency: "EUR",
    rows,
    subtotalMinor,
    subtotalStatus: "printed",
    serviceMinor,
    serviceStatus: "printed",
    totalMinor: subtotalMinor + serviceMinor,
    totalStatus: "printed",
    warnings: [],
  };
}

function state(
  people: Person[],
  rows: Receipt["rows"],
  serviceMinor = 0,
): SplitState {
  return {
    people,
    receipt: receipt(rows, serviceMinor),
    allocation: {},
    revision: 0,
  };
}

const row = (id: string, amountMinor: number): Receipt["rows"][number] => ({
  id,
  name: `Item ${id}`,
  quantity: 1,
  amountMinor,
  uncertain: false,
});

describe("apportion", () => {
  it("splits EUR 10.00 three ways and awards the remaining cent by index", () => {
    const shares = apportion(1_000, [1, 1, 1]);

    expect(shares).toEqual([334, 333, 333]);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1_000);
  });

  it("supports any roster length", () => {
    expect(apportion(1_003, [1, 1, 1, 1])).toEqual([251, 251, 251, 250]);
  });
});

describe("calculate", () => {
  it("splits service charge in proportion to integer-cent subtotals", () => {
    const people = [
      { id: "user-a", name: "Renamed A" },
      { id: "user-b", name: "Renamed B" },
      { id: "user-c", name: "Renamed C" },
    ];
    const input = state(people, [row("r1", 1_000), row("r2", 2_000)], 300);
    const allocated = applyAssignments(input, [
      { itemIds: ["r1.1"], personIds: ["user-a"] },
      { itemIds: ["r2.1"], personIds: ["user-b"] },
    ]);

    const result = calculate(allocated);

    expect(result.settled).toBe(true);
    expect(result.people.map((person) => person.subtotal)).toEqual([
      1_000, 2_000, 0,
    ]);
    expect(result.people.map((person) => person.service)).toEqual([100, 200, 0]);
    expect(result.people.map((person) => person.total)).toEqual([
      1_100, 2_200, 0,
    ]);
    expect(result.sum).toBe(3_300);
  });

  it("uses stable roster position for equal service remainders after renaming", () => {
    const people = [
      { id: "stable-z", name: "Zoe" },
      { id: "stable-a", name: "Ada" },
      { id: "stable-m", name: "Mo" },
    ];
    const input = state(
      people,
      [row("r1", 100), row("r2", 100), row("r3", 100)],
      1,
    );
    const allocated = applyAssignments(input, [
      { itemIds: ["r1.1"], personIds: ["stable-z"] },
      { itemIds: ["r2.1"], personIds: ["stable-a"] },
      { itemIds: ["r3.1"], personIds: ["stable-m"] },
    ]);

    expect(calculate(allocated).people.map((person) => person.service)).toEqual([
      1, 0, 0,
    ]);
  });

  it("calculates a four-person shared item without a hardcoded roster", () => {
    const people = [
      { id: "u1", name: "One" },
      { id: "u2", name: "Two" },
      { id: "u3", name: "Three" },
      { id: "u4", name: "Four" },
    ];
    const allocated = applyAssignments(state(people, [row("r1", 1_000)]), [
      { itemIds: ["r1.1"], personIds: people.map((person) => person.id) },
    ]);

    expect(calculate(allocated).people.map((person) => person.total)).toEqual([
      250, 250, 250, 250,
    ]);
  });
});
