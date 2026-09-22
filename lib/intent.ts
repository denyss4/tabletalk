import type { Confirmation, Intent } from "./schemas";
import {
  applyAssignments,
  itemsOf,
  isMinor,
  type SplitState,
} from "./split.ts";

const ORDINAL =
  "(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|number\\s*\\d+|#\\s*\\d+|\\d+(?:st|nd|rd|th))";

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

function explicitlyNamesOccurrence(transcript: string, itemName: string) {
  const name = escapePattern(itemName.trim());
  return new RegExp(
    `(?:\\b${ORDINAL}\\s+(?:of\\s+the\\s+)?${name}s?\\b|\\b${name}s?\\s+${ORDINAL}\\b)`,
    "i",
  ).test(transcript);
}

function explicitlyNamesCollection(transcript: string, itemName: string) {
  const name = escapePattern(itemName.trim());
  return new RegExp(
    `(?:\\b(?:both|all|two|three)\\s+(?:of\\s+the\\s+)?${name}s?\\b|\\b${name}s?\\s+(?:both|all)\\b)`,
    "i",
  ).test(transcript);
}

function pendingQuestionMatches(
  pending: Intent | null | undefined,
  groupIds: string[],
  personIds: string[],
) {
  if (!pending?.candidateItemIds.length) return false;
  const candidates = new Set(pending.candidateItemIds);
  const people = new Set(pending.candidatePersonIds);
  return (
    groupIds.every((id) => candidates.has(id)) &&
    personIds.every((id) => people.has(id))
  );
}

export function validateIntent(
  state: SplitState,
  intent: Intent,
  transcript: string,
  pending?: Intent | null,
): Intent {
  const result = structuredClone(intent);
  const items = itemsOf(state.receipt);
  const ids = new Set(items.map((item) => item.id));
  if (
    result.candidateItemIds.some((id) => !ids.has(id)) ||
    result.candidatePersonIds.some(
      (id) => !state.people.some((person) => person.id === id),
    )
  ) {
    throw new Error(
      "The clarification refers to an unknown item or person. Please try again.",
    );
  }
  applyAssignments(state, result.assignments);

  // The occurrence or collection words must refer to this repeated item. A
  // bare ordinal is safe only when it answers the active clarification.
  const names = [
    ...new Set(state.receipt.rows.map((row) => row.name.toLowerCase())),
  ];
  for (const name of names) {
    const group = items.filter(
      (item) =>
        state.receipt.rows
          .find((row) => row.id === item.rowId)
          ?.name.toLowerCase() === name,
    );
    if (group.length < 2) continue;
    const touched = result.assignments.filter((assignment) =>
      assignment.itemIds.some((id) => group.some((item) => item.id === id)),
    );
    if (!touched.length) continue;

    const groupIds = group.map((item) => item.id);
    const answeredPending = pendingQuestionMatches(
      pending,
      groupIds,
      touched[0].personIds,
    );
    const occurrenceIsClear =
      explicitlyNamesOccurrence(transcript, name) || answeredPending;
    const collectionIsClear =
      touched.length === 1 &&
      group.every((item) => touched[0].itemIds.includes(item.id)) &&
      (explicitlyNamesCollection(transcript, name) || answeredPending);
    if (!occurrenceIsClear && !collectionIsClear) {
      result.assignments = result.assignments
        .map((assignment) => ({
          ...assignment,
          itemIds: assignment.itemIds.filter(
            (id) => !group.some((item) => item.id === id),
          ),
        }))
        .filter((assignment) => assignment.itemIds.length);
      result.question = `Which ${name} did ${
        state.people
          .filter((person) => touched[0].personIds.includes(person.id))
          .map((person) => person.name)
          .join(" and ") || "you"
      } mean?`;
      result.candidateItemIds = groupIds;
      result.candidatePersonIds = touched[0].personIds;
      break;
    }
  }

  if (
    result.confirmation?.field === "row" &&
    !state.receipt.rows.some((row) => row.id === result.confirmation?.rowId)
  )
    throw new Error("Unknown receipt row.");
  if (result.candidateItemIds.length && !result.question)
    throw new Error("Missing clarification question.");
  return result;
}

export function confirmReceipt(
  state: SplitState,
  confirmation: Confirmation,
): SplitState {
  const next = structuredClone(state);
  if (confirmation.amountMinor !== null && !isMinor(confirmation.amountMinor))
    throw new Error("Invalid amount.");
  if (confirmation.field === "row") {
    const row = next.receipt.rows.find(
      (candidate) => candidate.id === confirmation.rowId,
    );
    if (!row) throw new Error("Unknown row.");
    if (confirmation.name !== null) row.name = confirmation.name;
    if (confirmation.amountMinor !== null)
      row.amountMinor = confirmation.amountMinor;
    if (row.amountMinor === null)
      throw new Error("Read the amount aloud before confirming.");
    row.uncertain = false;
  } else {
    if (confirmation.amountMinor === null)
      throw new Error("Read the amount aloud before confirming.");
    next.receipt[confirmation.field] = confirmation.amountMinor;
    const statusField = confirmation.field.replace("Minor", "Status") as
      "subtotalStatus" | "serviceStatus" | "totalStatus";
    next.receipt[statusField] = "confirmed";
    if (confirmation.field === "serviceMinor")
      next.receipt.warnings = next.receipt.warnings.filter(
        (warning) =>
          warning.toLowerCase() !== "no service charge is explicitly printed.",
      );
  }
  next.revision++;
  return next;
}
