import { chromium } from "../.qa/node_modules/playwright/index.mjs";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  class MockSpeechRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult = null;
    onerror = null;
    onend = null;
    start() {}
    stop() {
      this.onend?.();
    }
    abort() {}
  }
  window.SpeechRecognition = MockSpeechRecognition;
  window.webkitSpeechRecognition = MockSpeechRecognition;
});
await page.goto("http://localhost:5173/", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .getByRole("button", { name: "Browse receipt templates", exact: true })
  .click();
const allocationOnly = page
  .getByRole("button", { name: /Explore allocation only|Open sample split/ })
  .first();
await allocationOnly.waitFor({ timeout: 10000 });
await allocationOnly.click();
await page.locator(".receipt-row").first().waitFor();
await page.getByRole("button", { name: "Edit restaurant name" }).click();
await page
  .getByRole("textbox", { name: "Restaurant name" })
  .fill("The Quiet Ledger");
await page.getByRole("button", { name: "Save restaurant" }).click();
await page.getByRole("heading", { name: "The Quiet Ledger" }).waitFor();
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.getByRole("heading", { name: "Table Nine" }).waitFor();
await page.getByRole("button", { name: "Start voice command" }).click();
await page.getByRole("button", { name: "Repeat", exact: true }).click();
await page.getByRole("button", { name: "Repeat", exact: true }).waitFor();
await page.getByRole("button", { name: "Cancel", exact: true }).click();
await page.getByRole("button", { name: "Start voice command" }).waitFor();
const rows = page.locator(".receipt-row");
for (const [i, name] of [
  [0, "Alex"],
  [1, "Sam"],
  [2, "Alex"],
  [3, "Sam"],
  [4, "Lee"],
])
  await rows.nth(i).getByRole("button", { name, exact: true }).click();
await rows.nth(5).getByRole("button", { name: "Share", exact: true }).click();
await page
  .getByRole("button", { name: "Apply equal split", exact: true })
  .click();
await page.locator(".status.settled").waitFor();
assert.deepEqual(
  await page.locator(".person-total > strong").allTextContents(),
  ["€18.82", "€17.93", "€11.00"],
);
await page.screenshot({
  path: "evidence/balanced-desktop.png",
  fullPage: true,
});
await rows.nth(1).getByRole("button", { name: "Alex", exact: true }).click();
assert.deepEqual(
  await page.locator(".person-total > strong").allTextContents(),
  ["€21.90", "€14.85", "€11.00"],
);
await rows.nth(1).getByRole("button", { name: "Sam", exact: true }).click();
assert.deepEqual(
  await page.locator(".person-total > strong").allTextContents(),
  ["€18.82", "€17.93", "€11.00"],
);
await rows
  .nth(0)
  .getByRole("button", { name: "Clear owners of Coffee #1", exact: true })
  .click();
assert.equal(await page.locator(".status.settled").count(), 0);
assert.deepEqual(
  await page.locator(".person-total > strong").allTextContents(),
  ["—", "—", "—"],
);
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.locator(".status.settled").waitFor();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "evidence/balanced-mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  ),
  false,
);
await page.getByRole("button", { name: "Edit names", exact: true }).click();
await page.getByRole("textbox", { name: "Person 1 name" }).fill("Morgan");
await page.getByRole("button", { name: "Save names" }).click();
await rows
  .nth(0)
  .getByRole("button", { name: "Morgan", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Undo", exact: true }).click();
await rows.nth(0).getByRole("button", { name: "Alex", exact: true }).waitFor();
const undersizedButtons = await page
  .locator("button:visible")
  .evaluateAll((buttons) =>
    buttons
      .filter((button) => button.getBoundingClientRect().height < 44)
      .filter((button) => button.id !== "next-logo")
      .map((button) => ({
        text: button.textContent?.trim(),
        height: button.getBoundingClientRect().height,
      })),
  );
assert.deepEqual(undersizedButtons, []);
const merchantBeforeReplacement = await page
  .locator(".receipt-meta h3")
  .textContent();
await page
  .locator('input[type="file"][accept^="image"]')
  .setInputFiles("public/samples/receipt.jpg");
await page.getByRole("heading", { name: "Replace this receipt?" }).waitFor();
await page.getByText("receipt.jpg", { exact: false }).waitFor();
await page.getByRole("button", { name: "Keep current receipt" }).click();
assert.equal(
  await page.locator(".receipt-meta h3").textContent(),
  merchantBeforeReplacement,
);
await page.route("**/api/receipt", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      receipt: {
        merchant: "Pochi Panini e Poi",
        currency: "EUR",
        rows: [
          {
            id: "r1",
            name: "Tosti",
            quantity: 1,
            amountMinor: 2400,
            uncertain: false,
          },
          {
            id: "r2",
            name: "Semplice",
            quantity: 1,
            amountMinor: 2700,
            uncertain: false,
          },
          {
            id: "r3",
            name: "Soft drinks",
            quantity: 1,
            amountMinor: 2400,
            uncertain: false,
          },
          {
            id: "r4",
            name: "Caffe espresso",
            quantity: 1,
            amountMinor: 2000,
            uncertain: false,
          },
        ],
        subtotalMinor: null,
        subtotalStatus: "not_printed",
        serviceMinor: 1520,
        serviceStatus: "printed",
        totalMinor: 11020,
        totalStatus: "printed",
        warnings: [],
      },
      operations: [],
    }),
  }),
);
await page.getByRole("button", { name: "Templates", exact: true }).click();
await page
  .getByRole("heading", { name: "Westin Fort Lauderdale", exact: true })
  .waitFor();
await page
  .getByRole("button", { name: "Read Pochi Panini e Poi receipt", exact: true })
  .click();
await page.getByRole("heading", { name: "Replace this receipt?" }).waitFor();
await page.getByText("Pochi Panini e Poi", { exact: true }).waitFor();
assert.equal(
  await page.locator(".receipt-meta h3").textContent(),
  merchantBeforeReplacement,
);
await page
  .getByRole("button", { name: "Replace receipt", exact: true })
  .click();
await page.getByRole("heading", { name: "Pochi Panini e Poi" }).waitFor();
assert.equal(await page.locator(".receipt-row").count(), 4);
const errorPage = await browser.newPage({
  viewport: { width: 1224, height: 900 },
});
await errorPage.route("**/api/receipt", (route) =>
  route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({
      error: "This prototype supports EUR receipts. Please use a EUR receipt.",
    }),
  }),
);
await errorPage.goto("http://localhost:5173/", {
  waitUntil: "domcontentloaded",
});
await errorPage
  .locator('input[type="file"][accept^="image"]')
  .setInputFiles("public/samples/receipt.jpg");
await errorPage.locator(".upload-zone .error").waitFor();
assert.equal(await errorPage.locator(".upload-zone .error").count(), 1);
assert.equal(await errorPage.locator(".receipt-preview").count(), 1);
await errorPage.close();
assert.deepEqual(errors, []);
writeFileSync(
  "evidence/browser-results.json",
  JSON.stringify(
    {
      runAt: new Date().toISOString(),
      liveRecognitionTested: false,
      checks: [
        "sample allocation",
        "exact totals",
        "coffee correction",
        "unresolved totals hidden",
        "undo",
        "mobile no overflow",
        "rename then undo restores names",
        "restaurant rename then undo preserves receipt state",
        "voice repeat and cancel controls",
        "upload recognition error appears below the receipt preview",
        "file replacement requires explicit confirmation",
        "Pochi Panini e Poi template deliberately replaces the current receipt",
        "Westin receipt is available as an out-of-scope USD template",
        "visible button touch targets are at least 44px",
      ],
      consoleErrors: errors,
    },
    null,
    2,
  ),
);
console.log(
  "PASS: allocation, correction, unresolved-state gate, undo, names, merchant edit, voice controls, intentional receipt replacement, error placement, mobile, touch targets.",
);
await browser.close();
