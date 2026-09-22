import { z } from "zod";

export const minor = z.number().int().min(0).max(100_000_000);
const receiptFieldStatus = z.enum([
  "printed",
  "not_printed",
  "unreadable",
  "confirmed",
]);

export const receiptSchema = z
  .object({
    merchant: z.string().max(100),
    currency: z.string().max(5),
    rows: z
      .array(
        z
          .object({
            id: z.string().max(30),
            name: z.string().min(1).max(100),
            quantity: z.number().int().min(1).max(10),
            amountMinor: minor.nullable(),
            uncertain: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    subtotalMinor: minor.nullable(),
    subtotalStatus: receiptFieldStatus,
    serviceMinor: minor.nullable(),
    serviceStatus: receiptFieldStatus,
    totalMinor: minor.nullable(),
    totalStatus: receiptFieldStatus,
    warnings: z.array(z.string().max(300)).max(10),
  })
  .strict();

export const personIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,29}$/);

export const stateSchema = z
  .object({
    receipt: receiptSchema,
    people: z
      .array(
        z
          .object({
            id: personIdSchema,
            name: z.string().min(1).max(30),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    allocation: z.record(z.array(personIdSchema).max(20)),
    revision: z.number().int().nonnegative(),
  })
  .strict();

export const assignmentSchema = z
  .object({
    itemIds: z.array(z.string().max(30)).min(1).max(100),
    personIds: z.array(personIdSchema).max(20),
  })
  .strict();

export const confirmationSchema = z
  .object({
    field: z.enum(["row", "subtotalMinor", "serviceMinor", "totalMinor"]),
    rowId: z.string().nullable(),
    amountMinor: minor.nullable(),
    name: z.string().max(100).nullable(),
  })
  .strict();

export const intentStatusSchema = z.enum(["ready", "unresolved_question"]);
export const intentReasonSchema = z.enum([
  "invalid_intent_shape",
  "invalid_item_id",
  "invalid_person_id",
  "duplicate_item_id",
  "invalid_row_id",
  "impossible_assignment",
  "ambiguous_repeated_item",
  "clarification_required",
]);

// status and reason are added by validateIntent. They are optional here so the
// same strict schema can parse both raw model output and a pending validated
// intent sent back by the browser.
export const intentSchema = z
  .object({
    assignments: z.array(assignmentSchema).max(100),
    question: z.string().trim().min(1).max(400).nullable(),
    candidateItemIds: z.array(z.string()).max(100),
    candidatePersonIds: z.array(personIdSchema).max(20),
    confirmation: confirmationSchema.nullable(),
    status: intentStatusSchema.optional(),
    reason: intentReasonSchema.nullable().optional(),
  })
  .strict();

export type Intent = z.infer<typeof intentSchema>;
export type Confirmation = z.infer<typeof confirmationSchema>;
export type IntentReason = z.infer<typeof intentReasonSchema>;

const object = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const str = { type: "string" };
const strings = { type: "array", items: str };
const amount = { type: ["integer", "null"] };
const extractedFieldStatus = {
  type: "string",
  enum: ["printed", "not_printed", "unreadable"],
};

export const receiptJsonSchema = object({
  merchant: str,
  currency: str,
  rows: {
    type: "array",
    items: object({
      name: str,
      quantity: { type: "integer" },
      amountMinor: amount,
      uncertain: { type: "boolean" },
    }),
  },
  subtotalMinor: amount,
  subtotalStatus: extractedFieldStatus,
  serviceMinor: amount,
  serviceStatus: extractedFieldStatus,
  totalMinor: amount,
  totalStatus: extractedFieldStatus,
  warnings: strings,
});

// The model never supplies status/reason. Those fields are derived only after
// validating the model payload against the current receipt state.
export const intentJsonSchema = object({
  assignments: {
    type: "array",
    items: object({ itemIds: strings, personIds: strings }),
  },
  question: { type: ["string", "null"] },
  candidateItemIds: strings,
  candidatePersonIds: strings,
  confirmation: {
    anyOf: [
      { type: "null" },
      object({
        field: {
          type: "string",
          enum: ["row", "subtotalMinor", "serviceMinor", "totalMinor"],
        },
        rowId: { type: ["string", "null"] },
        amountMinor: amount,
        name: { type: ["string", "null"] },
      }),
    ],
  },
});
