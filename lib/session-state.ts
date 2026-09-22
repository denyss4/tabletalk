import type { Person, SplitState } from "./split";

export function renamePeople(people: Person[], names: string[]): Person[] {
  const clean = names.map((name) => name.trim());
  if (
    clean.length !== people.length ||
    clean.some((name) => !name || name.length > 30) ||
    new Set(clean.map((name) => name.toLowerCase())).size !== clean.length
  ) {
    throw new Error("Enter three different names, up to 30 characters each.");
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

export function restoreSplitSnapshot(
  current: SplitState,
  snapshot: SplitState,
): SplitState {
  return {
    ...structuredClone(snapshot),
    revision: current.revision + 1,
  };
}
