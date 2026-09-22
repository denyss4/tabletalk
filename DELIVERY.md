# TableTalk delivery notes

## Submission status

The deterministic product flow, live photo recognition, live transcript interpretation, reproducible fixtures, measured component timings, estimated variable costs, browser regression and walkthrough video are complete.

Two external checks remain before sending the assignment:

1. Disable Vercel deployment protection or invite the reviewer. The current production URL returns Vercel Login to anonymous visitors.
2. Run one microphone command in the final HTTPS deployment and export that session's evidence.

Focused historical implementation time was not recorded contemporaneously. Do not invent a number; state this as a measurement failure if a reliable time log cannot be recovered.

## Deliverables

- Repository: https://github.com/denyss4/tabletalk
- Deployment: https://tabletalk-m61svx7sk-denys15.vercel.app (currently access protected)
- Walkthrough: `evidence/tabletalk-walkthrough.webm` — 17.80 seconds, 1280×720
- Setup and architecture: `README.md`
- Expected outcomes: `evidence/expected-results.json`
- Live results and raw usage: `evidence/live-recognition-results.json`
- Dialogue timing/cost summary: `evidence/dialogue-results.json`
- Browser results: `evidence/browser-results.json`
- Live ten-item boundary result: `evidence/scope-boundary-results.json`

## Expected and actual results

| Scenario                   | Expected                                       | Actual                                       |
| -------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Normal                     | €23.00 / €15.84 / €8.91                        | Pass; exact totals and settlement            |
| Shared fries               | €18.82 / €17.93 / €11.00                       | Pass; shared row and proportional service    |
| Correction                 | Coffee #2 changes to Sam; six units remain     | Pass; stable ID replaced and count stays six |
| Ambiguous coffee           | Ask which coffee and remain unsettled          | Pass; no assignment applied                  |
| Unreadable pasta           | Preserve unknown amount and decline settlement | Pass; amount is `null`, row uncertain        |
| Independent custom receipt | Three recorded rows, €21.45 total              | Pass; matched preregistered expected values  |
| Bella Mbriana replacement  | Supported receipt stays within ten-item scope  | Pass; 4 rows and 5 expanded items            |
| Former 16-item template    | Reject before creating an allocation state     | Pass; HTTP 422 `RECEIPT_SCOPE_EXCEEDED`      |

## Measurements

| Scenario                   |   Photo | Recorded speech duration |  Intent |            Useful/settled | Variable cost |
| -------------------------- | ------: | -----------------------: | ------: | ------------------------: | ------------: |
| Normal                     | 8.352 s |                  8.580 s | 5.255 s |                  22.187 s |     $0.000903 |
| Shared                     | 8.352 s |                 11.155 s | 6.970 s |                  26.477 s |     $0.000909 |
| Correction, two utterances | 8.352 s |                 13.170 s | 9.159 s |                  30.681 s |     $0.001181 |
| Ambiguous                  | 8.352 s |                  2.065 s | 2.937 s |      13.354 s to question |     $0.000851 |
| Unreadable                 | 5.353 s |                        — |       — | 5.353 s to blocked result |     $0.000599 |

These are measured component wall-clock totals from the live integration run on 22 September 2026. They include the real recorded WAV duration and live API latency, and exclude human thinking time. Ambiguous and unreadable cases correctly have no settled time.

## Cost assumptions

- RSI AI returned token usage but no pricing metadata.
- RSI AI publicly advertises GPT at 93% off. The prototype therefore uses 7% of public GPT-5.4 rates as a reproducible benchmark: $0.175/M input, $0.0175/M cached input and $1.05/M output.
- Rates are configuration values, not hard-coded claims, and should be replaced with invoice rates when available.
- Browser speech creates no separately billed application API call, so direct operator variable cost is estimated as $0. Failed attempts and retries remain in the exported operations list.
- No speech synthesis is used.
- Hosting is separate: Vercel Hobby is assumed at $0/month within included usage for this personal prototype. Recheck before commercial use.

Sources checked 22 September 2026:

- https://www.rsiai.net/
- https://developers.openai.com/api/docs/models/gpt-5.4
- https://vercel.com/docs/plans/hobby

## Tools, models and reuse

- RSI AI OpenAI-compatible Responses API; `gpt-5.6-sol`, low reasoning effort.
- Browser `SpeechRecognition`, `en-US`; optional `gpt-4o-mini-transcribe` when a compatible provider supports audio.
- Next.js 16, React 19, Zod, Radix/shadcn, Lucide and Playwright.
- OpenAI Codex desktop workflow and the Impeccable frontend skill were used during implementation.
- Reused libraries supply framework, validation primitives, UI primitives, icons and browser automation.
- Original work includes receipt and intent schemas, prompts, deterministic cent arithmetic, correction/Undo state, ambiguity guards, evidence export, fixtures and scenario validation.

## Output check example

For “Sam had a coffee,” the model may propose one coffee ID. The validator compares the transcript with the two stable coffee units. Because no coffee-specific ordinal or collective phrase is present, it removes the assignment and returns both IDs as explicit choices. An unrelated phrase such as “first burger” cannot satisfy this coffee check. State stays unchanged until the user chooses or answers the question.

## Failures and limitations

- Physical microphone speech has not been recorded in the final hosted environment. Supplied transcripts test the live intent model; WAV fixtures are retained for manual microphone/provider checks.
- The Vercel production deployment succeeds but is access protected.
- RSI AI pricing is estimated because the provider exposes no model price metadata.
- The exact generator model for the original synthetic receipt artwork was not retained.
- Focused time was not tracked contemporaneously.

## Final manual checks

1. Make the Vercel deployment reviewer-accessible.
2. Open it in an incognito Chrome window on HTTPS.
3. Upload a new receipt and verify recognition.
4. Allow microphone access and run one normal or correction command.
5. Export evidence and add the microphone result to this document.
6. Play `evidence/tabletalk-walkthrough.webm` and confirm it remains under three minutes.
