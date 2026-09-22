/* Native images avoid shipping the next/image runtime for local and data URL receipt previews. */
/* eslint-disable @next/next/no-img-element */
"use client";
/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect, useRef, useState } from "react";
import {
  ReceiptText,
  Upload,
  Mic,
  Check,
  Users,
  RotateCcw,
  LoaderCircle,
  Square,
  Undo2,
  Download,
  Info,
  AlertCircle,
  ChevronRight,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { itemsOf, money } from "@/lib/split";
import { useTabletalk } from "@/lib/use-tabletalk";
import { ReceiptTemplates } from "@/components/receipt-templates";
import type { ReceiptTemplate as ReceiptTemplateData } from "@/lib/receipt-templates";
import { ReceiptVerification } from "@/components/receipt-verification";
export default function Home() {
  const app = useTabletalk();
  const [modal, setModal] = useState<
    "names" | "merchant" | "replace" | "sample" | "photo" | "share" | null
  >(null);
  const [names, setNames] = useState(app.people.map((p) => p.name));
  const [nameError, setNameError] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [merchantError, setMerchantError] = useState("");
  const [shareItem, setShareItem] = useState("");
  const [sharers, setSharers] = useState<string[]>([]);
  const [replacement, setReplacement] = useState<
    | { kind: "file"; file: File }
    | { kind: "template"; template: ReceiptTemplateData }
    | null
  >(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const nameInputs = useRef<Array<HTMLInputElement | null>>([]);
  const locked = !!app.busy || app.recording || app.requestingMic;
  const items = app.state ? itemsOf(app.state.receipt) : [];
  const cost = app.operations.reduce((n, o) => n + (o.costUSD ?? 0), 0);
  const incompleteCost = app.operations.some((o) => o.costUSD === null);
  const cleanNames = names.map((name) => name.trim());
  const invalidNameIndexes = new Set(
    cleanNames
      .map((name, index) =>
        !name ||
        cleanNames.some(
          (other, otherIndex) =>
            otherIndex !== index &&
            other.toLocaleLowerCase("en") === name.toLocaleLowerCase("en"),
        )
          ? index
          : -1,
      )
      .filter((index) => index >= 0),
  );
  const splitAnnouncement = app.settled
    ? `Balanced at ${money(app.result?.sum ?? null)}. Every item counted once.`
    : app.pending || app.confirmation
      ? "The split needs clarification."
      : app.state
        ? `${app.result?.assigned ?? 0} of ${items.length} items assigned. Final totals are pending.`
        : "Add a receipt to begin.";
  const receiptNeedsCheck =
    !!app.state &&
    (["subtotalStatus", "serviceStatus", "totalStatus"] as const).some(
      (field) =>
        app.state?.receipt[field] === "not_printed" ||
        app.state?.receipt[field] === "unreadable",
    );
  const visibleIssues =
    app.result?.issues.filter(
      (issue) =>
        !issue.includes("still need") &&
        !/^(Subtotal is|The subtotal is|Service charge is|The service charge is|Receipt total is|The receipt total is)/.test(
          issue,
        ),
    ) ?? [];
  const clarificationItemIds = app.pending?.candidateItemIds.length
    ? app.pending.candidateItemIds
    : app.pending?.candidatePersonIds.length
      ? items.map((item) => item.id)
      : [];
  const exposedState = useRef<unknown>(null);
  useEffect(() => {
    exposedState.current = {
      receipt: app.state?.receipt ?? null,
      allocation: app.state?.allocation ?? {},
      people: app.people,
      verification: app.result,
      settled: app.settled,
      pending: app.pending,
      confirmation: app.confirmation,
    };
  }, [
    app.state,
    app.people,
    app.result,
    app.settled,
    app.pending,
    app.confirmation,
  ]);
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "get_receipt_split",
            title: "Read the receipt split",
            description:
              "Read the current receipt, owners, totals and unresolved clarifications. Does not modify the split.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== "object" ||
                Object.keys(input).length
              )
                throw new Error("Expected an empty object.");
              return exposedState.current;
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  function requestFileReceipt(file: File) {
    if (!app.state) {
      void app.uploadPhoto(file);
      return;
    }
    setReplacement({ kind: "file", file });
    setModal("replace");
  }
  function requestTemplateReceipt(template: ReceiptTemplateData) {
    if (!app.state) {
      setModal(null);
      void app.readTemplate(template);
      return;
    }
    setReplacement({ kind: "template", template });
    setModal("replace");
  }
  function confirmReplacement() {
    const selected = replacement;
    if (!selected) return;
    setReplacement(null);
    setModal(null);
    if (selected.kind === "file") void app.uploadPhoto(selected.file);
    else void app.readTemplate(selected.template);
  }
  function openShare(id: string) {
    setShareItem(id);
    setSharers(
      app.state?.allocation[id]?.length
        ? app.state.allocation[id]
        : app.people.map((p) => p.id),
    );
    setModal("share");
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <ReceiptText size={23} />
          </span>
          tabletalk<span className="wordmark-dot">.</span>
        </a>
        <span className="edition">THE BILL, SORTED.</span>
        <span className="scope">English · EUR</span>
      </header>
      <section className="page-heading">
        <div>
          <h1>Good food. Fair shares.</h1>
          <p>Add your receipt. Tell us who had what.</p>
        </div>
      </section>
      {app.configured !== true && (
        <div className="setup-note">
          <Info size={18} />
          <div className="setup-note-copy">
            <strong>
              {app.checkingConnection
                ? "Checking recognition..."
                : app.configured === false
                  ? "Recognition needs setup."
                  : "Connection unavailable."}
            </strong>
            <span>
              You can add your own receipt now. Photo extraction and voice
              commands need a connected recognition service.
            </span>
            <button
              disabled={locked || app.checkingConnection}
              onClick={() => void app.checkConnection()}
            >
              Check connection
            </button>
            {!app.state && !app.pendingPhoto && (
              <button disabled={locked} onClick={app.startExample}>
                Explore the sample
              </button>
            )}
          </div>
        </div>
      )}
      {app.error && app.state && (
        <div className="error" role="alert">
          <AlertCircle size={18} />
          <span>{app.error}</span>
        </div>
      )}
      <input
        ref={photoInput}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) requestFileReceipt(file);
          e.target.value = "";
        }}
      />
      <input
        ref={audioInput}
        hidden
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.webm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void app.uploadAudio(file);
          e.target.value = "";
        }}
      />
      <div className="workspace">
        <section className="receipt-panel panel" aria-busy={!!app.busy}>
          <div className="panel-title">
            <h2>
              <ReceiptText size={20} />
              Your receipt
            </h2>
            <span className="small-label">
              {app.state
                ? `${app.state.receipt.rows.length} PRINTED ROWS`
                : "UP TO 10 ROWS"}
            </span>
          </div>
          {!app.state ? (
            <div
              className={`upload-zone ${app.busy ? "loading-zone" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!locked && e.dataTransfer.files[0])
                  void app.uploadPhoto(e.dataTransfer.files[0]);
              }}
            >
              {app.pendingPhoto ? (
                <button
                  className="receipt-preview"
                  aria-label="View uploaded receipt"
                  onClick={() => setModal("photo")}
                >
                  <img
                    src={app.pendingPhoto.image}
                    alt="Your uploaded receipt, awaiting extraction"
                    width="180"
                    height="240"
                  />
                </button>
              ) : (
                <span className="upload-icon">
                  {app.busy ? (
                    <LoaderCircle className="spin" size={28} />
                  ) : (
                    <Upload size={28} />
                  )}
                </span>
              )}
              {app.error && (
                <div className="error upload-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{app.error}</span>
                </div>
              )}
              <h3>
                {app.busy
                  ? "Reading your receipt..."
                  : app.pendingPhoto
                    ? "Your photo is ready."
                    : "Bring your own receipt."}
              </h3>
              <p>
                {app.pendingPhoto ? (
                  app.pendingPhoto.name
                ) : (
                  <>
                    Upload a clear photo of the full receipt,
                    <br />
                    including the total and service charge.
                  </>
                )}
              </p>
              {app.pendingPhoto && (
                <button
                  className="primary"
                  disabled={locked}
                  onClick={() => void app.retryPhoto()}
                >
                  <RotateCcw size={17} />
                  Retry recognition
                </button>
              )}
              <button
                className={app.pendingPhoto ? "secondary-button" : "primary"}
                disabled={locked}
                onClick={() => photoInput.current?.click()}
              >
                {app.pendingPhoto
                  ? "Choose a different photo"
                  : "Add your receipt"}{" "}
                <Upload size={17} />
              </button>
              <span className="small-label">
                JPG, PNG OR WEBP / UP TO 20 MB
              </span>
              <button
                className="text-button"
                disabled={locked}
                onClick={() => setModal("sample")}
              >
                Browse receipt templates
              </button>
            </div>
          ) : (
            <>
              <div className="receipt-meta">
                <div>
                  <p className="eyebrow">
                    {app.example
                      ? "ALLOCATION EXAMPLE · PREFILLED"
                      : "RECOGNIZED FROM YOUR PHOTO"}
                  </p>
                  <div className="merchant-title-row">
                    <h3>{app.state.receipt.merchant || "Your restaurant"}</h3>
                    <button
                      className="merchant-edit"
                      disabled={locked}
                      aria-label="Edit restaurant name"
                      onClick={() => {
                        setMerchantName(
                          app.state?.receipt.merchant || "Your restaurant",
                        );
                        setMerchantError("");
                        setModal("merchant");
                      }}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </div>
                </div>
                <button
                  className="photo-thumbnail"
                  aria-label="View original receipt photo"
                  onClick={() => setModal("photo")}
                >
                  <img
                    src={app.photo}
                    alt="Original receipt"
                    width="46"
                    height="62"
                    decoding="async"
                  />
                </button>
              </div>
              <div className="receipt-toolbar">
                <span>
                  {app.result?.assigned} of {items.length} items assigned
                </span>
                <div>
                  <button
                    disabled={locked || !app.history.length}
                    onClick={app.undo}
                  >
                    <Undo2 size={14} />
                    Undo
                  </button>
                  <button disabled={locked} onClick={() => setModal("sample")}>
                    Templates
                  </button>
                  <button
                    disabled={locked}
                    onClick={() => photoInput.current?.click()}
                  >
                    <Upload size={14} />
                    Replace receipt
                  </button>
                  <button disabled={locked} onClick={app.reset}>
                    <RotateCcw size={14} />
                    New receipt
                  </button>
                </div>
              </div>
              <div className="allocation-progress">
                <Progress
                  value={
                    items.length
                      ? ((app.result?.assigned ?? 0) / items.length) * 100
                      : 0
                  }
                  aria-label="Items assigned"
                />
              </div>
              <div className="receipt-rows">
                {items.map((item) => {
                  const owners = app.state!.allocation[item.id] ?? [];
                  return (
                    <div
                      className={`receipt-row ${item.uncertain || item.amountMinor === null ? "uncertain" : ""}`}
                      key={item.id}
                    >
                      <div>
                        <strong>
                          {item.name}
                          {owners.length > 1 && (
                            <span className="shared-label">shared equally</span>
                          )}
                        </strong>
                        <span>{money(item.amountMinor)}</span>
                      </div>
                      {(item.uncertain || item.amountMinor === null) && (
                        <div className="row-question">
                          <AlertCircle size={14} />
                          <span>
                            {item.amountMinor === null
                              ? "This price is unclear. Read the row and amount aloud, or upload a clearer photo."
                              : "Please check this row against the photo."}
                          </span>
                          {item.amountMinor !== null && (
                            <button
                              disabled={locked}
                              onClick={() => app.confirmVisibleRow(item.rowId)}
                            >
                              Looks correct
                            </button>
                          )}
                        </div>
                      )}
                      <div
                        className="owner-options"
                        aria-label={`Who pays for ${item.name}?`}
                      >
                        {app.people.map((p, i) => (
                          <button
                            key={p.id}
                            disabled={locked}
                            aria-pressed={owners.includes(p.id)}
                            className={`owner person-${i} ${owners.includes(p.id) ? "selected" : ""}`}
                            onClick={() =>
                              app.assign(
                                [{ itemIds: [item.id], personIds: [p.id] }],
                                `${item.name} → ${p.name}`,
                              )
                            }
                          >
                            {owners.length === 1 && owners.includes(p.id) && (
                              <Check size={12} />
                            )}{" "}
                            {p.name}
                          </button>
                        ))}
                        <button
                          disabled={locked}
                          className={`owner ${owners.length > 1 ? "selected" : ""}`}
                          onClick={() => openShare(item.id)}
                        >
                          <Users size={13} />
                          Share
                        </button>
                        {owners.length > 0 && (
                          <button
                            disabled={locked}
                            className="clear-owner"
                            aria-label={`Clear owners of ${item.name}`}
                            onClick={() =>
                              app.assign(
                                [{ itemIds: [item.id], personIds: [] }],
                                `Cleared ${item.name}.`,
                              )
                            }
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ReceiptVerification
                receipt={app.state.receipt}
                disabled={locked}
                onConfirm={app.confirmReceiptAmount}
              />
              {!!visibleIssues.length && (
                <div className="receipt-issues">
                  {visibleIssues.map((issue) => (
                    <p key={issue}>
                      <AlertCircle size={14} />
                      {issue}
                    </p>
                  ))}
                  <button
                    disabled={locked}
                    className="text-button"
                    onClick={() => photoInput.current?.click()}
                  >
                    Upload a clearer photo
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        <aside className="split-column">
          <section className="panel people-panel">
            <div className="panel-title">
              <h2>
                <Users size={20} />
                At the table
              </h2>
              <button
                className="quiet-button"
                disabled={locked}
                onClick={() => {
                  setNames(app.people.map((p) => p.name));
                  setNameError("");
                  setModal("names");
                }}
              >
                Edit names
              </button>
            </div>
            <div className="people-list">
              {app.people.map((p, i) => (
                <div className="person" key={p.id}>
                  <span className={`avatar person-${i}`}>{p.name[0]}</span>
                  <strong>{p.name}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className={`voice-card ${app.recording ? "recording" : ""}`}>
            <div className="voice-symbol">
              <Mic size={25} />
            </div>
            <h2>
              {app.recording
                ? "We are listening."
                : app.settled
                  ? "All sorted. Any changes?"
                  : receiptNeedsCheck
                    ? "Confirm the receipt details."
                    : "Just say who had what."}
            </h2>
            <p>
              {app.recording
                ? "Tap stop when you have finished. Up to 60 seconds."
                : app.settled
                  ? "Actually, the second coffee was Sam’s."
                  : receiptNeedsCheck
                    ? "Use the receipt checks, or say the missing amount. You can say “There is no service charge.”"
                    : `${app.people[0].name} had the pasta. ${app.people[1].name} had the burger. We all shared the fries.`}
            </p>
            <button
              className="voice-button"
              disabled={!app.state || !!app.busy || app.requestingMic}
              onClick={() => void app.toggleRecording()}
            >
              {app.recording ? (
                <Square size={17} fill="currentColor" />
              ) : app.busy || app.requestingMic ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Mic size={18} />
              )}{" "}
              {app.recording
                ? "Stop recording"
                : app.requestingMic
                  ? "Opening microphone..."
                  : app.busy ||
                    (!app.state
                      ? "Add a receipt to begin"
                      : "Start voice command")}
            </button>
            {app.recording && (
              <div className="voice-recording-actions">
                <button type="button" onClick={app.cancelRecording}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void app.repeatRecording()}
                >
                  <RotateCcw size={16} />
                  Repeat
                </button>
              </div>
            )}
            {app.state && (
              <div className="voice-links">
                <button
                  disabled={locked || app.speechMode === "browser"}
                  title={
                    app.speechMode === "browser"
                      ? "This provider supports live browser speech only."
                      : undefined
                  }
                  onClick={() => audioInput.current?.click()}
                >
                  Upload voice recording
                </button>
                <button disabled={locked} onClick={() => setModal("sample")}>
                  Sample recordings
                </button>
              </div>
            )}
            {app.speechPreview && (
              <p className="speech-preview">
                <strong>Heard:</strong> {app.speechPreview}
              </p>
            )}
            <span className="voice-hint">
              {app.speechMode === "browser"
                ? "Voice uses your browser speech service. Recordings cannot be uploaded with this provider."
                : app.configured === false
                  ? "Connect recognition to interpret voice commands."
                  : app.configured === null
                    ? "Recognition connection has not been confirmed."
                    : "Allow microphone access when prompted. Corrections update the existing split."}
            </span>
          </section>
          {app.pending && (
            <section className="clarification" aria-live="polite">
              <p className="eyebrow">ONE QUICK QUESTION</p>
              <h3>{app.pending.question}</h3>
              {clarificationItemIds.length > 0 && (
                <div className="clarification-choices">
                  {clarificationItemIds.map((id) => {
                    const item = items.find((candidate) => candidate.id === id);
                    return (
                      <button
                        className="choice-button"
                        disabled={
                          locked || !app.pending?.candidatePersonIds.length
                        }
                        key={id}
                        onClick={() => app.resolveCandidate(id)}
                      >
                        <span>
                          {item?.name}
                          <small>{money(item?.amountMinor ?? null)}</small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    );
                  })}
                </div>
              )}
              <p>
                {clarificationItemIds.length > 0
                  ? "Choose the matching receipt row, or answer with your voice."
                  : "Answer with your voice, or discard this change and use the receipt row controls."}
              </p>
              <button
                className="quiet-button"
                disabled={locked}
                onClick={app.dismissPending}
              >
                Discard this change
              </button>
            </section>
          )}
          {app.confirmation && (
            <section className="clarification" aria-live="polite">
              <p className="eyebrow">CHECK WHAT WE HEARD</p>
              <h3>
                {app.confirmation.field === "row"
                  ? (app.confirmation.name ??
                    app.state?.receipt.rows.find(
                      (r) => r.id === app.confirmation?.rowId,
                    )?.name)
                  : app.confirmation.field.replace("Minor", "")}
                : {money(app.confirmation.amountMinor)}
              </h3>
              <p>Confirm this matches the receipt before we update it.</p>
              <div className="clarification-choices">
                <button
                  className="primary"
                  disabled={locked}
                  onClick={app.acceptConfirmation}
                >
                  Yes, that’s correct
                </button>
                <button
                  className="quiet-button"
                  disabled={locked}
                  onClick={app.dismissPending}
                >
                  Discard
                </button>
              </div>
            </section>
          )}
          <section className="panel totals-panel">
            <div className="panel-title">
              <h2>Your split</h2>
              <span className={`status ${app.settled ? "settled" : ""}`}>
                {app.settled
                  ? "Balanced"
                  : app.pending || app.confirmation
                    ? "Needs clarification"
                    : "In progress"}
              </span>
            </div>
            <span className="sr-only" role="status" aria-atomic="true">
              {splitAnnouncement}
            </span>
            {(
              app.result?.people ??
              app.people.map((p) => ({
                ...p,
                subtotal: 0,
                service: 0,
                total: 0,
              }))
            ).map((p, i) => (
              <div className="person-total" key={p.id}>
                <span className={`avatar small person-${i}`}>{p.name[0]}</span>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {app.settled
                      ? `${money(p.subtotal)} + ${money(p.service)} service`
                      : p.subtotal
                        ? `${money(p.subtotal)} assigned · total pending`
                        : "Waiting for the full split"}
                  </small>
                </div>
                <strong>{app.settled ? money(p.total) : "—"}</strong>
              </div>
            ))}
            <div className="balance-line">
              <Check size={17} />
              {app.settled
                ? `${money(app.result!.sum)} verified · Every item counted once`
                : "Final totals appear after every question is resolved."}
            </div>
          </section>
          {!!app.activity.length && (
            <details className="activity">
              <summary>
                Conversation & changes <span>{app.activity.length}</span>
              </summary>
              <div>
                {app.activity.map((entry, i) => (
                  <p key={i} className={entry.kind}>
                    <span>
                      {entry.kind === "voice"
                        ? "You said"
                        : entry.kind === "change"
                          ? "Updated"
                          : "Tabletalk"}
                    </span>
                    {entry.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </aside>
      </div>
      {app.state && (
        <details className="evidence-panel">
          <summary>
            <span>
              <Info size={16} />
              Session evidence
            </span>
            <span>
              {app.example
                ? "Allocation example"
                : `${app.operations.length} recognition operations`}
              <ChevronRight size={16} />
            </span>
          </summary>
          <div className="evidence-content">
            <div>
              <strong>
                {app.settledMs === null
                  ? "Not settled"
                  : `${(app.settledMs / 1000).toFixed(1)}s`}
              </strong>
              <span>
                Photo start to latest settled split
                <br />
                (includes recording and decisions)
              </span>
            </div>
            <div>
              <strong>
                {app.operations.some((o) => o.costUSD !== null)
                  ? `${incompleteCost ? "≥ " : ""}$${cost.toFixed(5)}`
                  : "Not measured"}
              </strong>
              <span>
                Estimated recognition cost
                <br />
                {incompleteCost
                  ? "Provider or speech costs are unverified"
                  : "Hosting reported separately"}
              </span>
            </div>
            <button className="secondary-button" onClick={app.exportEvidence}>
              <Download size={16} />
              Export evidence
            </button>
          </div>
          {app.recordings.length > 0 && (
            <div className="recordings">
              {app.recordings.map((rec, i) => (
                <div key={rec.url}>
                  <span>
                    Voice {i + 1} · {rec.duration.toFixed(1)}s
                  </span>
                  <audio controls src={rec.url} />
                  <a href={rec.url} download={rec.name}>
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
          <p className="evidence-note">
            {app.example
              ? "This example uses prefilled receipt data and is not evidence of photo recognition. "
              : ""}
            No automatic retries. All successful and failed recognition attempts
            are included in the export.
          </p>
        </details>
      )}
      <footer>
        <details>
          <summary>How the cents are split</summary>
          <p>
            Shared items are divided equally between the selected people.
            Service is proportional to each person’s item subtotal. Remaining
            cents go to the largest fractional remainder; ties use the fixed
            table order (left to right). Amounts are calculated in integer
            cents. One shared item per receipt.
          </p>
        </details>
        <span>Your receipt stays in this session.</span>
      </footer>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setModal(null);
            setReplacement(null);
          }
        }}
      >
        <DialogContent className={modal === "photo" ? "photo-dialog" : ""}>
          <DialogTitle>
            {modal === "names"
              ? "Who’s at the table?"
              : modal === "merchant"
                ? "Restaurant name"
                : modal === "replace"
                  ? "Replace this receipt?"
                  : modal === "share"
                    ? "Share this item"
                    : modal === "photo"
                      ? "Original receipt"
                      : "Receipt templates & samples"}
          </DialogTitle>
          <DialogDescription>
            {modal === "names"
              ? "Use these names when you speak. You can change them any time."
              : modal === "merchant"
                ? "Correct the recognized restaurant name without changing any receipt rows."
                : modal === "replace"
                  ? "This deliberately clears the current rows, assignments and corrections, then recognizes the selected receipt from scratch."
                  : modal === "share"
                    ? "Choose who shared it. We’ll divide the price equally."
                    : modal === "photo"
                      ? "Check the recognized rows against the photo."
                    : "Read a supplied receipt photo, or review the voice scenarios."}
          </DialogDescription>
          {modal === "replace" && replacement && (
            <div className="replace-confirmation">
              <p>
                Replace with{" "}
                <strong>
                  {replacement.kind === "file"
                    ? replacement.file.name
                    : replacement.template.name}
                </strong>
                ?
              </p>
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setReplacement(null);
                    setModal(null);
                  }}
                >
                  Keep current receipt
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={confirmReplacement}
                >
                  Replace receipt
                </button>
              </div>
            </div>
          )}
          {modal === "merchant" && (
            <form
              className="merchant-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  app.renameMerchant(merchantName);
                  setMerchantError("");
                  setModal(null);
                } catch (error) {
                  setMerchantError(
                    error instanceof Error
                      ? error.message
                      : "Please check the restaurant name.",
                  );
                }
              }}
            >
              <label htmlFor="merchant-name">Restaurant name</label>
              <input
                id="merchant-name"
                autoFocus
                value={merchantName}
                maxLength={80}
                aria-invalid={merchantError ? true : undefined}
                aria-describedby={merchantError ? "merchant-error" : undefined}
                onChange={(event) => {
                  setMerchantError("");
                  setMerchantName(event.target.value);
                }}
              />
              {merchantError && (
                <p id="merchant-error" className="error" role="alert">
                  {merchantError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button className="primary" type="submit">
                  Save restaurant
                </button>
              </div>
            </form>
          )}
          {modal === "names" && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  app.rename(names);
                  setNameError("");
                  setModal(null);
                } catch (error) {
                  setNameError(
                    error instanceof Error
                      ? error.message
                      : "Please check the names.",
                  );
                  const invalidIndex = [...invalidNameIndexes][0] ?? 0;
                  requestAnimationFrame(() =>
                    nameInputs.current[invalidIndex]?.focus(),
                  );
                }
              }}
            >
              <div className="name-fields">
                {names.map((name, i) => (
                  <label key={i}>
                    <span className={`avatar person-${i}`}>{i + 1}</span>
                    <input
                      ref={(element) => {
                        nameInputs.current[i] = element;
                      }}
                      aria-label={`Person ${i + 1} name`}
                      aria-invalid={
                        nameError && invalidNameIndexes.has(i)
                          ? true
                          : undefined
                      }
                      aria-describedby={nameError ? "name-error" : undefined}
                      value={name}
                      maxLength={30}
                      onChange={(e) => {
                        setNameError("");
                        setNames((n) =>
                          n.map((x, j) => (i === j ? e.target.value : x)),
                        );
                      }}
                    />
                  </label>
                ))}
              </div>
              {nameError && (
                <p id="name-error" className="error" role="alert">
                  {nameError}
                </p>
              )}
              <button className="primary" type="submit">
                Save names
              </button>
            </form>
          )}
          {modal === "share" && (
            <>
              <div className="share-choices">
                {app.people.map((p, i) => (
                  <label key={p.id} htmlFor={`share-${p.id}`}>
                    <Checkbox
                      id={`share-${p.id}`}
                      checked={sharers.includes(p.id)}
                      onCheckedChange={(checked) =>
                        setSharers((ids) =>
                          checked
                            ? [...ids, p.id]
                            : ids.filter((id) => id !== p.id),
                        )
                      }
                    />
                    <span className={`avatar person-${i}`}>{p.name[0]}</span>
                    {p.name}
                  </label>
                ))}
              </div>
              <button
                className="primary"
                disabled={!sharers.length || locked}
                onClick={() => {
                  app.assign(
                    [{ itemIds: [shareItem], personIds: sharers }],
                    `Shared ${items.find((i) => i.id === shareItem)?.name} between ${app.people
                      .filter((p) => sharers.includes(p.id))
                      .map((p) => p.name)
                      .join(", ")}.`,
                  );
                  setModal(null);
                }}
              >
                Apply equal split
              </button>
            </>
          )}
          {modal === "photo" && (
            <img
              className="original-photo"
              src={app.photo}
              alt="Original restaurant receipt"
              width="1024"
              height="1536"
              decoding="async"
            />
          )}
          {modal === "sample" && (
            <div className="sample-content">
              <ReceiptTemplates
                disabled={locked}
                onRead={requestTemplateReceipt}
              />
              <h3 className="sample-section-title">Voice scenarios</h3>
              {app.configured === false && (
                <p className="sample-live-note">
                  The saved recordings remain available to review. Running
                  recognition requires a connected live service.
                </p>
              )}
              {app.configured === true && app.speechMode === "browser" && (
                <p className="sample-live-note">
                  For reproducible testing, Run transcript sends the script
                  paired with each WAV file through the live intent model. Use
                  Start voice command to test browser microphone recognition.
                </p>
              )}
              <div className="sample-audios">
                {[
                  { id: "normal", label: "Normal split" },
                  { id: "shared", label: "Shared fries" },
                  { id: "before-correction", label: "Before the correction" },
                  { id: "correction", label: "Correct the second coffee" },
                  { id: "ambiguous", label: "An ambiguous coffee" },
                ].map((sample) => (
                  <div key={sample.id}>
                    <strong>{sample.label}</strong>
                    <audio
                      controls
                      preload="none"
                      src={`/samples/${sample.id}.wav`}
                    />
                    {app.configured !== false && (
                      <button
                        className="quiet-button"
                        disabled={!app.state || locked}
                        onClick={() => {
                          setModal(null);
                          void app.useSampleAudio(sample.id);
                        }}
                      >
                        {app.speechMode === "browser"
                          ? "Run transcript"
                          : "Use recording"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {app.configured === true && (
                <button
                  className="secondary-button"
                  disabled={locked}
                  onClick={() => {
                    setModal(null);
                    app.startExample();
                  }}
                >
                  Explore allocation only · no recognition
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
