import type { Person, SplitState } from "./split";

export const DEFAULT_PEOPLE = [
  { id: "p1", name: "Alex" },
  { id: "p2", name: "Sam" },
  { id: "p3", name: "Lee" },
] as const satisfies readonly Person[];

export function createDefaultPeople(): Person[] {
  return DEFAULT_PEOPLE.map((person) => ({ ...person }));
}

export function renamePeople(people: Person[], names: string[]): Person[] {
  const clean = names.map((name) => name.trim());
  if (
    clean.length !== people.length ||
    clean.some((name) => !name || name.length > 30) ||
    new Set(clean.map((name) => name.toLowerCase())).size !== clean.length
  ) {
    throw new Error(
      "Enter one different name for each person, up to 30 characters each.",
    );
  }

  return people.map((person, index) => ({
    ...person,
    name: clean[index],
  }));
}

export function renameSplitPeople(
  state: SplitState,
  names: string[],
): SplitState {
  return {
    ...state,
    people: renamePeople(state.people, names),
    revision: state.revision + 1,
  };
}

export function renameReceiptMerchant(
  state: SplitState,
  merchant: string,
): SplitState {
  const clean = merchant.trim();
  if (!clean || clean.length > 80) {
    throw new Error("Enter a restaurant name up to 80 characters.");
  }

  return {
    ...state,
    receipt: { ...state.receipt, merchant: clean },
    revision: state.revision + 1,
  };
}

export function restoreSplitSnapshot(
  current: SplitState,
  snapshot: SplitState,
): SplitState {
  return {
    ...structuredClone(snapshot),
    revision: current.revision + 1,
  };
}
