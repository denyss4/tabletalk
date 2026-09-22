"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyAssignments,
  calculate,
  itemsOf,
  type Assignment,
  type Person,
  type SplitState,
  type Receipt,
} from "./split";
import { sampleReceipt } from "./sample";
import type { ReceiptTemplate } from "./receipt-templates";
import { confirmReceipt, type ValidatedIntent } from "./intent";
import type { Confirmation } from "./schemas";
import type { Operation } from "./ai";
import { listenForSpeech, speechConstructor } from "./browser-speech";
import {
  renamePeople,
  renameReceiptMerchant,
  restoreSplitSnapshot,
  createDefaultPeople,
} from "./session-state";
export type Activity = {
  at: string;
  text: string;
  kind: "voice" | "change" | "system";
};
export type Recording = { url: string; name: string; duration: number };
class RecognitionUnavailableError extends Error {}
type PhotoInput = { image: string; name: string };
export function useTabletalk() {
  const [state, setState] = useState<SplitState | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [roster, setRoster] = useState<Person[]>(createDefaultPeople);
  const [photo, setPhoto] = useState("");
  const [example, setExample] = useState(false);
  const [speechMode, setSpeechMode] = useState<"browser" | "provider">(
    "provider",
  );
  const [speechPreview, setSpeechPreview] = useState("");
  const speech = useRef<ReturnType<typeof listenForSpeech> | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PhotoInput | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const connectionRequest = useRef<Promise<boolean> | null>(null);
  const [requestingMic, setRequestingMic] = useState(false);
  const micRequest = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pending, setPending] = useState<ValidatedIntent | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const updateRecording = useCallback((value: boolean) => {
    recordingRef.current = value;
    setRecording(value);
  }, []);
  const recorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const recordingUrls = useRef<string[]>([]);
  const startedAt = useRef<number | null>(null);
  const [settledMs, setSettledMs] = useState<number | null>(null);
  const [firstSettledMs, setFirstSettledMs] = useState<number | null>(null);
  const [history, setHistory] = useState<SplitState[]>([]);
  const people = state?.people ?? roster;
  const result = state ? calculate(state) : null;
  const settled =
    !!result?.settled &&
    !pending &&
    !confirmation &&
    !busy &&
    !recording &&
    !requestingMic;
  const note = useCallback(
    (text: string, kind: Activity["kind"] = "system") =>
      setActivity((a) => [...a, { at: new Date().toISOString(), text, kind }]),
    [],
  );
  const commit = useCallback((next: SplitState) => {
    const previous = stateRef.current;
    if (previous) setHistory((h) => [...h, structuredClone(previous)]);
    stateRef.current = next;
    setState(next);
    setSettledMs(null);
  }, []);
  const checkConnection = useCallback(async () => {
    if (connectionRequest.current) return connectionRequest.current;
    setCheckingConnection(true);
    const request = (async () => {
      try {
        const response = await fetch("/api/status", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error("Connection check failed");
        const data = (await response.json()) as {
          configured?: unknown;
          speechMode?: string;
        };
        setSpeechMode(data.speechMode === "browser" ? "browser" : "provider");
        if (typeof data.configured !== "boolean")
          throw new Error("Invalid status");
        setConfigured(data.configured);
        return data.configured as boolean;
      } catch {
        setConfigured(null);
        return false;
      } finally {
        setCheckingConnection(false);
        connectionRequest.current = null;
      }
    })();
    connectionRequest.current = request;
    return request;
  }, []);
  useEffect(() => {
    mounted.current = true;
    void checkConnection();
    const refresh = () => {
      void checkConnection();
    };
    window.addEventListener("focus", refresh);
    return () => {
      mounted.current = false;
      speech.current?.abort();
      window.removeEventListener("focus", refresh);
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recordingUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [checkConnection]);
  useEffect(() => {
    if (settled && startedAt.current !== null) {
      const ms = Date.now() - startedAt.current;
      setSettledMs(ms);
      setFirstSettledMs((x) => x ?? ms);
    } else setSettledMs(null);
  }, [settled, state?.revision]);
  const run = useCallback(async (label: string, task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label);
    setError("");
    try {
      await task();
    } catch (e) {
      if (e instanceof RecognitionUnavailableError) setConfigured(false);
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }, []);
  async function api(path: string, body: BodyInit, headers?: HeadersInit) {
    let response: Response;
    try {
      response = await fetch(path, {
        method: "POST",
        body,
        headers,
        signal: AbortSignal.timeout(110_000),
      });
    } catch {
      throw new Error(
        "Recognition could not connect or timed out. Your input is kept; please retry.",
      );
    }
    let data: {
      operations?: Operation[];
      error?: string;
      code?: string;
      receipt: Receipt;
      intent: ValidatedIntent;
      transcript: string;
      revision: number;
    };
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The recognition service returned an unreadable response. Please retry.",
      );
    }
    if (data.operations)
      setOperations((o) => [...o, ...(data.operations ?? [])]);
    if (!response.ok) {
      if (data.code === "RECOGNITION_NOT_CONFIGURED")
        throw new RecognitionUnavailableError(data.error);
      throw new Error(data.error ?? "Recognition failed. Please try again.");
    }
    setConfigured(true);
    return data;
  }
  function clearSession() {
    stateRef.current = null;
    setState(null);
    setPhoto("");
    setPendingPhoto(null);
    setSpeechPreview("");
    setExample(false);
    setPending(null);
    setConfirmation(null);
    setOperations([]);
    setActivity([]);
    setHistory([]);
    setError("");
    setSettledMs(null);
    setFirstSettledMs(null);
    startedAt.current = null;
    recordingUrls.current.forEach((url) => URL.revokeObjectURL(url));
    recordingUrls.current = [];
    setRecordings([]);
  }
  function reset() {
    if (busyRef.current || recording || micRequest.current) return;
    clearSession();
  }
  function startExample() {
    if (busyRef.current || recording || micRequest.current) return;
    reset();
    startedAt.current = Date.now();
    setExample(true);
    setPhoto("/samples/receipt-display.webp");
    const next = {
      receipt: structuredClone(sampleReceipt),
      people: structuredClone(people),
      allocation: {},
      revision: 0,
    };
    stateRef.current = next;
    setState(next);
    note("Opened the allocation example. Photo recognition was not run.");
  }
  async function preparePhoto(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type))
      throw new Error("Choose a JPG, PNG or WebP photo.");
    if (file.size > 20_000_000) throw new Error("Choose a photo under 20 MB.");
    let image: string;
    try {
      image = await resizeImage(file);
    } catch {
      throw new Error(
        "That image could not be opened. Try a different JPG, PNG or WebP photo.",
      );
    }
    const input = { image, name: file.name };
    clearSession();
    startedAt.current = Date.now();
    setPendingPhoto(input);
    setPhoto(image);
    await recognizePhoto(input);
  }
  async function uploadPhoto(file: File) {
    if (recording || micRequest.current) return;
    await run("Reading your receipt...", () => preparePhoto(file));
  }
  async function readTemplate(template: ReceiptTemplate) {
    if (recording || micRequest.current) return;
    await run("Reading your receipt...", async () => {
      let response: Response;
      try {
        response = await fetch(template.src, {
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new Error(
          "The template photo could not be loaded. Choose it again to retry.",
        );
      }
      if (!response.ok)
        throw new Error(
          "The template photo is unavailable. Please choose another receipt.",
        );
      await preparePhoto(
        new File([await response.blob()], template.src.split("/").pop()!, {
          type: template.type,
        }),
      );
    });
  }
  async function recognizePhoto(input: PhotoInput) {
    if (!(await checkConnection()))
      throw new Error(
        "Your photo is ready. Connect the recognition service, then choose Retry recognition.",
      );
    const response = await api(
      "/api/receipt",
      JSON.stringify({ image: input.image }),
      { "Content-Type": "application/json" },
    );
    const next = {
      receipt: response.receipt,
      people: structuredClone(people),
      allocation: {},
      revision: 0,
    };
    calculate(next);
    stateRef.current = next;
    setState(next);
    setPendingPhoto(null);
    note("Receipt read. Check the rows, then tell us who had what.");
  }
  async function retryPhoto() {
    if (pendingPhoto)
      await run("Reading your receipt…", () => recognizePhoto(pendingPhoto));
  }
  async function readSample(unreadable = false) {
    try {
      const response = await fetch(
        `/samples/receipt${unreadable ? "-unreadable" : ""}.jpg`,
      );
      if (!response.ok) throw new Error("Sample photo could not be loaded.");
      await uploadPhoto(
        new File([await response.blob()], "sample.jpg", { type: "image/jpeg" }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sample unavailable.");
    }
  }
  function assign(
    assignments: Assignment[],
    description = "Updated the item allocation.",
  ) {
    if (busyRef.current || recording || !stateRef.current) return;
    try {
      commit(applyAssignments(stateRef.current, assignments));
      note(description, "change");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please check the allocation.");
    }
  }
  function resolveCandidate(id: string) {
    if (!pending || !stateRef.current) return;
    try {
      commit(
        applyAssignments(stateRef.current, [
          { itemIds: [id], personIds: pending.candidatePersonIds },
        ]),
      );
      note(
        `Clarified ${itemsOf(stateRef.current.receipt).find((i) => i.id === id)?.name}.`,
        "change",
      );
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }
  function acceptConfirmation() {
    if (!confirmation || !stateRef.current) return;
    try {
      commit(confirmReceipt(stateRef.current, confirmation));
      note("Confirmed the receipt detail from your spoken answer.", "change");
      setConfirmation(null);
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }
  function confirmVisibleRow(id: string) {
    if (!stateRef.current) return;
    const row = stateRef.current.receipt.rows.find((r) => r.id === id);
    if (row?.amountMinor === null) return;
    try {
      commit(
        confirmReceipt(stateRef.current, {
          field: "row",
          rowId: id,
          amountMinor: row?.amountMinor ?? null,
          name: row?.name ?? null,
        }),
      );
      note("Confirmed the highlighted row against the photo.", "change");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }
  function confirmReceiptAmount(
    field: "subtotalMinor" | "serviceMinor" | "totalMinor",
    amountMinor: number,
    description: string,
  ) {
    if (!stateRef.current || busyRef.current || recording) return;
    try {
      commit(
        confirmReceipt(stateRef.current, {
          field,
          rowId: null,
          amountMinor,
          name: null,
        }),
      );
      note(description, "change");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }
  function undo() {
    if (busyRef.current || recording || !history.length || !stateRef.current)
      return;
    const previous = restoreSplitSnapshot(
      stateRef.current,
      history[history.length - 1],
    );
    stateRef.current = previous;
    setState(previous);
    setRoster(structuredClone(previous.people));
    setHistory((h) => h.slice(0, -1));
    setPending(null);
    setConfirmation(null);
    note("Undid the last change.", "change");
  }
  function rename(names: string[]) {
    const next = renamePeople(people, names);
    setRoster(structuredClone(next));
    if (stateRef.current)
      commit({
        ...stateRef.current,
        people: next,
        revision: stateRef.current.revision + 1,
      });
  }
  function renameMerchant(name: string) {
    if (!stateRef.current) return;
    commit(renameReceiptMerchant(stateRef.current, name));
    note(`Renamed the restaurant to ${name.trim()}.`, "change");
  }
  async function sendAudio(blob: Blob, name: string, duration: number) {
    const snapshot = stateRef.current;
    if (!snapshot) return;
    await run("Listening and updating…", async () => {
      startedAt.current ??= Date.now();
      const url = URL.createObjectURL(blob);
      recordingUrls.current.push(url);
      setRecordings((r) => [...r, { url, name, duration }]);
      const form = new FormData();
      form.append("audio", blob, name);
      form.append("state", JSON.stringify(snapshot));
      form.append("duration", String(duration));
      form.append("pending", JSON.stringify(pending));
      const data = await api("/api/voice", form);
      applyVoiceResult(data);
    });
  }
  function applyVoiceResult(data: {
    revision: number;
    transcript: string;
    intent: ValidatedIntent;
  }) {
    if (stateRef.current?.revision !== data.revision)
      throw new Error(
        "The receipt changed during recognition. Please repeat that command.",
      );
    note(data.transcript, "voice");
    const intent = data.intent;
    if (intent.assignments.length) {
      commit(applyAssignments(stateRef.current!, intent.assignments));
      note(
        `Updated ${intent.assignments.reduce((n, a) => n + a.itemIds.length, 0)} item(s).`,
        "change",
      );
    }
    const resolvedPrevious =
      !pending ||
      intent.assignments.some((a) =>
        a.itemIds.some((id) => pending.candidateItemIds.includes(id)),
      ) ||
      !!intent.confirmation;
    if (intent.status === "unresolved_question") setPending(intent);
    else if (resolvedPrevious) setPending(null);
    setConfirmation(intent.confirmation);
  }
  async function sendTranscript(transcript: string) {
    const snapshot = stateRef.current;
    if (!snapshot) return;
    await run("Interpreting your command...", async () => {
      const data = await api(
        "/api/voice",
        JSON.stringify({ state: snapshot, transcript, pending }),
        { "Content-Type": "application/json" },
      );
      applyVoiceResult(data);
    });
  }
  function startBrowserRecording() {
    const Constructor = speechConstructor();
    if (!Constructor) {
      setError(
        "Speech recognition is not available in this browser. Open TableTalk in a browser with speech recognition, such as Chrome, or use the row controls.",
      );
      return;
    }
    const started = Date.now();
    setError("");
    setSpeechPreview("");
    updateRecording(true);
    const log = (status: string) =>
      setOperations((o) => [
        ...o,
        {
          id: crypto.randomUUID(),
          stage: "transcription",
          model: "browser SpeechRecognition",
          provider: "browser speech service",
          latencyMs: Date.now() - started,
          audioSeconds: (Date.now() - started) / 1000,
          status,
          costUSD: 0,
          costBasis:
            "Estimated operator variable cost USD 0: browser-managed speech recognition creates no separately billed app API call; checked 2026-09-22.",
        },
      ]);
    const finish = () => {
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      speech.current = null;
      updateRecording(false);
    };
    try {
      speech.current = listenForSpeech(new Constructor(), {
        onPreview: setSpeechPreview,
        onComplete: (transcript) => {
          finish();
          log("succeeded");
          void sendTranscript(transcript);
        },
        onError: (message) => {
          const current = speech.current;
          finish();
          current?.abort();
          log("failed");
          setError(message);
        },
      });
      recordingTimer.current = setTimeout(() => speech.current?.stop(), 60_000);
    } catch {
      finish();
      setError(
        "Speech recognition could not start. Check microphone permissions and try again.",
      );
    }
  }
  function cancelRecording() {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    recordingTimer.current = null;
    const currentSpeech = speech.current;
    speech.current = null;
    currentSpeech?.abort();
    const currentRecorder = recorder.current;
    recorder.current = null;
    if (currentRecorder?.state === "recording") {
      currentRecorder.onstop = null;
      currentRecorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    updateRecording(false);
    setSpeechPreview("");
  }
  async function repeatRecording() {
    cancelRecording();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (busyRef.current || !stateRef.current || micRequest.current) return;
    if (speechMode === "browser") startBrowserRecording();
    else await toggleRecording();
  }
  async function toggleRecording() {
    if (recordingRef.current && speech.current) {
      speech.current.stop();
      return;
    }
    if (recordingRef.current) {
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      recorder.current?.stop();
      return;
    }
    if (busyRef.current || !stateRef.current || micRequest.current) return;
    if (speechMode === "browser") {
      startBrowserRecording();
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Recording is unavailable in this browser. Upload an audio recording instead.",
      );
      return;
    }
    micRequest.current = true;
    setRequestingMic(true);
    try {
      setError("");
      if (!(await checkConnection())) {
        setError(
          "Voice recognition needs a server connection. Connect the service, check the connection, then record again.",
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (x) => MediaRecorder.isTypeSupported(x),
      );
      const rec = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      const start = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        updateRecording(false);
        const duration = (Date.now() - start) / 1000;
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (blob.size < 100 || duration < 0.3) {
          setError(
            "No recording was captured. Hold the microphone open long enough to say your command.",
          );
          return;
        }
        void sendAudio(
          blob,
          `voice-${Date.now()}.${type.includes("mp4") ? "m4a" : "webm"}`,
          duration,
        );
      };
      rec.onerror = () => {
        rec.onstop = null;
        if (recordingTimer.current) clearTimeout(recordingTimer.current);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        updateRecording(false);
        setError("Recording failed. Try uploading an audio file.");
      };
      rec.start();
      updateRecording(true);
      recordingTimer.current = setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 60_000);
    } catch {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setError(
        "Microphone access was not granted or the microphone is unavailable. Check browser permissions, or upload an audio recording.",
      );
    } finally {
      micRequest.current = false;
      setRequestingMic(false);
    }
  }
  async function uploadAudio(file: File) {
    if (speechMode === "browser") {
      setError(
        "Recording uploads are not supported by this provider. Use Start voice command.",
      );
      return;
    }
    if (busyRef.current || recording || micRequest.current || !stateRef.current)
      return;
    if (file.size > 10_000_000) {
      setError("Use an audio recording under 10 MB.");
      return;
    }
    try {
      const context = new AudioContext();
      let duration: number;
      try {
        duration = (await context.decodeAudioData(await file.arrayBuffer()))
          .duration;
      } finally {
        await context.close();
      }
      if (duration > 90)
        throw new Error("Keep the recording under 90 seconds.");
      await sendAudio(file, file.name, duration);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not read that audio file. Try WAV, MP3 or WebM.",
      );
    }
  }
  async function useSampleAudio(name: string) {
    try {
      if (speechMode === "browser") {
        const response = await fetch("/samples/voices.json");
        if (!response.ok)
          throw new Error("The sample transcript is unavailable.");
        const scenarios = (await response.json()) as Array<{
          name: string;
          text: string;
        }>;
        const scenario = scenarios.find((item) => item.name === name);
        if (!scenario) throw new Error("The sample transcript is unavailable.");
        note(
          `Ran the supplied ${name} transcript paired with its WAV fixture. Browser microphone recognition was not used.`,
          "system",
        );
        await sendTranscript(scenario.text);
        return;
      }
      const response = await fetch(`/samples/${name}.wav`);
      if (!response.ok) throw new Error("The sample recording is unavailable.");
      await uploadAudio(
        new File([await response.blob()], `${name}.wav`, { type: "audio/wav" }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sample unavailable.");
    }
  }
  function exportEvidence() {
    const payload = {
      exportedAt: new Date().toISOString(),
      inputMode: example
        ? "prefilled allocation example; no photo recognition"
        : "photo recognition",
      state,
      verification: result,
      settled,
      unresolvedQuestion: pending,
      unconfirmedReceiptEdit: confirmation,
      timing: {
        startAt: startedAt.current
          ? new Date(startedAt.current).toISOString()
          : null,
        firstSettledMs,
        lastSettledMs: settledMs,
        includesUserThinkingAndRecording: true,
      },
      operations,
      activity,
      estimatedFullVariableCostUSD: operations.reduce(
        (n, o) => n + (o.costUSD ?? 0),
        0,
      ),
      costIncomplete: operations.some((o) => o.costUSD === null),
      pricingDate: "2026-09-22",
      pricingMethod:
        "Configured per-token and per-audio-minute estimates. Failed attempts and retries remain in operations. Browser speech has an estimated direct operator cost of USD 0 because it creates no separately billed app API call.",
      hosting: {
        plan: "Vercel Hobby",
        fixedMonthlyUSD: 0,
        variableUSDWithinIncludedQuota: 0,
        separateFromRecognitionCost: true,
        assumption:
          "Personal prototype within included usage; recheck before commercial use.",
      },
      speechOutput: "No generated speech; clarification choices only",
      paidIntermediaries: [
        ...new Set(
          operations
            .map((o) => o.provider)
            .filter((p) => p && p !== "https://api.openai.com"),
        ),
      ],
      speechRecognitionMode: speechMode,
      recordings: recordings.map(({ name, duration }) => ({ name, duration })),
    };
    download(
      JSON.stringify(payload, null, 2),
      "tabletalk-evidence.json",
      "application/json",
    );
  }
  return {
    state,
    people,
    photo,
    example,
    busy,
    error,
    configured,
    speechMode,
    speechPreview,
    pendingPhoto,
    retryPhoto,
    checkingConnection,
    checkConnection,
    requestingMic,
    pending,
    confirmation,
    operations,
    activity,
    recording,
    recordings,
    result,
    settled,
    settledMs,
    firstSettledMs,
    history,
    reset,
    startExample,
    uploadPhoto,
    readSample,
    readTemplate,
    assign,
    resolveCandidate,
    acceptConfirmation,
    confirmVisibleRow,
    confirmReceiptAmount,
    undo,
    rename,
    renameMerchant,
    toggleRecording,
    cancelRecording,
    repeatRecording,
    uploadAudio,
    useSampleAudio,
    exportEvidence,
    dismissPending: () => {
      setPending(null);
      setConfirmation(null);
      note(
        "Discarded the unresolved change. Existing allocations kept.",
        "change",
      );
    },
  };
}
export function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the photo.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    bitmap.close();
  }
}
