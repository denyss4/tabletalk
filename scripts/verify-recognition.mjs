// Calls the running app and incurs provider charges. Never reads or prints secrets.
import fs from "node:fs";
import { PEOPLE, applyAssignments, calculate, itemsOf } from "../lib/split.ts";
import { sampleReceipt } from "../lib/sample.ts";
const base = process.env.TABLETALK_URL || "http://localhost:5173";
const status = await fetch(base + "/api/status").then((r) => r.json());
const voices = JSON.parse(
  fs.readFileSync("public/samples/voices.json", "utf8").replace(/^\uFEFF/, ""),
);
const results = {
  speechMode: status.speechMode,
  provider: status.provider,
  testedAt: new Date().toISOString(),
  kind: "live API integration with recorded-fixture durations; physical microphone capture remains a deployment check",
  results: [],
  dialogues: [],
};
const save = () =>
  fs.writeFileSync(
    "evidence/live-recognition-results.json",
    JSON.stringify(results, null, 2),
  );
async function post(name, path, body, headers) {
  const start = Date.now();
  const response = await fetch(base + path, {
    method: "POST",
    body,
    headers,
    signal: AbortSignal.timeout(100_000),
  });
  const data = await response.json();
  const record = {
    name,
    status: response.status,
    elapsedMs: Date.now() - start,
    ...data,
  };
  results.results.push(record);
  save();
  console.log(
    JSON.stringify({
      name,
      status: response.status,
      elapsedMs: record.elapsedMs,
      error: data.error,
      code: data.code,
    }),
  );
  return record;
}
async function photo(name, file) {
  const image =
    "data:image/" +
    (file.endsWith(".png") ? "png" : "jpeg") +
    ";base64," +
    fs.readFileSync(file).toString("base64");
  return post(name, "/api/receipt", JSON.stringify({ image }), {
    "Content-Type": "application/json",
  });
}
function duration(buffer) {
  let rate, bytes;
  for (let i = 12; i + 8 <= buffer.length;) {
    const id = buffer.toString("ascii", i, i + 4);
    const size = buffer.readUInt32LE(i + 4);
    if (id === "fmt ") rate = buffer.readUInt32LE(i + 16);
    if (id === "data") bytes = size;
    i += 8 + size + (size % 2);
  }
  if (!rate || !bytes) throw new Error("Invalid WAV");
  return bytes / rate;
}
async function voice(name, state) {
  if (status.speechMode === "browser") {
    const transcript = voices.find((v) => v.name === name).text;
    const result = await post(
      name,
      "/api/voice",
      JSON.stringify({ transcript, state, pending: null }),
      { "Content-Type": "application/json" },
    );
    result.transcriptionSource =
      "supplied expected transcript; browser microphone recognition NOT tested";
    save();
    return result;
  }
  const audio = fs.readFileSync("public/samples/" + name + ".wav");
  const form = new FormData();
  form.append("audio", new Blob([audio], { type: "audio/wav" }), name + ".wav");
  form.append("duration", String(duration(audio)));
  form.append("state", JSON.stringify(state));
  form.append("pending", "null");
  return post(name, "/api/voice", form);
}
const fixtureDurationMs = (name) =>
  Math.round(duration(fs.readFileSync(`public/samples/${name}.wav`)) * 1000);
const operationCost = (record) =>
  (record.operations ?? []).reduce(
    (sum, operation) => sum + (operation.costUSD ?? 0),
    0,
  );
function dialogue(id, photoRecord, voiceRecords, settled, outcome) {
  const recordingMs = voiceRecords.reduce(
    (sum, record) => sum + fixtureDurationMs(record.name),
    0,
  );
  const recognitionMs =
    photoRecord.elapsedMs +
    voiceRecords.reduce((sum, record) => sum + record.elapsedMs, 0);
  results.dialogues.push({
    id,
    measurement:
      "component wall-clock benchmark: live photo request + recorded WAV duration + live intent request; excludes human thinking time",
    photoRecognitionMs: photoRecord.elapsedMs,
    recordingMs,
    intentMs: voiceRecords.reduce((sum, record) => sum + record.elapsedMs, 0),
    timeToUsefulResultMs: recognitionMs + recordingMs,
    timeToSettledMs: settled ? recognitionMs + recordingMs : null,
    settled,
    outcome,
    estimatedVariableCostUSD:
      operationCost(photoRecord) +
      voiceRecords.reduce((sum, record) => sum + operationCost(record), 0),
    costIncludes: [
      "photo recognition",
      "intent reasoning",
      "browser speech direct operator cost USD 0",
      "all recorded retries in these requests",
      "configured intermediary estimate",
    ],
  });
  save();
}
const fresh = (receipt) => ({
  receipt: structuredClone(receipt),
  people: structuredClone(PEOPLE),
  allocation: {},
  revision: 0,
});
try {
  const custom = await photo(
    "custom receipt",
    "public/samples/custom-receipt.png",
  );
  if (custom.receipt) {
    const expected = JSON.parse(
      fs.readFileSync("evidence/custom-receipt-expected.json", "utf8"),
    );
    custom.matchesExpected =
      JSON.stringify(custom.receipt.rows.map((r) => r.amountMinor)) ===
        JSON.stringify(expected.rows.map((r) => r.amountMinor)) &&
      custom.receipt.totalMinor === expected.totalMinor;
    save();
  }
  // Check transcription separately even if vision is blocked; clearly label fixture state.
  if (custom.status !== 200) {
    const record = await voice("normal", fresh(sampleReceipt));
    record.stateSource = "prefilled fixture; photo recognition failed";
    save();
    process.exitCode = 1;
  } else {
    const read = await photo("reference receipt", "public/samples/receipt.jpg");
    if (!read.receipt) throw new Error("Reference recognition failed");
    const groundTruth = JSON.parse(
      fs.readFileSync("evidence/expected-results.json", "utf8"),
    );
    let correctionState;
    const voiceRecords = {};
    for (const name of [
      "normal",
      "shared",
      "before-correction",
      "correction",
      "ambiguous",
    ]) {
      const state =
        name === "correction" ? correctionState : fresh(read.receipt);
      if (!state) throw new Error("Correction precondition failed");
      const record = await voice(name, state);
      voiceRecords[name] = record;
      if (!record.intent) continue;
      const updated = applyAssignments(state, record.intent.assignments);
      const verification = calculate(updated);
      record.verification = verification;
      record.itemCount = itemsOf(updated.receipt).length;
      record.settled =
        verification.settled &&
        !record.intent.question &&
        !record.intent.confirmation;
      if (name === "before-correction") correctionState = updated;
      const expected = groundTruth.scenarios.find((s) => s.id === name);
      if (expected?.expectedTotals)
        record.matchesExpected =
          JSON.stringify(verification.people.map((p) => p.total)) ===
          JSON.stringify(expected.expectedTotals);
      if (name === "correction")
        record.matchesExpected =
          JSON.stringify(verification.people.map((p) => p.total)) ===
            JSON.stringify(expected.expectedTotalsAfter) &&
          record.itemCount === 6;
      if (name === "ambiguous")
        record.matchesExpected =
          !!record.intent.question &&
          record.intent.assignments.length === 0 &&
          !record.settled;
      save();
    }
    for (const name of ["normal", "shared"])
      dialogue(
        name,
        read,
        [voiceRecords[name]],
        true,
        voiceRecords[name].verification.people.map((person) => person.total),
      );
    dialogue(
      "correction",
      read,
      [voiceRecords["before-correction"], voiceRecords.correction],
      true,
      voiceRecords.correction.verification.people.map((person) => person.total),
    );
    dialogue(
      "ambiguous",
      read,
      [voiceRecords.ambiguous],
      false,
      voiceRecords.ambiguous.intent.question,
    );
    const unreadable = await photo(
      "unreadable receipt",
      "public/samples/receipt-unreadable.jpg",
    );
    if (unreadable.receipt) {
      unreadable.verification = calculate(fresh(unreadable.receipt));
      unreadable.hasUncertainty = unreadable.receipt.rows.some(
        (r) => r.amountMinor === null || r.uncertain,
      );
      save();
    }
    dialogue(
      "unreadable",
      unreadable,
      [],
      false,
      unreadable.receipt?.rows.find((row) => row.amountMinor === null)?.name ??
        "clarification required",
    );
  }
  fs.writeFileSync(
    "evidence/dialogue-results.json",
    JSON.stringify(
      {
        testedAt: results.testedAt,
        speechMode: results.speechMode,
        provider: results.provider,
        pricingAssumption:
          "RSI AI configured at 7% of public GPT-5.4 benchmark rates; browser speech direct operator cost USD 0; verify against provider invoice.",
        hosting: {
          plan: "Vercel Hobby",
          fixedMonthlyUSD: 0,
          variableUSDWithinIncludedQuota: 0,
        },
        dialogues: results.dialogues,
      },
      null,
      2,
    ),
  );
  const failures = results.results.filter(
    (r) => r.status !== 200 || r.matchesExpected === false,
  );
  if (failures.length) process.exitCode = 1;
} catch (error) {
  results.error = error.message;
  save();
  console.error(error.message);
  process.exitCode = 1;
}
