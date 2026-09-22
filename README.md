# TableTalk

TableTalk is a mobile-first browser prototype for splitting a restaurant receipt from a photo and spoken allocation commands. AI proposes receipt data and intent; deterministic application code owns allocation state, integer-cent arithmetic, corrections, settlement and exact reconciliation.

## Links

- Repository: https://github.com/denyss4/tabletalk
- Vercel deployment: https://tabletalk-m61svx7sk-denys15.vercel.app
- Walkthrough: `evidence/tabletalk-walkthrough.webm` (17.80 seconds, 1280×720)

The recorded Vercel production deployment currently redirects anonymous visitors to Vercel Login. Disable deployment protection or invite the reviewer before submission, then verify the URL in an incognito window.

## Run locally

Requirements: Node.js 22.13 or later.

```bash
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`.

Set `OPENAI_API_KEY` only on the server. `OPENAI_BASE_URL` may point to the OpenAI API or an HTTPS OpenAI-compatible provider. Set `SPEECH_MODE=provider` when that provider supports `/audio/transcriptions`; use `SPEECH_MODE=browser` for the browser Web Speech API.

Cost exports use these configurable estimates:

```dotenv
AI_INPUT_USD_PER_MILLION=0.175
AI_CACHED_INPUT_USD_PER_MILLION=0.0175
AI_OUTPUT_USD_PER_MILLION=1.05
AI_AUDIO_USD_PER_MINUTE=0.003
AI_PRICING_DATE=2026-09-22
```

The checked-in defaults are an evaluation benchmark: 7% of public GPT-5.4 token rates, matching RSI AI's public “GPT 93% off” claim. They are not an RSI invoice. Replace them with account rates when available.

## Supported flow

1. Upload a JPG, PNG or WebP receipt, or select a receipt template.
2. Review the recognized rows and any unreadable fields.
3. Say who had each item. Browser mode converts microphone speech to a transcript; provider mode uploads the recording for transcription.
4. Resolve repeated-item ambiguity through voice or explicit row choices.
5. Confirm proposed changes to unreadable receipt amounts.
6. Correct ownership with commands such as “Actually, the second coffee was Sam's.”
7. Review final totals only after every row is allocated and the receipt reconciles exactly.
8. Export session evidence containing input state, operations, retries, timing, cost assumptions and verification.

The sample dialog offers **Run transcript** when browser speech is configured. This sends the script paired with the WAV fixture through the live intent model for reproducible testing. It is explicitly labelled and does not claim to test microphone transcription.

## Deterministic rules

- All money is represented as integer euro cents.
- Quantities expand into stable item IDs. Repeated items remain separate, numbered units.
- An assignment replaces the current owners of an item; repeating a correction cannot duplicate a charge.
- At most one item may be shared. Its cents are divided equally.
- Service is allocated in proportion to each person's item subtotal.
- Shared and service rounding use largest remainder. Equal remainders use fixed table order: Alex, Sam, Lee.
- Settlement requires readable receipt values, all item units allocated once, subtotal reconciliation and an exact sum to the receipt total.
- Any unresolved question or proposed receipt edit hides final shares and prevents the **Balanced** state.

## Reproducible test set

| Scenario                | Input                                          | Expected outcome                               |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------- |
| Normal                  | `receipt.jpg` + `normal.wav`                   | €23.00 / €15.84 / €8.91                        |
| Shared                  | `receipt.jpg` + `shared.wav`                   | €18.82 / €17.93 / €11.00                       |
| Correction              | `before-correction.wav`, then `correction.wav` | Coffee #2 changes owner; six units remain      |
| Ambiguous repeated item | `ambiguous.wav`                                | Ask which coffee; remain unsettled             |
| Unreadable              | `receipt-unreadable.jpg`                       | Pasta amount remains `null`; decline to settle |

Inputs and scripts are in `public/samples`. Ground truth was recorded before testing in `evidence/expected-results.json`. The app also processes arbitrary uploaded photos through the same endpoint; `custom-receipt.png` is an independent recognition check. `evidence/scope-boundary-results.json` records a live Bella Mbriana acceptance and a 16-item receipt rejection before split state was created.

## Measured results

`scripts/verify-recognition.mjs` calls the live photo and intent routes and writes `evidence/live-recognition-results.json` plus `evidence/dialogue-results.json`.

| Scenario   |       Useful/settled time |       Settled | Estimated variable cost |
| ---------- | ------------------------: | ------------: | ----------------------: |
| Normal     |                  22.187 s |           Yes |               $0.000903 |
| Shared     |                  26.477 s |           Yes |               $0.000909 |
| Correction |                  30.681 s |           Yes |               $0.001181 |
| Ambiguous  | 13.354 s to clarification | No, by design |               $0.000851 |
| Unreadable | 5.353 s to blocked result | No, by design |               $0.000599 |

Timing is a reproducible component wall-clock benchmark: live photo request + recorded WAV duration + live intent request. It excludes human thinking time. Browser speech has an estimated direct operator cost of $0 because it creates no separately billed app API call. Physical microphone capture still requires a manual HTTPS-browser check.

Hosting is reported separately: Vercel Hobby is assumed at $0/month and $0 variable cost while the personal prototype remains within included usage. Recheck plan eligibility and usage before commercial use.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
node scripts/browser-check.mjs       # requires the app on port 5173
node scripts/verify-recognition.mjs  # live provider calls; charges may apply
node scripts/record-walkthrough.mjs  # requires Playwright FFmpeg
```

Current automated result: **26/26 tests pass**, including exact remainder conservation, ambiguous repeated items, correction idempotence, rename/Undo consistency and browser speech event deduplication. The browser check verifies exact totals, unresolved-state gating, the Bella Mbriana gallery replacement, mobile overflow, name restoration and 44-pixel button targets.

## Architecture

- `app/api/receipt/route.ts`: constrained receipt extraction with uncertain values preserved as `null`.
- `app/api/voice/route.ts`: transcription or supplied browser transcript followed by structured intent extraction.
- `lib/intent.ts`: validates AI intent against stable item/person IDs and protects repeated-item ambiguity.
- `lib/split.ts`: pure allocation, integer apportionment, service allocation and settlement checks.
- `lib/session-state.ts`: roster rename and atomic history restoration.
- `lib/use-tabletalk.ts`: browser session orchestration, recording, correction history, timings and evidence export.

Reused components: Next.js, React, Zod, Radix/shadcn components, Lucide icons and Playwright. Project-specific work includes the receipt/intent schemas, prompts, deterministic split engine, history semantics, ambiguity validation, recognition UX, evidence instrumentation and test fixtures.

## Tools and models

- Recognition and intent provider: RSI AI OpenAI-compatible API.
- Configured model during the recorded run: `gpt-5.6-sol` with low reasoning effort.
- Live speech mode: browser `SpeechRecognition`, English (`en-US`).
- Optional provider transcription default: `gpt-4o-mini-transcribe`.
- Implementation assistance: OpenAI Codex desktop workflow plus the Impeccable frontend skill.
- The exact model used to create the original synthetic receipt artwork was not retained; this is recorded as a provenance limitation rather than guessed.

## Known limitations

- The current Vercel deployment is access protected.
- Physical microphone transcription has not been captured in automated evidence; browser speech cannot consume the WAV fixtures directly.
- Focused historical implementation time was not tracked contemporaneously and cannot be reconstructed accurately.
- RSI AI exposes usage but no per-model price metadata. Costs therefore use the documented configurable benchmark and should be checked against an invoice.
- English, EUR, three people, ten printed rows, ten expanded individual items and one shared item are intentional prototype limits.
