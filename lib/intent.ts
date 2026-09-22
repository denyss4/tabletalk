import { z } from "zod";
import {
  intentReasonSchema,
  intentSchema,
  type Confirmation,
  type Intent,
  type IntentReason,
} from "./schemas.ts";
import {
  applyAssignments,
  itemsOf,
  isMinor,
  type SplitState,
} from "./split.ts";

export type ValidatedIntent = Omit<
  Intent,
  "status" | "reason" | "question"
> &
  (
    | { status: "ready"; reason: null; question: null }
    | {
        status: "unresolved_question";
        reason: IntentReason;
        question: string;
      }
  );

const ORDINAL =
  "(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|number\\s*\\d+|#\\s*\\d+|\\d+(?:st|nd|rd|th))";

const reasonMessages: Record<IntentReason, string> = {
  invalid_intent_shape:
    "I could not safely interpret that command. Please repeat it.",
  invalid_item_id:
    "I could not match that item to this receipt. Please name a listed item.",
  invalid_person_id:
    "I could not match that person to the people at this table.",
  duplicate_item_id:
    "That command tried to allocate the same item more than once. Please clarify one owner.",
  invalid_row_id:
    "I could not match that detail to a receipt row. Please choose a highlighted row.",
  impossible_assignment:
    "That allocation is not possible for this receipt. Please clarify who had the item.",
  ambiguous_repeated_item: "Please clarify which repeated item you mean.",
  clarification_required: "Please answer the clarification before continuing.",
};

function unresolved(
  reason: IntentReason,
  question = reasonMessages[reason],
): ValidatedIntent {
  return {
    assignments: [],
    question,
    candidateItemIds: [],
    candidatePersonIds: [],
    confirmation: null,
    status: "unresolved_question",
    reason,
  };
}

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

function stateBoundIntentSchema(state: SplitState) {
  const validItemIds = new Set(itemsOf(state.receipt).map((item) => item.id));
  const validPersonIds = new Set(state.people.map((person) => person.id));
  const validRowIds = new Set(state.receipt.rows.map((row) => row.id));

  const issue = (
    context: z.RefinementCtx,
    reason: IntentReason,
    path: (string | number)[],
  ) =>
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: reason,
      path,
    });

  return intentSchema.superRefine((intent, context) => {
    const assigned = new Set<string>();

    intent.assignments.forEach((assignment, assignmentIndex) => {
      assignment.itemIds.forEach((itemId, itemIndex) => {
        const path = ["assignments", assignmentIndex, "itemIds", itemIndex];
        if (!validItemIds.has(itemId))
          issue(context, "invalid_item_id", path);
        if (assigned.has(itemId))
          issue(context, "duplicate_item_id", path);
        assigned.add(itemId);
      });
      assignment.personIds.forEach((personId, personIndex) => {
        if (!validPersonIds.has(personId))
          issue(context, "invalid_person_id", [
            "assignments",
            assignmentIndex,
            "personIds",
            personIndex,
          ]);
      });
      if (new Set(assignment.personIds).size !== assignment.personIds.length)
        issue(context, "impossible_assignment", [
          "assignments",
          assignmentIndex,
          "personIds",
        ]);
    });

    intent.candidateItemIds.forEach((itemId, index) => {
      if (!validItemIds.has(itemId))
        issue(context, "invalid_item_id", ["candidateItemIds", index]);
    });
    intent.candidatePersonIds.forEach((personId, index) => {
      if (!validPersonIds.has(personId))
        issue(context, "invalid_person_id", ["candidatePersonIds", index]);
    });

    if (
      intent.confirmation?.field === "row" &&
      (!intent.confirmation.rowId ||
        !validRowIds.has(intent.confirmation.rowId))
    )
      issue(context, "invalid_row_id", ["confirmation", "rowId"]);

    if (intent.candidateItemIds.length && !intent.question)
      issue(context, "invalid_intent_shape", ["question"]);
  });
}

function issueReason(error: z.ZodError): IntentReason {
  const reason = error.issues.find((issue) =>
    intentReasonSchema.options.includes(issue.message as IntentReason),
  )?.message;
  return reason && intentReasonSchema.safeParse(reason).success
    ? (reason as IntentReason)
    : "invalid_intent_shape";
}

/**
 * Treat model output as untrusted. The payload is first validated structurally
 * and against the current receipt IDs. Only then may deterministic allocation
 * code inspect it. Invalid model output becomes an explicit unresolved state.
 */
export function validateIntent(
  state: SplitState,
  rawIntent: unknown,
  transcript: string,
  pending?: Intent | null,
): ValidatedIntent {
  const parsed = stateBoundIntentSchema(state).safeParse(rawIntent);
  if (!parsed.success) return unresolved(issueReason(parsed.error));

  const result = structuredClone(parsed.data);
  try {
    applyAssignments(state, result.assignments);
  } catch {
    return unresolved("impossible_assignment");
  }

  // The occurrence or collection words must refer to this repeated item. A
  // bare ordinal is safe only when it answers the active clarification.
  const items = itemsOf(state.receipt);
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
      const question = `Which ${name} did ${
        state.people
          .filter((person) => touched[0].personIds.includes(person.id))
          .map((person) => person.name)
          .join(" and ") || "you"
      } mean?`;
      result.question = question;
      result.candidateItemIds = groupIds;
      result.candidatePersonIds = touched[0].personIds;
      return {
        ...result,
        question,
        status: "unresolved_question",
        reason: "ambiguous_repeated_item",
      };
    }
  }

  const question = result.question;
  if (question !== null) {
    return {
      ...result,
      question,
      status: "unresolved_question",
      reason: "clarification_required",
    };
  }

  return { ...result, question: null, status: "ready", reason: null };
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
      | "subtotalStatus"
      | "serviceStatus"
      | "totalStatus";
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
