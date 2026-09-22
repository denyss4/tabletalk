export type Person = { id: string; name: string };
export type Row = {
  id: string;
  name: string;
  quantity: number;
  amountMinor: number | null;
  uncertain: boolean;
};
export type ReceiptFieldStatus =
  "printed" | "not_printed" | "unreadable" | "confirmed";
export type Receipt = {
  merchant: string;
  currency: string;
  rows: Row[];
  subtotalMinor: number | null;
  subtotalStatus: ReceiptFieldStatus;
  serviceMinor: number | null;
  serviceStatus: ReceiptFieldStatus;
  totalMinor: number | null;
  totalStatus: ReceiptFieldStatus;
  warnings: string[];
};
export type Item = {
  id: string;
  rowId: string;
  name: string;
  amountMinor: number | null;
  uncertain: boolean;
};
export type Allocation = Record<string, string[]>;
export type SplitState = {
  receipt: Receipt;
  people: Person[];
  allocation: Allocation;
  revision: number;
};
export type Assignment = { itemIds: string[]; personIds: string[] };
export const MAX_RECEIPT_ROWS = 10;
export const MAX_RECEIPT_ITEMS = 10;
export const PEOPLE: Person[] = [
  { id: "p1", name: "Alex" },
  { id: "p2", name: "Sam" },
  { id: "p3", name: "Lee" },
];
export const money = (amount: number | null) =>
  amount === null
    ? "Unreadable"
    : new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
      }).format(amount / 100);
export const receiptAmountLabel = (
  amount: number | null,
  status: ReceiptFieldStatus,
) =>
  amount !== null
    ? money(amount)
    : status === "not_printed"
      ? "Not printed"
      : "Unreadable";
export function isMinor(n: unknown): n is number {
  return (
    typeof n === "number" &&
    Number.isSafeInteger(n) &&
    n >= 0 &&
    n <= 100_000_000
  );
}
// Largest remainder; supplied stable order breaks ties. BigInt keeps products exact.
export function apportion(total: number, weights: number[]): number[] {
  if (!isMinor(total) || !weights.length || weights.some((w) => !isMinor(w)))
    throw new Error("Invalid money or weights.");
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (!sum) {
    if (total)
      throw new Error("Cannot distribute a charge over zero subtotal.");
    return weights.map(() => 0);
  }
  const values = weights.map((w) => Number((BigInt(total) * BigInt(w)) / sum));
  const order = weights
    .map((w, i) => ({ i, rem: (BigInt(total) * BigInt(w)) % sum }))
    .sort((a, b) => (a.rem === b.rem ? a.i - b.i : a.rem > b.rem ? -1 : 1));
  const remainder = total - values.reduce((a, b) => a + b, 0);
  for (let j = 0; j < remainder; j++) values[order[j].i]++;
  return values;
}
export function validateReceipt(r: Receipt): void {
  if (r.currency !== "EUR")
    throw new Error(
      "This prototype supports EUR receipts. Please use a EUR receipt.",
    );
  if (
    !Array.isArray(r.rows) ||
    r.rows.length < 1 ||
    r.rows.length > MAX_RECEIPT_ROWS
  )
    throw new Error(`Use a receipt with one to ${MAX_RECEIPT_ROWS} item rows.`);
  if (new Set(r.rows.map((x) => x.id)).size !== r.rows.length)
    throw new Error("Duplicate receipt row.");
  for (const row of r.rows) {
    if (
      !row.id ||
      !row.name?.trim() ||
      !Number.isInteger(row.quantity) ||
      row.quantity < 1 ||
      row.quantity > 10 ||
      (row.amountMinor !== null && !isMinor(row.amountMinor))
    )
      throw new Error(
        "A receipt row could not be read reliably. Please retake the photo.",
      );
  }
  const itemCount = r.rows.reduce((total, row) => total + row.quantity, 0);
  if (itemCount > MAX_RECEIPT_ITEMS)
    throw new Error(
      `This receipt contains ${itemCount} individual items across ${r.rows.length} printed rows. This prototype supports up to ${MAX_RECEIPT_ITEMS}. Please use a shorter receipt.`,
    );
  for (const [amount, status] of [
    [r.subtotalMinor, r.subtotalStatus],
    [r.serviceMinor, r.serviceStatus],
    [r.totalMinor, r.totalStatus],
  ] as const) {
    if (amount !== null && !isMinor(amount))
      throw new Error("Invalid receipt amount.");
    if ((status === "printed" || status === "confirmed") !== (amount !== null))
      throw new Error("Receipt amount and source status do not match.");
  }
}
export function itemsOf(receipt: Receipt): Item[] {
  validateReceipt(receipt);
  const all = receipt.rows.flatMap((row) => {
    const amounts =
      row.amountMinor === null
        ? Array(row.quantity).fill(null)
        : apportion(row.amountMinor, Array(row.quantity).fill(1));
    return amounts.map((amountMinor, index) => ({
      id: `${row.id}.${index + 1}`,
      rowId: row.id,
      name: row.name,
      amountMinor,
      uncertain: row.uncertain,
    }));
  });
  const counts = new Map<string, number>();
  return all.map((item) => {
    const key = item.name.toLowerCase();
    const repeat = all.filter((x) => x.name.toLowerCase() === key).length > 1;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return {
      ...item,
      name: repeat ? `${item.name} #${counts.get(key)}` : item.name,
    };
  });
}
export function applyAssignments(
  state: SplitState,
  assignments: Assignment[],
): SplitState {
  const itemIds = new Set(itemsOf(state.receipt).map((x) => x.id));
  const people = new Set(state.people.map((x) => x.id));
  const next = structuredClone(state.allocation);
  const touched = new Set<string>();
  for (const assignment of assignments) {
    if (
      !assignment.itemIds.length ||
      assignment.personIds.length > 3 ||
      new Set(assignment.personIds).size !== assignment.personIds.length ||
      assignment.personIds.some((id) => !people.has(id))
    )
      throw new Error("Choose people already at this table.");
    for (const id of assignment.itemIds) {
      if (!itemIds.has(id) || touched.has(id))
        throw new Error(
          "A command refers to an unknown or duplicate item. Please clarify.",
        );
      touched.add(id);
      next[id] = state.people
        .filter((p) => assignment.personIds.includes(p.id))
        .map((p) => p.id);
    }
  }
  if (Object.values(next).filter((owners) => owners.length > 1).length > 1)
    throw new Error("This prototype supports one shared item per receipt.");
  return { ...state, allocation: next, revision: state.revision + 1 };
}
export function calculate(state: SplitState) {
  validateReceipt(state.receipt);
  if (
    state.people.length < 1 ||
    state.people.length > 3 ||
    new Set(state.people.map((p) => p.id)).size !== state.people.length
  )
    throw new Error("Use one to three distinct people.");
  const items = itemsOf(state.receipt);
  const issues: string[] = [...state.receipt.warnings];
  const knownIds = new Set(items.map((x) => x.id));
  const subtotals = state.people.map(() => 0);
  let assigned = 0;
  for (const id of Object.keys(state.allocation))
    if (!knownIds.has(id)) issues.push("Allocation contains an unknown item.");
  for (const item of items) {
    const owners = state.allocation[item.id] ?? [];
    if (!owners.length) continue;
    if (
      new Set(owners).size !== owners.length ||
      owners.some((id) => !state.people.some((p) => p.id === id))
    ) {
      issues.push(`Check owners of ${item.name}.`);
      continue;
    }
    assigned++;
    if (item.amountMinor !== null) {
      const shares = apportion(
        item.amountMinor,
        state.people.map((p) => (owners.includes(p.id) ? 1 : 0)),
      );
      shares.forEach((n, i) => {
        subtotals[i] += n;
      });
    }
  }
  const unreadable = items.filter((x) => x.amountMinor === null || x.uncertain);
  if (unreadable.length) issues.push("Confirm the highlighted receipt rows.");
  if (assigned !== items.length)
    issues.push(
      `${items.length - assigned} item${items.length - assigned === 1 ? "" : "s"} still need an owner.`,
    );
  if (Object.values(state.allocation).filter((x) => x.length > 1).length > 1)
    issues.push("Only one shared item is supported.");
  const r = state.receipt;
  const subtotal = r.rows.reduce((n, row) => n + (row.amountMinor ?? 0), 0);
  if (r.subtotalMinor === null)
    issues.push(
      r.subtotalStatus === "not_printed"
        ? "Subtotal is not printed. Confirm the item total before finishing."
        : "The subtotal is unreadable. Say the amount or upload a clearer photo.",
    );
  if (r.serviceMinor === null)
    issues.push(
      r.serviceStatus === "not_printed"
        ? "Service charge is not printed. Confirm that it is zero before finishing."
        : "The service charge is unreadable. Say the amount or upload a clearer photo.",
    );
  if (r.totalMinor === null)
    issues.push(
      r.totalStatus === "not_printed"
        ? "Receipt total is not printed. Say the total before finishing."
        : "The receipt total is unreadable. Say the amount or upload a clearer photo.",
    );
  if (
    !unreadable.length &&
    r.subtotalMinor !== null &&
    subtotal !== r.subtotalMinor
  )
    issues.push("The rows do not match the printed subtotal.");
  if (
    r.subtotalMinor !== null &&
    r.serviceMinor !== null &&
    r.totalMinor !== null &&
    r.subtotalMinor + r.serviceMinor !== r.totalMinor
  )
    issues.push(
      "The subtotal and service charge do not match the printed total.",
    );
  if (!subtotal && (r.serviceMinor ?? 0) > 0)
    issues.push("A service charge needs a positive item subtotal.");
  const settled = issues.length === 0;
  const service = settled
    ? apportion(r.serviceMinor!, subtotals)
    : state.people.map(() => 0);
  const people = state.people.map((p, i) => ({
    ...p,
    subtotal: subtotals[i],
    service: service[i],
    total: subtotals[i] + service[i],
  }));
  const sum = people.reduce((n, p) => n + p.total, 0);
  if (settled && sum !== r.totalMinor)
    throw new Error("Balance verification failed.");
  return {
    settled,
    people,
    assigned,
    itemCount: items.length,
    issues: [...new Set(issues)],
    subtotal,
    sum,
  };
}
