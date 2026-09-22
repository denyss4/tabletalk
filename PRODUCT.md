# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

TableTalk is built for a small restaurant group that needs to divide one printed receipt among up to three people. It is also evaluated by product and engineering reviewers as a demonstration of reliable AI-assisted interaction.

The group provides one receipt photo and spoken allocation instructions, then resolves any uncertainty through voice or explicit choices without typing receipt rows or amounts.

## Product Purpose

TableTalk produces a mathematically accurate, auditable split of a restaurant receipt from a single photo and voice commands. Success means every recognized item is allocated exactly once, corrections update existing allocations, unresolved ambiguity is never presented as complete, and the individual shares sum exactly to the printed total.

The prototype demonstrates deterministic UI state management around nondeterministic recognition and language models. It also measures the latency and variable cost of each AI operation so the quality, speed, and cost of a completed dialogue can be reviewed together.

## Positioning

AI output is treated as a constrained proposal rather than authoritative application state. Receipt recognition and spoken commands pass through validation before they can change stable item allocations. Integer minor-unit arithmetic, settlement checks, correction behavior, proportional service allocation, and remainder rules remain deterministic and auditable.

## Operating Context

- Mobile-first browser use at or after a restaurant meal.
- One printed receipt photo, microphone recording or uploaded audio, and optional explicit clarification choices.
- A short review flow covering recognized rows, ownership of each item, ambiguities, corrections, and final totals.
- Evidence export for expected versus actual results, model usage, retries, latency, cost, and verification status.
- A reproducible evaluation set containing a readable receipt, a partly unreadable receipt, and voice scenarios for a normal split, a shared item, a correction, and an ambiguous repeated item.

## Capabilities and Constraints

- English only.
- One receipt with no more than ten printed rows.
- Exactly one currency; the current prototype uses EUR.
- Up to three people.
- At most one shared item.
- One clearly printed service charge, allocated in proportion to each person's item subtotal.
- Money is represented and calculated in integer minor currency units.
- Shared-item and service-charge remainders use documented deterministic largest-remainder rules with stable person-order tie breaking.
- Repeated items retain distinct stable identities.
- Corrections replace an existing allocation and cannot duplicate an item or charge.
- Unreadable receipt fields and ambiguous voice references require clarification or a clearer source before settlement.
- Clarification works through voice or explicit choices; users are not required to type receipt rows or amounts.
- Final totals appear only when all items are allocated once and the shares reconcile exactly to the receipt total.
- Recognition, transcription, reasoning, retries, and their estimated variable cost and latency are measured per session.
- Payments, user accounts, native app distribution, multiple receipts, more than three people, and multiple currencies are outside the prototype scope.

## Brand Commitments

- Product name: TableTalk.
- Interface direction: clean, minimal, mobile-first utility UI using standard Tailwind patterns; functional clarity and speed take priority over complex visual treatments.
- Product claims must remain factual and supported by recorded test evidence.
- The interface should communicate uncertainty plainly and never imply that an unresolved split is complete.

## Evidence on Hand

- Shareable receipt fixtures: `public/samples/receipt.jpg` and `public/samples/receipt-unreadable.jpg`.
- Synthetic English voice recordings and scripts: `public/samples/*.wav` and `public/samples/voices.json`.
- Ground-truth outcomes recorded before testing: `evidence/expected-results.json`.
- Deterministic test results: `evidence/core-results.json`.
- Browser-flow results and responsive screenshots: `evidence/browser-results.json`, `evidence/balanced-desktop.png`, and `evidence/balanced-mobile.png`.
- Twenty-five arithmetic, state, intent, and browser-speech tests pass, along with type checking, linting, the production build, and the browser flow described in `README.md` and `DELIVERY.md`.
- Live image and supplied-transcript results, provider latency, benchmark cost estimates, dialogue component timings, and a 17-second walkthrough are recorded in `evidence/`. Physical microphone recognition on the final HTTPS deployment remains a required manual check and must not be implied as completed.
- No customer testimonials, commercial adoption evidence, or payment capability is available.

## Product Principles

1. Keep final authority in deterministic application state and exact integer arithmetic.
2. Make every allocation, correction, remainder, and settlement decision inspectable.
3. Ask a focused clarification whenever the source does not justify one safe interpretation.
4. Complete the main flow without requiring keyboard transcription of the receipt or spoken intent.
5. Measure real quality, latency, and variable operating cost instead of promising untested performance.

## Accessibility & Inclusion

The primary flow supports both microphone input and explicit on-screen choices so microphone denial, speech-recognition failure, or an ambiguous spoken reference does not create a dead end. The interface is mobile-first and must remain usable at a 390 px viewport without horizontal overflow.
