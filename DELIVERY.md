# Delivery notes — draft

## Current status

The deterministic product flow is implemented and verified locally. Live AI recognition, final cost and latency measurements, public repository access, hosted secret configuration, deployment verification, and the walkthrough video are still pending.

Do not submit this document as complete until every item marked **pending** has an actual measured result.

## Reproducible inputs

- Readable receipt: `public/samples/receipt.png`
- Partly unreadable receipt: `public/samples/receipt-unreadable.png`
- Voice recordings and exact scripts: `public/samples/*.wav` and `public/samples/voices.json`
- Expected outcomes recorded before testing: `evidence/expected-results.json`
- Deterministic actual results: `evidence/core-results.json`
- Browser actual results and screenshots: `evidence/browser-results.json`, `evidence/balanced-desktop.png`, `evidence/balanced-mobile.png`

## Expected and actual results

| Scenario | Expected outcome | Actual result |
| --- | --- | --- |
| Normal split | €23.00 / €15.84 / €8.91; total €47.75 | Deterministic core: pass. Live photo and voice: **pending** |
| Shared fries | €18.82 / €17.93 / €11.00; total €47.75 | Core and browser: pass. Live photo and voice: **pending** |
| Correction | Second coffee moves from Alex to Sam; item count stays six | Core and browser: pass. Live voice: **pending** |
| Ambiguous coffee | Ask “Which coffee did Sam mean?” and remain unsettled | Intent validation: pass. Live voice: **pending** |
| Unreadable pasta price | Ask for the amount or clearer photo; never conclude | Core gate: pass. Live vision: **pending** |

## Checks completed

- 15/15 arithmetic, state and intent tests pass.
- Type checking passes.
- Production build passes.
- Browser test passes for exact totals, shared item, correction, unresolved-state gate, undo, renamed people, and mobile overflow.
- An explicit check confirms repeated command delivery does not count an item twice.
- An explicit check confirms service and shared-item remainders preserve the exact total for 1,000 generated amounts.

## What failed or remains unverified

- No `OPENAI_API_KEY` is configured, so the current run has no genuine vision or transcription results and no meaningful provider latency or cost data.
- The first long-running development preview loaded stale optimized React bundles after dependency installation. A clean restart fixed it; the subsequent browser flow passed without console errors.
- The standard Sites build wrapper could not find npm through the Windows shim in this environment. Running the starter's underlying production build directly succeeded.
- Focused time was not tracked accurately. Calendar timestamps include inactive time and must not be reported as focused work.

## AI output check example

The intent layer deliberately distrusts model output. A proposed command assigning `r1.1` for “Sam had a coffee” is inspected against the receipt, notices two coffee units and no ordinal, removes the proposed assignment, and returns both coffee IDs as explicit choices. A test verifies that state is unchanged until the user answers. Receipt fields work similarly: a spoken unreadable amount is staged and must be confirmed before the receipt changes.

## Measurement table to complete after live runs

| Scenario | Photo recognition | Transcription | Intent mapping | Clarifications or retries | Time to settled | Variable cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Normal | pending | pending | pending | pending | pending | pending |
| Shared | pending | pending | pending | pending | pending | pending |
| Correction | pending | pending | pending | pending | pending | pending |
| Ambiguous | pending | pending | pending | pending | unresolved by design | pending |
| Unreadable | pending | pending if clarified | pending | pending | unresolved or clarified | pending |

Hosting cost must be listed separately using the actual selected hosting plan. Free credits should be converted to the provider's normal unit price.

## Three-minute walkthrough outline

1. **0:00–0:20** — State scope: English, EUR, three people, ten rows, one shared item. Show the test set and pre-recorded ground truth.
2. **0:20–0:55** — Upload the readable receipt and show recognized rows, printed totals, and the original-photo comparison.
3. **0:55–1:25** — Play the shared scenario. Show fries split between all three, proportional service, and exact €47.75 verification.
4. **1:25–1:45** — Say “Actually, the second coffee was Sam's.” Show that one existing item changes owner and totals rebalance.
5. **1:45–2:10** — Run “Sam had a coffee.” Show the two explicit choices and that final totals disappear until clarification.
6. **2:10–2:30** — Upload the obscured receipt. Show the app asking for the pasta amount and refusing to settle.
7. **2:30–2:50** — Open session evidence: actual time, operation usage, costs, recordings, and verification output.
8. **2:50–3:00** — Name the main limitation and next improvement.

## Next product improvements

The first improvement would be better recovery for difficult receipts: crop and rotate assistance plus targeted rereading of a single row. Next would be tests on varied receipt typography and accents, followed by support for more than one shared item and unequal shares. Payments remain outside scope.
