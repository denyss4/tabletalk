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
      .map((button) => ({
        text: button.textContent?.trim(),
        height: button.getBoundingClientRect().height,
      })),
  );
assert.deepEqual(undersizedButtons, []);
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
        "visible button touch targets are at least 44px",
      ],
      consoleErrors: errors,
    },
    null,
    2,
  ),
);
console.log(
  "PASS: allocation, correction, unresolved-state gate, undo, mobile, names, touch targets.",
);
await browser.close();
